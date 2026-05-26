"use client";

import { useEffect } from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { io } from "socket.io-client";
import { API_URL } from "@/lib/api";
import { useStudioStore } from "@/store/studio";

const steps = [
  ["queued", "Queued"],
  ["parsing", "Parsing input"],
  ["prompt", "Building prompt"],
  ["generating", "Generating questions"],
  ["validating", "Validating structure"],
  ["saving", "Saving paper"],
  ["ready", "Ready"]
];

export function GenerationTimeline({ assignmentId, status }: { assignmentId: string; status: string }) {
  const { events, setEvent } = useStudioStore();
  const progress = Math.max(status === "ready" ? 100 : 0, ...events.map((event) => event.progress));

  useEffect(() => {
    const socket = io(API_URL);
    socket.emit("assignment:join", assignmentId);
    const handlers = [
      "generation:queued",
      "generation:started",
      "generation:progress",
      "generation:validating",
      "generation:completed",
      "generation:failed"
    ];
    handlers.forEach((eventName) => socket.on(eventName, setEvent));
    return () => {
      handlers.forEach((eventName) => socket.off(eventName, setEvent));
      socket.disconnect();
    };
  }, [assignmentId, setEvent]);

  return (
    <section className="panel p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-black">Generation timeline</h2>
        <span className="badge border-[#bdebd0] bg-[#e9fff1] text-[#2f6f4e]">{progress}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-[#e6ece8]">
        <div className="h-full bg-[#2f6f4e] transition-all" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-5 grid gap-3">
        {steps.map(([key, label]) => {
          const event = events.find((item) => item.step === key);
          const done = progress >= (key === "ready" ? 100 : steps.findIndex((step) => step[0] === key) * 15);
          return (
            <div key={key} className="flex gap-3">
              {event ? <CheckCircle2 className="text-[#2f6f4e]" size={19} /> : done ? <Loader2 className="animate-spin text-[#f2b84b]" size={19} /> : <Circle className="text-[#98a2b3]" size={19} />}
              <div>
                <div className="text-sm font-black">{label}</div>
                <div className="text-xs text-[#667085]">{event?.message || "Waiting"}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
