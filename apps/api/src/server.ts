import "./env.js";
import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { nanoid } from "nanoid";
import { Server } from "socket.io";
import { assignmentInputSchema, questionPaperSchema } from "@vedaai/shared";
import { connectDb } from "./db.js";
import { AssignmentModel, QuestionPaperModel } from "./models.js";
import { getGenerationQueue } from "./queue.js";
import { renderPaperPdf } from "./pdf.js";
import { generateQuestionPaper } from "./ai.js";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.WEB_URL || "http://localhost:3000",
    credentials: true
  }
});

app.use(cors({ origin: process.env.WEB_URL || "http://localhost:3000", credentials: true }));

type MemoryAssignment = any;
type MemoryPaper = any;

let dbReady = false;
const memoryAssignments = new Map<string, MemoryAssignment>();
const memoryPapers = new Map<string, MemoryPaper>();
const uploadedFiles = new Map<string, { fileName: string; buffer: Buffer; mimeType: string }>();

function now() {
  return new Date().toISOString();
}

function cleanAssignment(assignment: any) {
  const value = assignment?.toObject ? assignment.toObject() : assignment;
  return { ...value, _id: String(value._id || value.id) };
}

function emitGeneration(assignmentId: string, event: string, step: string, message: string, progress: number) {
  io.to(assignmentId).emit(event, { assignmentId, step, message, progress });
}

function parseMultipartFile(req: express.Request) {
  const contentType = req.headers["content-type"] || "";
  const boundary = contentType.match(/boundary=(.+)$/)?.[1];
  const body = req.body as Buffer;
  if (!boundary || !Buffer.isBuffer(body)) throw new Error("Invalid upload payload");

  const text = body.toString("binary");
  const parts = text.split(`--${boundary}`);
  const filePart = parts.find((part) => part.includes('name="file"'));
  if (!filePart) throw new Error("File field is required");

  const headerEnd = filePart.indexOf("\r\n\r\n");
  const header = filePart.slice(0, headerEnd);
  const start = Buffer.byteLength(text.slice(0, text.indexOf(filePart) + headerEnd + 4), "binary");
  const rawEnd = text.indexOf(`\r\n--${boundary}`, start);
  const end = rawEnd > -1 ? rawEnd : body.length;

  const filename = header.match(/filename="([^"]+)"/)?.[1] || `upload-${nanoid()}`;
  const mimeType = header.match(/Content-Type:\s*([^\r\n]+)/i)?.[1] || "application/octet-stream";
  return { fileName: filename, mimeType, buffer: body.subarray(start, end) };
}

function extractTextFromPdfBuffer(buffer: Buffer): string {
  try {
    // Extract readable ASCII text from PDF binary
    const raw = buffer.toString("latin1");
    // Find text between BT and ET (PDF text blocks)
    const textBlocks: string[] = [];
    const btEtRegex = /BT([\s\S]*?)ET/g;
    let match;
    while ((match = btEtRegex.exec(raw)) !== null) {
      const block = match[1];
      // Extract strings inside parentheses: (text)
      const strRegex = /\(([^)]+)\)/g;
      let strMatch;
      while ((strMatch = strRegex.exec(block)) !== null) {
        const str = strMatch[1].replace(/\\n/g, " ").replace(/\\r/g, " ").trim();
        if (str.length > 1) textBlocks.push(str);
      }
    }

    // Also try extracting plain readable text
    const plainText = raw
      .replace(/[^\x20-\x7E\n\r]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const combined = textBlocks.length > 10
      ? textBlocks.join(" ") + " " + plainText
      : plainText;

    return combined.slice(0, 4000);
  } catch {
    return "";
  }
}

function parseUploadedContent(fileName: string, fileContent?: string) {
  const base = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ").trim();
  const words = base.split(/\s+/).filter(Boolean);
  const title = words.length
    ? words.map((word) => word[0]?.toUpperCase() + word.slice(1)).join(" ")
    : "New Assignment";
  const lower = base.toLowerCase();
  const subject =
    lower.match(/math|algebra|geometry|number/) ? "Mathematics" :
    lower.match(/science|physics|chemistry|biology/) ? "Science" :
    lower.match(/history|civics|geography|social/) ? "Social Science" :
    lower.match(/english|grammar|literature/) ? "English" :
    lower.match(/hindi/) ? "Hindi" :
    lower.match(/computer|coding|programming/) ? "Computer Science" : "";

  const classMatch = lower.match(/class\s*\d+/i) ||
    (fileContent || "").toLowerCase().match(/class\s*\d+/i);
  const classLevel = classMatch
    ? classMatch[0].replace(/\bclass/i, "Class").trim()
    : "";

  // Use file content if meaningful, else fall back to title
  const sourceText =
    fileContent && fileContent.replace(/\s/g, "").length > 100
      ? fileContent.slice(0, 3500)
      : title;

  return {
    title,
    subject,
    classLevel,
    sourceText,
    content: sourceText,
    instructions: "Use clear exam language and include application-based questions.",
    totalMarks: 60,
    difficultyMix: { easy: 30, medium: 50, hard: 20 },
    questionTypes: ["mcq", "short-answer", "long-answer", "case-study"]
  };
}

async function runGeneration(assignmentId: string, sectionId?: string) {
  const assignment = dbReady
    ? await AssignmentModel.findById(assignmentId)
    : memoryAssignments.get(assignmentId);
  if (!assignment) throw new Error("Assignment not found");

  const assignmentObject = cleanAssignment(assignment);
  if (dbReady) {
    await AssignmentModel.findByIdAndUpdate(assignmentId, { status: "generating" });
  } else {
    memoryAssignments.set(assignmentId, { ...assignmentObject, status: "generating", updatedAt: now() });
  }

  emitGeneration(assignmentId, "generation:started", "parsing", "Parsing syllabus and teacher constraints", 15);
  emitGeneration(assignmentId, "generation:progress", "prompt", "Building prompt with strict schema", 35);
  emitGeneration(assignmentId, "generation:progress", "generating", "Generating questions", 60);
  emitGeneration(assignmentId, "generation:validating", "validating", "Validating structure with Zod", 78);

  const paper = questionPaperSchema.parse(await generateQuestionPaper(assignmentObject, assignmentId));

  if (dbReady) {
    if (sectionId) {
      const existing = await QuestionPaperModel.findOne({ assignmentId });
      const target = existing?.sections.find((section: any) => section.id === sectionId);
      const replacement = paper.sections.find((section) => section.title === target?.title) || paper.sections[0];
      await QuestionPaperModel.findOneAndUpdate(
        { assignmentId },
        {
          sections:
            existing?.sections.map((section: any) =>
              section.id === sectionId ? { ...replacement, id: sectionId } : section
            ) || paper.sections
        },
        { upsert: true, new: true }
      );
    } else {
      await QuestionPaperModel.findOneAndUpdate(
        { assignmentId },
        { ...paper, assignmentId },
        { upsert: true, new: true }
      );
    }
    await AssignmentModel.findByIdAndUpdate(assignmentId, { status: "ready" });
  } else {
    memoryPapers.set(assignmentId, { ...paper, assignmentId, _id: nanoid() });
    memoryAssignments.set(assignmentId, { ...assignmentObject, status: "ready", updatedAt: now() });
  }

  emitGeneration(assignmentId, "generation:completed", "ready", "Paper saved and ready", 100);
}

// ─── Upload ───────────────────────────────────────────────────────────────────
app.post("/api/upload", express.raw({ type: "*/*", limit: "10mb" }), (req, res) => {
  try {
    const file = parseMultipartFile(req);
    const fileId = nanoid();
    uploadedFiles.set(fileId, file);
    res.json({
      fileId,
      fileUrl: `/api/files/${fileId}`,
      fileName: file.fileName,
      size: file.buffer.length
    });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Upload failed" });
  }
});

app.use(express.json({ limit: "2mb" }));

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "vedaai-assessment-api", db: dbReady ? "mongo" : "memory", time: now() });
});

// ─── Files ────────────────────────────────────────────────────────────────────
app.get("/api/files/:id", (req, res) => {
  const file = uploadedFiles.get(req.params.id);
  if (!file) return res.status(404).json({ error: "File not found" });
  res.setHeader("content-type", file.mimeType);
  res.setHeader("content-disposition", `inline; filename="${file.fileName}"`);
  res.send(file.buffer);
});

// ─── Parse ────────────────────────────────────────────────────────────────────
app.post("/api/parse", (req, res) => {
  const { fileName, fileUrl, fileId } = req.body || {};

  let fileContent = "";
  if (fileId) {
    const file = uploadedFiles.get(fileId);
    if (file) {
      if (
        file.mimeType === "application/pdf" ||
        file.fileName.toLowerCase().endsWith(".pdf")
      ) {
        fileContent = extractTextFromPdfBuffer(file.buffer);
        console.log(`📄 Extracted ${fileContent.length} chars from PDF: ${file.fileName}`);
      } else if (
        file.mimeType.startsWith("text/") ||
        file.fileName.match(/\.(txt|md|csv)$/i)
      ) {
        fileContent = file.buffer.toString("utf-8").slice(0, 4000);
      }
    }
  }

  const parsed = parseUploadedContent(fileName || "uploaded syllabus", fileContent);
  console.log(`🔍 Parsed assignment: title="${parsed.title}" subject="${parsed.subject}" sourceText length=${parsed.sourceText.length}`);

  res.json({ parsed, fileUrl });
});

// ─── Assignments ──────────────────────────────────────────────────────────────
app.get("/api/assignments", async (_req, res) => {
  const assignments = dbReady
    ? (await AssignmentModel.find().sort({ createdAt: -1 })).map(cleanAssignment)
    : Array.from(memoryAssignments.values()).sort((a, b) =>
        String(b.createdAt).localeCompare(String(a.createdAt))
      );
  res.json(assignments);
});

app.post("/api/assignments", async (req, res) => {
  const parsed = assignmentInputSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid assignment" });

  const assignment = dbReady
    ? cleanAssignment(await AssignmentModel.create({ ...parsed.data, status: "draft" }))
    : { ...parsed.data, _id: nanoid(), status: "draft", createdAt: now(), updatedAt: now() };
  if (!dbReady) memoryAssignments.set(assignment._id, assignment);
  res.status(201).json({ assignment });
});

app.get("/api/assignments/:id", async (req, res) => {
  const assignment = dbReady
    ? await AssignmentModel.findById(req.params.id)
    : memoryAssignments.get(req.params.id);
  if (!assignment) return res.status(404).json({ error: "Assignment not found" });

  const paper = dbReady
    ? await QuestionPaperModel.findOne({ assignmentId: req.params.id })
    : memoryPapers.get(req.params.id);
  res.json({ assignment: cleanAssignment(assignment), paper });
});

app.delete("/api/assignments/:id", async (req, res) => {
  if (dbReady) {
    await AssignmentModel.findByIdAndDelete(req.params.id);
    await QuestionPaperModel.deleteMany({ assignmentId: req.params.id });
  } else {
    memoryAssignments.delete(req.params.id);
    memoryPapers.delete(req.params.id);
  }
  res.json({ ok: true });
});

app.post("/api/assignments/:id/generate", async (req, res) => {
  const assignmentId = req.params.id;
  if (dbReady) await AssignmentModel.findByIdAndUpdate(assignmentId, { status: "queued" });
  else if (memoryAssignments.has(assignmentId))
    memoryAssignments.set(assignmentId, {
      ...memoryAssignments.get(assignmentId),
      status: "queued"
    });

  emitGeneration(assignmentId, "generation:queued", "queued", "Generation queued", 5);

  if (process.env.USE_QUEUE !== "true") {
    await runGeneration(assignmentId);
    res.json({ queued: false, generated: true });
    return;
  }

  try {
    await getGenerationQueue().add("generate-paper", { assignmentId, mode: "full" });
    res.json({ queued: true });
  } catch (error) {
    console.warn("Queue unavailable. Falling back to inline generation.", error);
    await runGeneration(assignmentId);
    res.json({ queued: false, fallback: true });
  }
});

app.post("/api/assignments/:id/regenerate", async (req, res) => {
  const { sectionId } = req.body || {};
  await runGeneration(req.params.id, sectionId);
  res.json({ ok: true });
});

app.patch("/api/assignments/:id/questions/:questionId", async (req, res) => {
  const paper = dbReady
    ? await QuestionPaperModel.findOne({ assignmentId: req.params.id })
    : memoryPapers.get(req.params.id);
  if (!paper) return res.status(404).json({ error: "Paper not found" });

  paper.sections = paper.sections.map((section: any) => ({
    ...section,
    questions: section.questions.map((question: any) =>
      question.id === req.params.questionId ? { ...question, ...req.body } : question
    )
  }));
  if (dbReady) await paper.save();
  else memoryPapers.set(req.params.id, paper);
  res.json({ paper });
});

app.delete("/api/assignments/:id/questions/:questionId", async (req, res) => {
  const paper = dbReady
    ? await QuestionPaperModel.findOne({ assignmentId: req.params.id })
    : memoryPapers.get(req.params.id);
  if (!paper) return res.status(404).json({ error: "Paper not found" });

  paper.sections = paper.sections.map((section: any) => ({
    ...section,
    questions: section.questions.filter(
      (question: any) => question.id !== req.params.questionId
    )
  }));
  if (dbReady) await paper.save();
  else memoryPapers.set(req.params.id, paper);
  res.json({ paper });
});

app.get("/api/assignments/:id/export.pdf", async (req, res) => {
  const assignment = dbReady
    ? await AssignmentModel.findById(req.params.id)
    : memoryAssignments.get(req.params.id);
  const paper = dbReady
    ? await QuestionPaperModel.findOne({ assignmentId: req.params.id })
    : memoryPapers.get(req.params.id);
  if (!assignment || !paper) return res.status(404).json({ error: "Paper not found" });

  const pdf = await renderPaperPdf(paper, cleanAssignment(assignment));
  res.setHeader("content-type", "application/pdf");
  res.setHeader(
    "content-disposition",
    `attachment; filename="${cleanAssignment(assignment).title}.pdf"`
  );
  res.send(Buffer.from(pdf));
});

// ─── Socket.IO ────────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  socket.on("assignment:join", (assignmentId) => socket.join(assignmentId));
  socket.on("worker:generation-event", ({ assignmentId, event, data }) => {
    io.to(assignmentId).emit(event, data);
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const port = Number(process.env.PORT || 4000);

connectDb()
  .then(() => {
    dbReady = true;
    console.log("MongoDB connected.");
  })
  .catch((error) => {
    dbReady = false;
    console.warn("MongoDB unavailable. Using in-memory data store.");
    console.warn(error instanceof Error ? error.message : error);
  })
  .finally(() => {
    server.listen(port, () => {
      console.log(`VEDAai Assessment API listening on http://localhost:${port}`);
    });
  });
