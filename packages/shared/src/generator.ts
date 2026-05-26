import { nanoid } from "nanoid";
import { AssignmentInput, Difficulty, QuestionPaper, QuestionType, questionPaperSchema } from "./index.js";

const bloom = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"] as const;

function pick<T>(items: readonly T[], index: number) {
  return items[index % items.length];
}

function marksForType(type: QuestionType) {
  if (type === "mcq" || type === "fill-blank") return 1;
  if (type === "short-answer") return 2;
  if (type === "case-study") return 5;
  return 6;
}

function difficultyPlan(input: AssignmentInput): Difficulty[] {
  const count = Math.max(8, Math.ceil(input.totalMarks / 3));
  return Array.from({ length: count }, (_, i) => {
    const pct = ((i + 1) / count) * 100;
    if (pct <= input.difficultyMix.easy) return "easy";
    if (pct <= input.difficultyMix.easy + input.difficultyMix.medium) return "medium";
    return "hard";
  });
}

export function buildPromptPreview(input: AssignmentInput) {
  return [
    `Create a structured ${input.subject} question paper for ${input.classLevel}.`,
    `Total marks: ${input.totalMarks}. Question types: ${input.questionTypes.join(", ")}.`,
    `Difficulty mix: easy ${input.difficultyMix.easy}%, medium ${input.difficultyMix.medium}%, hard ${input.difficultyMix.hard}%.`,
    `Syllabus/source: ${input.sourceText.slice(0, 700)}`,
    "Return strict JSON matching { sections: [{ title, instruction, questions: [{ text, type, marks, difficulty, topic, bloomLevel }] }] }."
  ].join("\n");
}

export function generateMockPaper(input: AssignmentInput, assignmentId?: string): QuestionPaper {
  const topics = input.sourceText
    .split(/[,\n.;]/)
    .map((topic) => topic.trim())
    .filter(Boolean)
    .slice(0, 10);
  const sourceTopics = topics.length ? topics : [input.subject, "Core Concepts", "Application"];
  const difficulties = difficultyPlan(input);
  const sections = ["Section A", "Section B", "Section C"].map((title, sectionIndex) => ({
    id: nanoid(),
    title,
    instruction:
      sectionIndex === 0
        ? "Attempt all questions. Each answer should be concise."
        : sectionIndex === 1
          ? "Answer with working, reasons, or labeled diagrams where needed."
          : "Attempt any two. Show structured reasoning.",
    questions: [] as QuestionPaper["sections"][number]["questions"]
  }));

  let remaining = input.totalMarks;
  let questionIndex = 0;
  while (remaining > 0 && questionIndex < 36) {
    const type = pick(input.questionTypes, questionIndex);
    const marks = Math.min(marksForType(type), remaining);
    const topic = pick(sourceTopics, questionIndex);
    const difficulty = pick(difficulties, questionIndex);
    const section = marks <= 1 ? sections[0] : marks <= 3 ? sections[1] : sections[2];
    section.questions.push({
      id: nanoid(),
      text: `Q${questionIndex + 1}. ${difficulty === "hard" ? "Evaluate" : difficulty === "medium" ? "Explain" : "Identify"} ${topic} in the context of ${input.subject} and support your answer with a relevant classroom example.`,
      type,
      marks,
      difficulty,
      topic,
      bloomLevel: pick(bloom, questionIndex + (difficulty === "hard" ? 2 : 0))
    });
    remaining -= marks;
    questionIndex += 1;
  }

  const paper: QuestionPaper = {
    assignmentId,
    sections: sections.filter((section) => section.questions.length > 0),
    totalMarks: input.totalMarks,
    validationSummary: {
      marksBalanced: true,
      difficultyBalanced: true,
      issues: []
    },
    createdAt: new Date().toISOString()
  };

  const parsed = questionPaperSchema.safeParse(paper);
  if (parsed.success) return parsed.data;
  return {
    assignmentId,
    totalMarks: 10,
    validationSummary: {
      marksBalanced: true,
      difficultyBalanced: false,
      issues: ["Fallback sample used after schema validation failed."]
    },
    sections: [
      {
        id: nanoid(),
        title: "Section A",
        instruction: "Attempt all questions.",
        questions: [
          {
            id: nanoid(),
            text: "Define one important concept from the supplied syllabus and give an example.",
            type: "short-answer",
            marks: 2,
            difficulty: "easy",
            topic: input.subject,
            bloomLevel: "Understand"
          }
        ]
      }
    ],
    createdAt: new Date().toISOString()
  };
}
