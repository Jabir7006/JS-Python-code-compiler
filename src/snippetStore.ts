const KEY = "pyplayground-snippets";

export type Language = "python" | "javascript";

export interface Snippet {
  id: string;
  name: string;
  language: Language;
  code: string;
  createdAt: number;
}

export function getSnippets(): Snippet[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveSnippet(
  name: string,
  language: Language,
  code: string,
): Snippet {
  const all = getSnippets();
  const s: Snippet = {
    id: Math.random().toString(36).slice(2, 9),
    name: name.trim() || "Untitled",
    language,
    code,
    createdAt: Date.now(),
  };
  localStorage.setItem(KEY, JSON.stringify([s, ...all]));
  return s;
}

export function deleteSnippet(id: string): void {
  const all = getSnippets().filter((s) => s.id !== id);
  localStorage.setItem(KEY, JSON.stringify(all));
}
