"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { GenerationTimeline } from "@/components/GenerationTimeline";
import { PaperView } from "@/components/PaperView";
import { api } from "@/lib/api";

export function AssignmentDetail({ id }: { id: string }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await api.getAssignment(id));
    } catch (err: any) {
      setError(err.message);
    }
  }, [id]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <AppShell>
      <main className="page py-8">
        {error && <div className="panel p-4 font-bold text-[#9b2c1d]">{error}</div>}
        {data && (
          <>
            <section className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="badge mb-3 bg-white">{data.assignment.status}</span>
                <h1 className="text-3xl font-black">{data.assignment.title}</h1>
                <p className="mt-2 text-[#667085]">
                  {data.assignment.subject} • {data.assignment.classLevel} • {data.assignment.totalMarks} marks • due {data.assignment.dueDate}
                </p>
              </div>
            </section>
            <div className="mb-6">
              <GenerationTimeline assignmentId={id} status={data.assignment.status} />
            </div>
            {data.paper ? (
              <PaperView assignmentId={id} paper={data.paper} onRefresh={load} />
            ) : (
              <div className="panel p-8 text-center font-bold">Waiting for the generated paper...</div>
            )}
          </>
        )}
      </main>
    </AppShell>
  );
}
