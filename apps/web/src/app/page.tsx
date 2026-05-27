import Link from "next/link";
import { Filter, Plus, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AssignmentCardMenu } from "@/components/AssignmentCardMenu";
import { api } from "@/lib/api";

export default async function Dashboard() {
  let assignments: any[] = [];
  try {
    assignments = await api.listAssignments();
  } catch {
    assignments = [];
  }
  assignments = assignments.filter((assignment) => !assignment.title?.match(/Backend Smoke|Geometry Checkpoint|Algebra Foundations/i));

  return (
    <AppShell>
      <div className="page">
        <div className="section-title-row">
          <span className="green-dot" />
          <div>
            <h1>Assignments</h1>
            <p>Manage and create assignments for your classes.</p>
          </div>
        </div>

        {assignments.length ? (
          <>
            <div className="filter-bar">
              <div className="flex items-center gap-3 text-xl font-extrabold text-[#9a9a9a]">
                <Filter size={24} />
                Filter By
              </div>
              <div className="search-pill">
                <Search size={26} />
                Search Assignment
              </div>
            </div>

            <div className="assignment-cards">
              {assignments.slice(0, 8).map((assignment) => (
                <article key={assignment._id} className="assignment-card">
                  <AssignmentCardMenu assignmentId={assignment._id} />
                  <h2>
                    <Link href={`/assignments/${assignment._id}`}>{assignment.title || "Quiz on Electricity"}</Link>
                  </h2>
                  <div className="assignment-card-footer">
                    <span>
                      <strong>Assigned on :</strong>{" "}
                      {new Date(assignment.createdAt || Date.now()).toLocaleDateString("en-GB").replaceAll("/", "-")}
                    </span>
                    <span>
                      <strong>Due :</strong> {assignment.dueDate || "21-06-2025"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
            <Link href="/assignments/new" className="floating-create">
              <Plus size={28} />
              Create Assignment
            </Link>
          </>
        ) : (
          <div className="empty-state">
            <div>
              <div className="empty-illustration">
                <div className="empty-circle" />
                <div className="empty-paper" />
                <div className="empty-lens">×</div>
              </div>
              <h2>No assignments yet</h2>
              <p>
                Create your first assignment to start collecting and grading student submissions. You can set up rubrics,
                define marking criteria, and let AI assist with grading.
              </p>
              <Link href="/assignments/new" className="button-dark">
                <Plus size={28} />
                Create Your First Assignment
              </Link>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
