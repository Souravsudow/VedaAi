"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreVertical } from "lucide-react";
import { api } from "@/lib/api";

type AssignmentCardMenuProps = {
  assignmentId: string;
};

export function AssignmentCardMenu({ assignmentId }: AssignmentCardMenuProps) {
  const router = useRouter();

  async function deleteAssignment() {
    const confirmed = window.confirm("Delete this assignment?");
    if (!confirmed) return;
    await api.deleteAssignment(assignmentId);
    router.refresh();
  }

  return (
    <div className="assignment-menu-wrap" onClick={(event) => event.stopPropagation()}>
      <button className="assignment-menu-trigger" type="button" aria-label="Open assignment menu">
        <MoreVertical className="menu-dots" size={30} />
      </button>
      <div className="assignment-menu">
        <Link href={`/assignments/${assignmentId}`}>View Assignment</Link>
        <button type="button" onClick={deleteAssignment}>
          Delete
        </button>
      </div>
    </div>
  );
}
