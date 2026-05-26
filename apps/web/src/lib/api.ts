export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options?.body instanceof FormData ? {} : { "content-type": "application/json" }),
      ...(options?.headers || {})
    },
    cache: "no-store"
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${response.status}`);
  }
  return response.json();
}

export const api = {
  listAssignments: () => request<any[]>("/api/assignments"),
  getAssignment: (id: string) => request<any>(`/api/assignments/${id}`),

  createAssignment: (payload: any) =>
    request<any>("/api/assignments", { method: "POST", body: JSON.stringify(payload) }),

  // Upload file and get URL
  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<{ fileUrl: string; fileName: string; fileId: string; size: number }>("/api/upload", { 
      method: "POST", 
      body: formData 
    });
  },

  // NEW: Parse uploaded file to extract assignment details
  parseFile: (fileUrl: string, fileName: string) => {
    return request<{
      parsed: {
        title?: string;
        subject?: string;
        classLevel?: string;
        sourceText?: string;
        content?: string;
        instructions?: string;
        totalMarks?: number;
        difficultyMix?: { easy: number; medium: number; hard: number };
        questionTypes?: string[];
      } | null;
      fileUrl: string;
    }>("/api/parse", { 
      method: "POST", 
      body: JSON.stringify({ fileUrl, fileName }) 
    });
  },

  generate: (id: string) => request<any>(`/api/assignments/${id}/generate`, { method: "POST" }),
  regenerate: (id: string, sectionId?: string) =>
    request<any>(`/api/assignments/${id}/regenerate`, {
      method: "POST",
      body: JSON.stringify({ sectionId })
    }),
  updateQuestion: (assignmentId: string, questionId: string, payload: any) =>
    request<any>(`/api/assignments/${assignmentId}/questions/${questionId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  deleteQuestion: (assignmentId: string, questionId: string) =>
    request<any>(`/api/assignments/${assignmentId}/questions/${questionId}`, { method: "DELETE" })
};