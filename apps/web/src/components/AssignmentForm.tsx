"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarPlus, ChevronDown, CloudUpload, FileText, Loader2, Mic, Minus, Plus, Sparkles, X } from "lucide-react";
import { api } from "@/lib/api";

type QuestionTypeValue = "mcq" | "short-answer" | "long-answer" | "case-study" | "fill-blank";

type QuestionRow = {
  id: string;
  label: string;
  type: QuestionTypeValue;
  count: number;
  marks: number;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

type SpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  onstart?: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionEvent = {
  resultIndex?: number;
  results: ArrayLike<{
    0: { transcript: string };
    isFinal: boolean;
  }>;
};

const questionTypeOptions: Array<{ label: string; type: QuestionTypeValue; marks: number }> = [
  { label: "Multiple Choice Questions", type: "mcq", marks: 1 },
  { label: "Short Questions", type: "short-answer", marks: 2 },
  { label: "Diagram/Graph-Based Questions", type: "long-answer", marks: 5 },
  { label: "Case Study Questions", type: "case-study", marks: 6 },
  { label: "Numerical Problems", type: "long-answer", marks: 5 },
  { label: "Fill in the Blanks", type: "fill-blank", marks: 1 }
];

function isQuestionTypeValue(type: string): type is QuestionTypeValue {
  return questionTypeOptions.some((option) => option.type === type);
}

const defaultQuestionRows: QuestionRow[] = [
  { id: "mcq", label: "Multiple Choice Questions", type: "mcq", count: 4, marks: 1 },
  { id: "short-answer", label: "Short Questions", type: "short-answer", count: 3, marks: 2 },
  { id: "long-answer", label: "Diagram/Graph-Based Questions", type: "long-answer", count: 5, marks: 5 },
  { id: "case-study", label: "Case Study Questions", type: "case-study", count: 2, marks: 6 }
];

// Default empty form state
const emptyForm = {
  title: "",
  subject: "",
  classLevel: "",
  dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  sourceType: "text" as "text" | "pdf" | "manual",
  sourceText: "",
  questionTypes: ["mcq", "short-answer", "long-answer", "case-study"],
  totalMarks: 40,
  difficultyMix: { easy: 30, medium: 50, hard: 20 },
  instructions: ""
};

export function AssignmentForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const [questionRows, setQuestionRows] = useState<QuestionRow[]>(defaultQuestionRows);
  const [listening, setListening] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const speechBaseRef = useRef("");

  const [form, setForm] = useState(emptyForm);

  // Check if form has been auto-filled from upload
  const isFormFilled = !!form.title && !!form.subject && !!form.sourceText;
  const totalQuestions = questionRows.reduce((sum, row) => sum + row.count, 0);
  const totalMarks = questionRows.reduce((sum, row) => sum + row.count * row.marks, 0);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      questionTypes: [...new Set(questionRows.map((row) => row.type))],
      totalMarks
    }));
  }, [questionRows, totalMarks]);

  // ===== FILE HANDLING =====
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const validateFile = (file: File): boolean => {
    const allowedTypes = [
      "application/pdf",
      "image/jpeg", 
      "image/png",
      "image/jpg",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];
    const allowedExtensions = [".pdf", ".jpeg", ".jpg", ".png", ".doc", ".docx"];

    const isValidType = allowedTypes.includes(file.type) || 
      allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!isValidType) {
      alert("Only PDF, JPEG, PNG, or DOC files are allowed!");
      return false;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB!");
      return false;
    }

    return true;
  };

  const handleFile = useCallback(async (file: File) => {
    if (!validateFile(file)) return;

    setUploadLoading(true);
    setUploadedFile(file);

    try {
      // Step 1: Upload file
      const uploadResult = await api.uploadFile(file);

      // Step 2: Parse file to extract assignment details
      const parseResult = await api.parseFile(uploadResult.fileUrl, file.name);

      // Step 3: Auto-fill form with parsed data
      const parsed = parseResult.parsed;
      if (parsed) {
        setParsedData(parsed);
        setForm(prev => ({
          ...prev,
          title: parsed.title ?? file.name.replace(/\.[^/.]+$/, ""),
          subject: parsed.subject ?? "",
          classLevel: parsed.classLevel ?? "",
          sourceType: "pdf",
          sourceText: parsed.sourceText ?? parsed.content ?? file.name,
          instructions: parsed.instructions ?? "Use clear exam language and include application-based questions.",
          totalMarks: parsed.totalMarks ?? prev.totalMarks,
          difficultyMix: parsed.difficultyMix ?? prev.difficultyMix,
          questionTypes: parsed.questionTypes ?? prev.questionTypes
        }));
        const parsedQuestionTypes = parsed.questionTypes?.filter(isQuestionTypeValue);
        if (parsedQuestionTypes?.length) {
          setQuestionRows(
            parsedQuestionTypes.map((type, index) => {
              const option = questionTypeOptions.find((item) => item.type === type) ?? questionTypeOptions[0];
              return {
                id: `${type}-${index}-${Date.now()}`,
                label: option.label,
                type,
                count: index === 0 ? 4 : 3,
                marks: option.marks
              };
            })
          );
        }
      } else {
        // Fallback: just use filename as title
        setForm(prev => ({
          ...prev,
          title: file.name.replace(/\.[^/.]+$/, ""),
          sourceType: "pdf",
          sourceText: file.name
        }));
      }

    } catch (error) {
      console.error("Upload/Parse error:", error);
      alert(error instanceof Error ? error.message : "Failed to process file");
      setUploadedFile(null);
    } finally {
      setUploadLoading(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setParsedData(null);
    setForm(emptyForm);
    setQuestionRows(defaultQuestionRows);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  // =========================

  function updateQuestionRow(id: string, patch: Partial<QuestionRow>) {
    setQuestionRows((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function stepQuestionRow(id: string, key: "count" | "marks", delta: number) {
    setQuestionRows((rows) =>
      rows.map((row) => (row.id === id ? { ...row, [key]: Math.max(1, row[key] + delta) } : row))
    );
  }

  function removeQuestionRow(id: string) {
    setQuestionRows((rows) => (rows.length > 1 ? rows.filter((row) => row.id !== id) : rows));
  }

  function addQuestionRow() {
    const option = questionTypeOptions.find((item) => !questionRows.some((row) => row.label === item.label)) ?? questionTypeOptions[0];
    setQuestionRows((rows) => [
      ...rows,
      {
        id: `${option.type}-${Date.now()}`,
        label: option.label,
        type: option.type,
        count: 1,
        marks: option.marks
      }
    ]);
  }

  function changeQuestionType(id: string, label: string) {
    const option = questionTypeOptions.find((item) => item.label === label);
    if (!option) return;
    updateQuestionRow(id, { label: option.label, type: option.type, marks: option.marks });
  }

  function toggleMic() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      alert("Speech input is not supported in this browser. Please use Chrome or Safari.");
      return;
    }

    const recognition = new Recognition();
    recognitionRef.current = recognition;
    speechBaseRef.current = form.instructions.trim();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language?.startsWith("hi") ? "hi-IN" : "en-IN";
    recognition.onstart = () => setListening(true);
    recognition.onresult = (event) => {
      const transcript = Array.from({ length: event.results.length }, (_, index) => event.results[index])
        .map((result) => result?.[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (transcript) {
        const nextText = [speechBaseRef.current, transcript].filter(Boolean).join(" ");
        setForm((prev) => ({ ...prev, instructions: nextText }));
      }
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...form,
        title: form.title || uploadedFile?.name.replace(/\.[^/.]+$/, "") || "New Assignment",
        subject: form.subject || "General",
        classLevel: form.classLevel || "Class",
        sourceText: form.sourceText || uploadedFile?.name || "Uploaded syllabus",
        questionPlan: questionRows.map((row) => ({
          label: row.label,
          type: row.type,
          count: row.count,
          marks: row.marks
        })),
        fileUrl: uploadedFile ? `/api/files/${uploadedFile.name}` : undefined,
        fileName: uploadedFile?.name
      };

      const created = await api.createAssignment(payload);
      await api.generate(created.assignment._id);
      router.push(`/assignments/${created.assignment._id}`);
    } catch (error) {
      console.error("Submit error:", error);
      alert(error instanceof Error ? error.message : "Failed to create assignment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="assignment-form-page">
      <div className="section-title-row">
        <span className="green-dot" />
        <div>
          <h1>Create Assignment</h1>
          <p>Upload a syllabus file to auto-fill assignment details</p>
        </div>
      </div>

      <div className="step-line" />

      <section className="form-card">
        <h2>Assignment Details</h2>
        <p className="subtle">
          {isFormFilled 
            ? "✓ Details extracted from your file. Review and edit if needed." 
            : "Upload a syllabus PDF or image to auto-detect assignment details"}
        </p>

        <div className="assignment-details-grid">
          <div>
            {/* ===== UPLOAD BOX ===== */}
            <div 
              className={`upload-box ${dragActive ? 'drag-active' : ''} ${uploadedFile ? 'has-file' : ''} ${uploadLoading ? 'uploading' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpeg,.jpg,.png,.doc,.docx"
                onChange={handleFileInputChange}
                style={{ display: "none" }}
              />

              {uploadLoading ? (
                <div className="upload-loading">
                  <Loader2 size={36} className="spin" />
                  <strong>Reading your file...</strong>
                  <p>Extracting assignment details using AI</p>
                </div>
              ) : uploadedFile ? (
                <div className="file-uploaded">
                  <div className="file-icon">
                    <FileText size={40} />
                  </div>
                  <div className="file-info">
                    <strong>{uploadedFile.name}</strong>
                    <p>{(uploadedFile.size / 1024).toFixed(1)} KB • {uploadedFile.type || "document"}</p>
                    {parsedData && (
                      <span className="parsed-badge">
                        <Sparkles size={12} />
                        Auto-filled {Object.keys(parsedData).length} fields
                      </span>
                    )}
                  </div>
                  <button 
                    type="button" 
                    onClick={(e) => { e.stopPropagation(); removeFile(); }} 
                    className="remove-file-btn"
                    title="Remove file and clear form"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div className="upload-placeholder" onClick={handleButtonClick}>
                  <CloudUpload size={36} />
                  <strong>Choose a file or drag & drop it here</strong>
                  <p>PDF, JPEG, PNG, up to 10MB</p>
                  <span className="button-soft">Browse Files</span>
                </div>
              )}
            </div>
            {/* ===================== */}

            <p className="upload-caption">
              {uploadLoading 
                ? "⏳ Please wait while we analyze your document..."
                : uploadedFile 
                  ? "File processed. Continue with question settings."
                  : "Upload a syllabus image, PDF, or document to get started"}
            </p>
          </div>
        </div>

        <label className="form-label due-date-field">
          Due Date
          <span className="relative">
            <input 
              className="field pr-14" 
              type="date" 
              value={form.dueDate} 
              onChange={(event) => setForm({ ...form, dueDate: event.target.value })} 
              disabled={uploadLoading}
            />
            <CalendarPlus className="calendar-icon" size={30} />
          </span>
        </label>

        <div className="question-header-row">
          <span>Question Type</span>
          <span>No. of Questions</span>
          <span>Marks</span>
        </div>

        {questionRows.map((row) => (
          <div key={row.id} className="question-row">
            <div>
              <div className="question-pill">
                <select
                  value={row.label}
                  onChange={(event) => changeQuestionType(row.id, event.target.value)}
                  aria-label="Question type"
                  disabled={uploadLoading}
                >
                  {questionTypeOptions.map((option) => (
                    <option key={`${option.label}-${option.type}`} value={option.label}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={22} />
              </div>
            </div>
            <div className="stepper">
              <button type="button" onClick={() => stepQuestionRow(row.id, "count", -1)} aria-label="Decrease questions">
                <Minus size={22} />
              </button>
              <strong>{row.count}</strong>
              <button type="button" onClick={() => stepQuestionRow(row.id, "count", 1)} aria-label="Increase questions">
                <Plus size={22} />
              </button>
            </div>
            <div className="stepper">
              <button type="button" onClick={() => stepQuestionRow(row.id, "marks", -1)} aria-label="Decrease marks">
                <Minus size={22} />
              </button>
              <strong>{row.marks}</strong>
              <button type="button" onClick={() => stepQuestionRow(row.id, "marks", 1)} aria-label="Increase marks">
                <Plus size={22} />
              </button>
            </div>
            <button type="button" className="question-remove" onClick={() => removeQuestionRow(row.id)} aria-label="Remove question type">
              <X size={18} />
            </button>
          </div>
        ))}

        <div className="question-actions-row">
          <button type="button" className="add-question-type" onClick={addQuestionRow}>
            <Plus size={20} />
            Add Question Type
          </button>
          <div className="question-totals">
            <span>Total Questions : {totalQuestions}</span>
            <span>Total Marks : {totalMarks}</span>
          </div>
        </div>

        <div className="source-grid">
          <label className="form-label additional-info">
            Additional Information (For better output)
            <span className="relative">
            <textarea 
              className="field min-h-24 pr-16" 
              value={form.instructions} 
              onChange={(event) => setForm({ ...form, instructions: event.target.value })} 
              placeholder="e.g Generate a question paper for 3 hour exam duration..."
              disabled={uploadLoading}
            />
              <button
                type="button"
                className={`mic-button ${listening ? "is-listening" : ""}`}
                onClick={toggleMic}
                aria-label={listening ? "Stop voice input" : "Start voice input"}
                title={listening ? "Listening..." : "Speak additional instructions"}
              >
              <Mic size={18} />
              </button>
            </span>
          </label>
        </div>
      </section>

      <div className="form-navigation">
        <button type="button" className="button-light" onClick={() => router.push("/")}>
          <ArrowLeft size={20} />
          Previous
        </button>
        <button 
          className="button-dark" 
          type="submit" 
          disabled={loading || uploadLoading || !form.title}
        >
          {loading ? "Creating..." : uploadLoading ? "Processing..." : "Next"}
          <ArrowRight size={20} />
        </button>
      </div>
    </form>
  );
}
