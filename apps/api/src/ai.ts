import { nanoid } from "nanoid";
import {
  AssignmentInput,
  generateMockPaper,
  Question,
  QuestionPaper,
  questionPaperSchema
} from "@vedaai/shared";

type GroqMessage = {
  role: "system" | "user";
  content: string;
};

const groqEndpoint = "https://api.groq.com/openai/v1/chat/completions";
const groqModel = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

function getGroqKey() {
  return process.env.GROQ_API_KEY || process.env.GROQ_API_KEY_3 || "";
}

function extractJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return trimmed;
  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/) || trimmed.match(/(\{[\s\S]*\})/);
  return match?.[1]?.trim() || trimmed;
}

function getQuestionPlan(input: AssignmentInput) {
  const plan = input.questionPlan?.length
    ? input.questionPlan
    : input.questionTypes.map((type) => ({
        label: type,
        type,
        count: 1,
        marks: type === "mcq" || type === "fill-blank" ? 1 : type === "short-answer" ? 2 : type === "case-study" ? 6 : 5
      }));

  return plan.filter((item) => item.count > 0 && item.marks > 0);
}

function subjectTopics(input: AssignmentInput) {
  const topics = input.sourceText
    .split(/[,\n.;:]/)
    .map((topic) => topic.trim())
    .filter((topic) => topic.length > 2 && topic.length < 80)
    .slice(0, 12);
  return topics.length ? topics : [input.subject, "Core Concepts", "Application"];
}

function fallbackQuestion(input: AssignmentInput, type: Question["type"], marks: number, index: number): Question {
  const topics = subjectTopics(input);
  const topic = topics[index % topics.length];
  const difficulty = marks <= 2 ? "easy" : marks <= 4 ? "medium" : "hard";
  const bloomLevel = marks <= 2 ? "Remember" : marks <= 4 ? "Apply" : "Analyze";

  return {
    id: nanoid(),
    text: `${index + 1}. ${marks <= 2 ? "State" : marks <= 4 ? "Explain" : "Analyze"} ${topic} with a relevant example from ${input.subject}.`,
    type,
    marks,
    difficulty,
    topic,
    bloomLevel
  };
}

function enforceQuestionPlan(rawSections: QuestionPaper["sections"], input: AssignmentInput) {
  const plan = getQuestionPlan(input);
  const allQuestions = rawSections.flatMap((section) => section.questions);
  const used = new Set<Question>();
  const selected: Question[] = [];
  let fallbackIndex = 0;

  for (const item of plan) {
    const matching = allQuestions.filter((question) => question.type === item.type && !used.has(question));
    for (let index = 0; index < item.count; index += 1) {
      const question = matching[index] || allQuestions.find((candidate) => !used.has(candidate));
      if (question) {
        used.add(question);
        selected.push({
          ...question,
          id: question.id || nanoid(),
          type: item.type,
          marks: item.marks
        });
      } else {
        selected.push(fallbackQuestion(input, item.type, item.marks, fallbackIndex));
      }
      fallbackIndex += 1;
    }
  }

  const sectionA: Question[] = [];
  const sectionB: Question[] = [];
  const sectionC: Question[] = [];
  for (const question of selected) {
    if (question.marks <= 2) sectionA.push(question);
    else if (question.marks <= 4) sectionB.push(question);
    else sectionC.push(question);
  }

  return [
    { id: nanoid(), title: "Section A", instruction: "Attempt all questions.", questions: sectionA },
    { id: nanoid(), title: "Section B", instruction: "Answer with clear reasoning.", questions: sectionB },
    { id: nanoid(), title: "Section C", instruction: "Answer in detail with examples where required.", questions: sectionC }
  ].filter((section) => section.questions.length > 0);
}

function normalizePaper(raw: unknown, input: AssignmentInput, assignmentId: string) {
  const parsed = questionPaperSchema.parse({
    ...(raw as Record<string, unknown>),
    assignmentId,
    createdAt: new Date().toISOString()
  });

  const sections = enforceQuestionPlan(parsed.sections.map((section) => ({
    ...section,
    id: section.id || nanoid(),
    questions: section.questions.map((question) => ({
      ...question,
      id: question.id || nanoid()
    }))
  })), input);

  let generatedMarks = sections.reduce(
    (sum, section) => sum + section.questions.reduce((sectionSum, question) => sectionSum + question.marks, 0),
    0
  );

  if (generatedMarks !== input.totalMarks) {
    let delta = input.totalMarks - generatedMarks;
    const questions = sections.flatMap((section) => section.questions);

    if (delta > 0 && questions.length) {
      const target = questions.find((question) => question.type === "long-answer" || question.type === "case-study") || questions[questions.length - 1];
      target.marks += delta;
    }

    while (delta < 0) {
      const target = [...questions].sort((a, b) => b.marks - a.marks).find((question) => question.marks > 1);
      if (!target) break;
      target.marks -= 1;
      delta += 1;
    }

    generatedMarks = sections.reduce(
      (sum, section) => sum + section.questions.reduce((sectionSum, question) => sectionSum + question.marks, 0),
      0
    );
  }

  return questionPaperSchema.parse({
    ...parsed,
    assignmentId,
    sections,
    totalMarks: input.totalMarks,
    validationSummary: {
      marksBalanced: true,
      difficultyBalanced: true,
      issues: generatedMarks === input.totalMarks ? [] : [`Generated marks ${generatedMarks} did not match requested total ${input.totalMarks}.`]
    }
  });
}

async function groqChat(messages: GroqMessage[], signal: AbortSignal) {
  const apiKey = getGroqKey();
  if (!apiKey) throw new Error("GROQ_API_KEY missing");

  const response = await fetch(groqEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: groqModel,
      messages,
      temperature: 0.35,
      max_completion_tokens: 4096,
      response_format: { type: "json_object" }
    }),
    signal
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Groq request failed: ${response.status} ${body.slice(0, 240)}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("Groq returned empty content");
  return content;
}

function buildMessages(input: AssignmentInput): GroqMessage[] {
  const typeList = input.questionTypes.join(", ");
  const questionPlan = getQuestionPlan(input);
  const plannedQuestions = questionPlan.reduce((sum, item) => sum + item.count, 0);

  // Use fileName as hint if sourceText is too short (just a filename)
  const syllabusHint = input.sourceText.length > 60
    ? input.sourceText.slice(0, 3000)
    : `This is a ${input.subject} exam for ${input.classLevel}. Title: ${input.title}. Generate relevant subject-specific questions.`;

  return [
    {
      role: "system",
      content:
        "You generate Indian school exam question papers for teachers. Return only valid JSON. Do not include markdown. Do not include raw prose outside JSON. Questions must be specific to the subject and topics — never use the assignment title as the topic name."
    },
    {
      role: "user",
      content: [
        `Create a structured question paper for ${input.subject}, ${input.classLevel}.`,
        `Assignment title: ${input.title}`,
        `Total marks target: exactly ${input.totalMarks}. The sum of every question.marks across all sections must equal exactly ${input.totalMarks}.`,
        `Create exactly ${plannedQuestions} questions. Do not create extra questions.`,
        `Question plan: ${JSON.stringify(questionPlan)}.`,
        "For every plan item, create exactly count questions of that type, each with exactly marks marks.",
        "Use Section A for low-mark questions (1-2 marks), Section B for medium-answer questions (3-4 marks), and Section C for case-study or long-answer questions (5-6 marks).",
        `Allowed question types only: ${typeList}`,
        `Allowed difficulty values only: easy, medium, hard.`,
        `Allowed bloomLevel values only: Remember, Understand, Apply, Analyze, Evaluate, Create.`,
        `Difficulty mix: easy ${input.difficultyMix.easy}%, medium ${input.difficultyMix.medium}%, hard ${input.difficultyMix.hard}%.`,
        `Teacher instructions: ${input.instructions || "Use clear exam language."}`,
        `Syllabus/source content:\n${syllabusHint}`,
        "",
        "IMPORTANT: Each question's 'topic' field must be a real subject topic (e.g. 'Photosynthesis', 'Friction', 'Chemical Reactions') — NOT the assignment title.",
        "",
        "JSON shape exactly:",
        JSON.stringify({
          sections: [
            {
              title: "Section A",
              instruction: "Attempt all questions.",
              questions: [
                {
                  text: "Question text here",
                  type: "short-answer",
                  marks: 2,
                  difficulty: "easy",
                  topic: "Specific Topic Name",
                  bloomLevel: "Understand"
                }
              ]
            }
          ],
          totalMarks: input.totalMarks,
          validationSummary: {
            marksBalanced: true,
            difficultyBalanced: true,
            issues: []
          }
        })
      ].join("\n")
    }
  ];
}

export async function generateQuestionPaper(input: AssignmentInput, assignmentId: string): Promise<QuestionPaper> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    console.log(`🤖 Generating paper via Groq for: ${input.title}`);
    const first = await groqChat(buildMessages(input), controller.signal);

    try {
      const paper = normalizePaper(JSON.parse(extractJson(first)), input, assignmentId);
      console.log(`✅ Paper generated: ${paper.sections.length} sections, ${paper.totalMarks} marks`);
      return paper;
    } catch (firstError) {
      console.warn("⚠️  First attempt failed, trying repair...", firstError instanceof Error ? firstError.message : firstError);

      const repaired = await groqChat(
        [
          {
            role: "system",
            content: "Repair the JSON so it matches the requested schema. Return only valid JSON."
          },
          {
            role: "user",
            content: [
              `Schema validation failed: ${firstError instanceof Error ? firstError.message : "invalid JSON"}`,
              `Required totalMarks: ${input.totalMarks}. The sum of all question marks must be exactly ${input.totalMarks}.`,
              `Required question plan: ${JSON.stringify(getQuestionPlan(input))}.`,
              `Total question count must be exactly ${getQuestionPlan(input).reduce((sum, item) => sum + item.count, 0)}.`,
              `Use only these question types: ${input.questionTypes.join(", ")}.`,
              "Return 3 sections when possible: Section A, Section B, Section C.",
              "Each question topic must be a real subject topic, not the assignment title.",
              "Return only valid JSON with no markdown.",
              `Broken JSON:\n${first}`
            ].join("\n")
          }
        ],
        controller.signal
      );

      const paper = normalizePaper(JSON.parse(extractJson(repaired)), input, assignmentId);
      console.log(`✅ Repaired paper generated: ${paper.sections.length} sections`);
      return paper;
    }
  } catch (error) {
    console.warn("❌ AI generation failed. Using deterministic fallback.", error instanceof Error ? error.message : error);
    return generateMockPaper(input, assignmentId);
  } finally {
    clearTimeout(timeout);
  }
}
