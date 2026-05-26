import { z } from "zod";

export const difficultySchema = z.enum(["easy", "medium", "hard"]);
export const questionTypeSchema = z.enum([
  "mcq",
  "short-answer",
  "long-answer",
  "case-study",
  "fill-blank"
]);

export const questionSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(8),
  type: questionTypeSchema,
  marks: z.number().int().positive(),
  difficulty: difficultySchema,
  topic: z.string().min(1),
  bloomLevel: z.enum(["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"])
});

export const sectionSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  instruction: z.string().min(1),
  questions: z.array(questionSchema).min(1)
});

export const questionPaperSchema = z.object({
  assignmentId: z.string().optional(),
  sections: z.array(sectionSchema).min(1),
  totalMarks: z.number().int().positive(),
  validationSummary: z.object({
    marksBalanced: z.boolean(),
    difficultyBalanced: z.boolean(),
    issues: z.array(z.string())
  }),
  createdAt: z.string().optional()
});

export const assignmentInputSchema = z.object({
  title: z.string().min(3),
  subject: z.string().min(2),
  classLevel: z.string().min(1),
  dueDate: z.string().min(1),
  sourceType: z.enum(["text", "pdf", "manual"]),
  sourceText: z.string().min(1),  // Relaxed from min(10) to allow file names
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  questionTypes: z.array(questionTypeSchema).min(1),
  totalMarks: z.number().int().min(10).max(200),
  difficultyMix: z.object({
    easy: z.number().min(0).max(100),
    medium: z.number().min(0).max(100),
    hard: z.number().min(0).max(100)
  }),
  instructions: z.string().optional().default("")
});

export type Difficulty = z.infer<typeof difficultySchema>;
export type QuestionType = z.infer<typeof questionTypeSchema>;
export type Question = z.infer<typeof questionSchema>;
export type Section = z.infer<typeof sectionSchema>;
export type QuestionPaper = z.infer<typeof questionPaperSchema>;
export type AssignmentInput = z.infer<typeof assignmentInputSchema>;

export const generationSteps = [
  "queued",
  "parsing",
  "prompt",
  "generating",
  "validating",
  "saving",
  "ready"
] as const;

export type GenerationStep = (typeof generationSteps)[number];

export { buildPromptPreview, generateMockPaper } from "./generator.js";