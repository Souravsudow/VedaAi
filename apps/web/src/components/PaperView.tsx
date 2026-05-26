"use client";

import { useState } from "react";
import { Download, Pencil, RefreshCw, Save, Trash2 } from "lucide-react";
import { API_URL, api } from "@/lib/api";

function difficultyClass(difficulty: string) {
  if (difficulty === "easy") return "border-[#bdebd0] bg-[#e9fff1] text-[#2f6f4e]";
  if (difficulty === "medium") return "border-[#f4d58d] bg-[#fff3d6] text-[#9a5b00]";
  return "border-[#f5b5af] bg-[#ffe8e5] text-[#b9352b]";
}

export function PaperView({ assignmentId, paper, onRefresh }: { assignmentId: string; paper: any; onRefresh: () => void }) {
  const [editing, setEditing] = useState<any>(null);
  if (!paper) return null;

  const difficulties = paper.sections.flatMap((section: any) => section.questions.map((question: any) => question.difficulty));
  const marks = paper.sections.flatMap((section: any) => section.questions.map((question: any) => question.marks));

  async function saveQuestion() {
    await api.updateQuestion(assignmentId, editing.id, editing);
    setEditing(null);
    onRefresh();
  }

  async function deleteQuestion(questionId: string) {
    await api.deleteQuestion(assignmentId, questionId);
    onRefresh();
  }

  async function regenerate(sectionId?: string) {
    await api.regenerate(assignmentId, sectionId);
    setTimeout(onRefresh, 1500);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[280px_1fr]">
      <aside className="panel h-fit p-6">
        <h2 className="text-xl font-black">Summary</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[#e6ece8] bg-white p-4">
            <div className="text-2xl font-black">{paper.totalMarks}</div>
            <div className="text-xs font-bold text-[#667085]">Marks</div>
          </div>
          <div className="rounded-2xl border border-[#e6ece8] bg-white p-4">
            <div className="text-2xl font-black">{marks.length}</div>
            <div className="text-xs font-bold text-[#667085]">Questions</div>
          </div>
        </div>
        <div className="mt-4 grid gap-2 text-sm">
          {["easy", "medium", "hard"].map((difficulty) => (
            <div key={difficulty} className="flex items-center justify-between rounded-2xl border border-[#e6ece8] bg-white px-4 py-3">
              <span className="capitalize">{difficulty}</span>
              <strong>{difficulties.filter((item: string) => item === difficulty).length}</strong>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-2">
          <button className="button button-secondary w-full" onClick={() => regenerate()}>
            <RefreshCw size={17} />
            Regenerate full
          </button>
          <a className="button button-primary w-full" href={`${API_URL}/api/assignments/${assignmentId}/export.pdf`}>
            <Download size={17} />
            Download PDF
          </a>
        </div>
      </aside>

      <article className="paper rounded-[24px] p-5 sm:p-8">
        <header className="border-b-2 border-[#0b1020] pb-5">
          <h1 className="text-3xl font-black">Question Paper</h1>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="border-b border-[#98a2b3] pb-2 text-sm">Student name:</div>
            <div className="border-b border-[#98a2b3] pb-2 text-sm">Roll number:</div>
            <div className="border-b border-[#98a2b3] pb-2 text-sm">Section:</div>
          </div>
        </header>
        {paper.sections.map((section: any) => (
          <section key={section.id} className="mt-7">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">{section.title}</h2>
                <p className="text-sm font-semibold text-[#667085]">{section.instruction}</p>
              </div>
              <button className="button button-secondary" onClick={() => regenerate(section.id)}>
                <RefreshCw size={16} />
                Regenerate section
              </button>
            </div>
            <div className="grid gap-3">
              {section.questions.map((question: any, index: number) => (
                <div key={question.id} className="rounded-2xl border border-[#e6ece8] bg-white p-4 shadow-sm">
                  {editing?.id === question.id ? (
                    <div className="grid gap-3">
                      <textarea className="field min-h-24" value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })} />
                      <div className="grid gap-3 sm:grid-cols-4">
                        <input className="field" value={editing.topic} onChange={(e) => setEditing({ ...editing, topic: e.target.value })} />
                        <input className="field" type="number" value={editing.marks} onChange={(e) => setEditing({ ...editing, marks: Number(e.target.value) })} />
                        <select className="field" value={editing.difficulty} onChange={(e) => setEditing({ ...editing, difficulty: e.target.value })}>
                          <option>easy</option>
                          <option>medium</option>
                          <option>hard</option>
                        </select>
                        <button className="button button-primary" onClick={saveQuestion}>
                          <Save size={16} />
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <p className="leading-7">
                          <strong>{index + 1}.</strong> {question.text}
                        </p>
                        <div className="flex shrink-0 gap-1">
                          <button className="button button-secondary !min-h-9 !px-2" title="Edit question" onClick={() => setEditing(question)}>
                            <Pencil size={15} />
                          </button>
                          <button className="button button-secondary !min-h-9 !px-2" title="Delete question" onClick={() => deleteQuestion(question.id)}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="badge bg-white">{question.marks} marks</span>
                        <span className={`badge ${difficultyClass(question.difficulty)}`}>{question.difficulty}</span>
                        <span className="badge bg-[#f2f8f4] text-[#2f6f4e]">{question.topic}</span>
                        <span className="badge bg-[#fff3d6] text-[#9a5b00]">{question.bloomLevel}</span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </article>
    </div>
  );
}
