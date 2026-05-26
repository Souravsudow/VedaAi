"use client";

import { useMemo, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, ChevronDown, CloudUpload, FileText, Loader2, Minus, Plus, Sparkles, WandSparkles, X } from "lucide-react";
import { api } from "@/lib/api";

const questionRows = [
  ["Multiple Choice Questions", "mcq", 4, 1],
  ["Short Questions", "short-answer", 3, 2],
  ["Diagram/Graph-Based Questions", "long-answer", 5, 5],
  ["Case Study Questions", "case-study", 2, 6]
] as const;

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState(emptyForm);

  // Check if form has been auto-filled from upload
  const isFormFilled = !!form.title && !!form.subject && !!form.sourceText;

  const promptPreview = useMemo(
    () =>
      [
        `Create a structured ${form.subject || "..."} paper for ${form.classLevel || "..."}.`,
        `Marks: ${form.totalMarks}. Types: ${form.questionTypes.join(", ")}.`,
        `Difficulty: easy ${form.difficultyMix.easy}%, medium ${form.difficultyMix.medium}%, hard ${form.difficultyMix.hard}%.`,
        `Source: ${uploadedFile ? `File: ${uploadedFile.name}` : (form.sourceText?.slice(0, 220) ?? "")}`
      ].join("\n"),
    [form, uploadedFile]
  );

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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  // =========================

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...form,
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
                  ? "✓ File processed. Review the auto-filled details on the right."
                  : "📎 Upload a syllabus image, PDF, or document to get started"}
            </p>
          </div>

          <div className="assignment-fields-grid">
            <label className={`form-label ${form.title && !isFormFilled ? 'field-filled' : ''}`}>
              Assignment Title
              <input 
                className="field" 
                value={form.title} 
                onChange={(event) => setForm({ ...form, title: event.target.value })} 
                placeholder={uploadedFile ? "Extracting title..." : "Enter assignment title"}
                disabled={uploadLoading}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className={`form-label ${form.subject ? 'field-filled' : ''}`}>
                Subject
                <input 
                  className="field" 
                  value={form.subject} 
                  onChange={(event) => setForm({ ...form, subject: event.target.value })} 
                  placeholder={uploadedFile ? "Detecting subject..." : "e.g. Mathematics"}
                  disabled={uploadLoading}
                />
              </label>
              <label className={`form-label ${form.classLevel ? 'field-filled' : ''}`}>
                Class
                <input 
                  className="field" 
                  value={form.classLevel} 
                  onChange={(event) => setForm({ ...form, classLevel: event.target.value })} 
                  placeholder={uploadedFile ? "Detecting class..." : "e.g. Class 8"}
                  disabled={uploadLoading}
                />
              </label>
            </div>

            <label className="form-label">
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
          </div>
        </div>

        <div className="question-header-row">
          <span>Question Type</span>
          <span>No. of Questions</span>
          <span>Marks</span>
        </div>

        {questionRows.map(([label, type, count, marks]) => (
          <div key={type} className="question-row">
            <div>
              <div className="question-pill">
                {label}
                <ChevronDown size={22} />
              </div>
            </div>
            <div className="stepper">
              <Minus size={22} />
              <strong>{count}</strong>
              <Plus size={22} />
            </div>
            <div className="stepper">
              <Minus size={22} />
              <strong>{marks}</strong>
              <Plus size={22} />
            </div>
            <X className="hidden" />
          </div>
        ))}

        <div className="source-grid">
          <label className={`form-label ${form.sourceText ? 'field-filled' : ''}`}>
            Syllabus / Source Text
            <textarea 
              className="field min-h-28" 
              value={form.sourceText} 
              onChange={(event) => setForm({ ...form, sourceText: event.target.value, sourceType: "text" })} 
              placeholder={uploadedFile ? "Extracting content..." : "Paste your syllabus text here or upload a file above..."}
              disabled={uploadLoading}
            />
          </label>
          <label className="form-label">
            Instructions
            <textarea 
              className="field min-h-24" 
              value={form.instructions} 
              onChange={(event) => setForm({ ...form, instructions: event.target.value })} 
              placeholder="Enter special instructions for question generation..."
              disabled={uploadLoading}
            />
          </label>
          <div className="prompt-block">
            <div>Prompt Preview</div>
            <pre className="prompt-preview">{promptPreview}</pre>
          </div>
        </div>

        <button 
          className="button-dark mx-auto mt-9" 
          type="submit" 
          disabled={loading || uploadLoading || !form.title}
        >
          <WandSparkles size={24} />
          {loading ? "Creating..." : uploadLoading ? "Processing..." : !form.title ? "Upload a file first" : "Create Assignment"}
        </button>
      </section>
    </form>
  );
}