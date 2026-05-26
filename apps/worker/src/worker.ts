import "dotenv/config";
import { Worker } from "bullmq";
import { io } from "socket.io-client";
import mongoose, { Schema } from "mongoose";
import { AssignmentInput, generateMockPaper } from "@vedaai/shared";

const redisUrl = new URL(process.env.REDIS_URL || "redis://localhost:6379");
const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  username: redisUrl.username || undefined,
  password: redisUrl.password || undefined
};

const apiUrl = process.env.API_URL || "http://localhost:4000";
const socket = io(apiUrl, { transports: ["websocket"] });

const questionSchema = new Schema(
  {
    id: String,
    text: String,
    type: String,
    marks: Number,
    difficulty: String,
    topic: String,
    bloomLevel: String
  },
  { _id: false }
);

const sectionSchema = new Schema(
  {
    id: String,
    title: String,
    instruction: String,
    questions: [questionSchema]
  },
  { _id: false }
);

const Assignment =
  mongoose.models.Assignment ||
  mongoose.model(
    "Assignment",
    new Schema({}, { strict: false, timestamps: { createdAt: true, updatedAt: true } })
  );

const QuestionPaper =
  mongoose.models.QuestionPaper ||
  mongoose.model(
    "QuestionPaper",
    new Schema(
      {
        assignmentId: { type: Schema.Types.ObjectId, ref: "Assignment" },
        sections: [sectionSchema],
        totalMarks: Number,
        validationSummary: {
          marksBalanced: Boolean,
          difficultyBalanced: Boolean,
          issues: [String]
        }
      },
      { strict: false, timestamps: { createdAt: true, updatedAt: true } }
    )
  );

function emit(assignmentId: string, event: string, step: string, message: string, progress: number) {
  socket.emit("assignment:join", assignmentId);
  socket.emit("worker:generation-event", {
    assignmentId,
    event,
    data: { assignmentId, step, message, progress }
  });
}

await mongoose.connect(process.env.MONGO_URL || "mongodb://localhost:27017/vedaai_assessment_studio");

new Worker(
  "assessment-generation",
  async (job) => {
    const { assignmentId, sectionId } = job.data as { assignmentId: string; sectionId?: string };
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) throw new Error("Assignment not found");

    await Assignment.findByIdAndUpdate(assignmentId, { status: "generating" });
    emit(assignmentId, "generation:started", "parsing", "Parsing syllabus and teacher constraints", 15);
    await job.updateProgress(15);
    emit(assignmentId, "generation:progress", "prompt", "Building prompt with strict schema", 35);
    await job.updateProgress(35);
    emit(assignmentId, "generation:progress", "generating", "Generating questions", 60);
    await job.updateProgress(60);
    emit(assignmentId, "generation:validating", "validating", "Validating structure with Zod", 78);

    const input = assignment.toObject() as AssignmentInput;
    const paper = generateMockPaper(input, assignmentId);
    const existing = await QuestionPaper.findOne({ assignmentId });
    if (sectionId && existing) {
      const target = existing.sections.find((section: any) => section.id === sectionId);
      const replacement = paper.sections.find((section: any) => section.title === target?.title) || paper.sections[0];
      existing.sections = existing.sections.map((section: any) =>
        section.id === sectionId ? { ...replacement, id: sectionId } : section
      );
      await existing.save();
    } else {
      await QuestionPaper.findOneAndUpdate({ assignmentId }, { ...paper, assignmentId }, { upsert: true });
    }

    await Assignment.findByIdAndUpdate(assignmentId, { status: "ready" });
    emit(assignmentId, "generation:completed", "ready", "Paper saved and ready", 100);
  },
  { connection }
);

console.log("Assessment generation worker is listening for BullMQ jobs");
