import mongoose, { Schema } from "mongoose";

const questionSchema = new Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    type: { type: String, required: true },
    marks: { type: Number, required: true },
    difficulty: { type: String, required: true },
    topic: { type: String, required: true },
    bloomLevel: { type: String, required: true }
  },
  { _id: false }
);

const sectionSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    instruction: { type: String, required: true },
    questions: [questionSchema]
  },
  { _id: false }
);

const questionPlanSchema = new Schema(
  {
    label: String,
    type: { type: String },
    count: Number,
    marks: Number
  },
  { _id: false }
);

const assignmentSchema = new Schema(
  {
    title: { type: String, required: true },
    subject: { type: String, required: true },
    classLevel: { type: String, required: true },
    dueDate: { type: String, required: true },
    sourceType: { type: String, enum: ["text", "pdf", "manual"], required: true },
    sourceText: { type: String, required: true },
    fileUrl: { type: String, default: "" },  // NEW: uploaded file URL
    fileName: { type: String, default: "" }, // NEW: original file name
    questionTypes: [{ type: String, required: true }],
    questionPlan: [questionPlanSchema],
    totalMarks: { type: Number, required: true },
    difficultyMix: {
      easy: Number,
      medium: Number,
      hard: Number
    },
    instructions: String,
    status: {
      type: String,
      enum: ["draft", "queued", "generating", "ready", "failed"],
      default: "draft"
    }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

const questionPaperSchema = new Schema(
  {
    assignmentId: { type: Schema.Types.ObjectId, ref: "Assignment", required: true },
    sections: [sectionSchema],
    totalMarks: { type: Number, required: true },
    validationSummary: {
      marksBalanced: Boolean,
      difficultyBalanced: Boolean,
      issues: [String]
    }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export const AssignmentModel =
  mongoose.models.Assignment || mongoose.model("Assignment", assignmentSchema);

export const QuestionPaperModel =
  mongoose.models.QuestionPaper || mongoose.model("QuestionPaper", questionPaperSchema);
