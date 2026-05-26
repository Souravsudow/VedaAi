import "dotenv/config";
import { generateMockPaper } from "@vedaai/shared";
import { connectDb } from "./db.js";
import { AssignmentModel, QuestionPaperModel } from "./models.js";

await connectDb();
await AssignmentModel.deleteMany({});
await QuestionPaperModel.deleteMany({});

const assignment = await AssignmentModel.create({
  title: "Photosynthesis and Plant Nutrition",
  subject: "Science",
  classLevel: "Class 7",
  dueDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
  sourceType: "text",
  sourceText:
    "Photosynthesis, chlorophyll, stomata, sunlight, carbon dioxide, nutrition in plants, food chains, experiments with leaves",
  questionTypes: ["mcq", "short-answer", "long-answer", "case-study"],
  totalMarks: 50,
  difficultyMix: { easy: 30, medium: 50, hard: 20 },
  instructions: "Use clear language and include one application-based question.",
  status: "ready"
});

await QuestionPaperModel.create(generateMockPaper(assignment.toObject(), assignment.id));
console.log(`Seeded demo assignment ${assignment.id}`);
