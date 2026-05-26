import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";

export default async function HistoryPage() {
  let assignments: any[] = [];
  try {
    assignments = await api.listAssignments();
  } catch {
    assignments = [];
  }
  assignments = assignments.filter((assignment) => !assignment.title?.match(/Backend Smoke|Geometry Checkpoint|Algebra Foundations/i));

  return (
    <AppShell>
      <main className="page">
        <div className="section-title-row">
          <span className="green-dot" />
          <div>
            <h1>Generation history</h1>
            <p>Previous AI-generated assignment papers.</p>
          </div>
        </div>
        {assignments.length ? (
          <div className="overflow-hidden rounded-[30px] bg-white">
            <div className="grid grid-cols-[1.3fr_0.8fr_0.7fr_0.5fr] gap-3 border-b border-[#ececec] bg-white p-5 text-base font-black text-[#777]">
              <span>Assignment</span>
              <span>Subject</span>
              <span>Due date</span>
              <span>Status</span>
            </div>
            {assignments.map((assignment) => (
              <Link key={assignment._id} href={`/assignments/${assignment._id}`} className="grid grid-cols-[1.3fr_0.8fr_0.7fr_0.5fr] gap-3 border-b border-[#ececec] p-5 text-base hover:bg-[#f7f7f7]">
                <strong>{assignment.title}</strong>
                <span>{assignment.subject}</span>
                <span>{assignment.dueDate}</span>
                <span className="badge w-fit bg-white">{assignment.status}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div>
              <h2>No generations yet</h2>
              <p>Create your first assignment and generated papers will appear here.</p>
              <Link href="/assignments/new" className="button-dark">
                Create Assignment
              </Link>
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}
