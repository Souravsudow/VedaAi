"use client";

import { create } from "zustand";

type GenerationEvent = {
  assignmentId: string;
  step: string;
  message: string;
  progress: number;
};

type StudioState = {
  events: GenerationEvent[];
  setEvent: (event: GenerationEvent) => void;
  resetEvents: () => void;
};

export const useStudioStore = create<StudioState>((set) => ({
  events: [],
  setEvent: (event) =>
    set((state) => ({
      events: [...state.events.filter((item) => item.step !== event.step), event].sort(
        (a, b) => a.progress - b.progress
      )
    })),
  resetEvents: () => set({ events: [] })
}));
