import { snippetCompletion } from "@codemirror/autocomplete";
import type { Completion } from "@codemirror/autocomplete";

// ---------------------------------------------------------------------------
// Snippet definition shape
// ---------------------------------------------------------------------------
export interface SnippetDef {
  trigger: string;        // word to match
  template: string;       // CodeMirror snippet template (${} = cursor / tab stop)
  label?: string;         // human-readable short label
  detail?: string;        // shown in autocomplete dropdown
}

// ---------------------------------------------------------------------------
// Built-in JS / TypeScript snippets
// ---------------------------------------------------------------------------
export const JS_SNIPPETS: SnippetDef[] = [
  {
    trigger: "log",
    template: "console.log(${expr})",
    label: "log",
    detail: "console.log(…)",
  },
  {
    trigger: "warn",
    template: "console.warn(${expr})",
    label: "warn",
    detail: "console.warn(…)",
  },
  {
    trigger: "err",
    template: "console.error(${expr})",
    label: "err",
    detail: "console.error(…)",
  },
  {
    trigger: "fn",
    template: "function ${name}(${params}) {\n\t${}\n}",
    label: "fn",
    detail: "function …() {}",
  },
  {
    trigger: "afn",
    template: "async function ${name}(${params}) {\n\t${}\n}",
    label: "afn",
    detail: "async function …() {}",
  },
  {
    trigger: "arr",
    template: "const ${name} = [${items}]",
    label: "arr",
    detail: "const … = […]",
  },
  {
    trigger: "obj",
    template: "const ${name} = {\n\t${key}: ${value}\n}",
    label: "obj",
    detail: "const … = {…}",
  },
  {
    trigger: "for",
    template: "for (let ${i} = 0; ${i} < ${arr}.length; ${i}++) {\n\t${}\n}",
    label: "for",
    detail: "for (let i …) {}",
  },
  {
    trigger: "forof",
    template: "for (const ${item} of ${arr}) {\n\t${}\n}",
    label: "forof",
    detail: "for (const … of …) {}",
  },
  {
    trigger: "forin",
    template: "for (const ${key} in ${obj}) {\n\t${}\n}",
    label: "forin",
    detail: "for (const … in …) {}",
  },
  {
    trigger: "map",
    template: "${arr}.map((${item}) => ${})",
    label: "map",
    detail: "….map(item => …)",
  },
  {
    trigger: "filter",
    template: "${arr}.filter((${item}) => ${})",
    label: "filter",
    detail: "….filter(item => …)",
  },
  {
    trigger: "reduce",
    template: "${arr}.reduce((${acc}, ${item}) => ${}, ${init})",
    label: "reduce",
    detail: "….reduce((acc, item) => …, init)",
  },
  {
    trigger: "if",
    template: "if (${condition}) {\n\t${}\n}",
    label: "if",
    detail: "if (…) {}",
  },
  {
    trigger: "ife",
    template: "if (${condition}) {\n\t${}\n} else {\n\t${}\n}",
    label: "ife",
    detail: "if (…) {} else {}",
  },
  {
    trigger: "try",
    template: "try {\n\t${}\n} catch (${e}) {\n\tconsole.error(${e})\n}",
    label: "try",
    detail: "try {} catch {}",
  },
  {
    trigger: "class",
    template: "class ${Name} {\n\tconstructor(${}) {\n\t\t${}\n\t}\n}",
    label: "class",
    detail: "class …{ constructor }",
  },
  {
    trigger: "imp",
    template: "import ${name} from '${module}'",
    label: "imp",
    detail: "import … from '…'",
  },
  {
    trigger: "pr",
    template: "new Promise((${resolve}, ${reject}) => {\n\t${}\n})",
    label: "pr",
    detail: "new Promise(…)",
  },
  {
    trigger: "sw",
    template:
      "switch (${expr}) {\n\tcase ${val}:\n\t\t${}\n\t\tbreak;\n\tdefault:\n\t\t${}\n}",
    label: "sw",
    detail: "switch (…) {}",
  },
  {
    trigger: "tern",
    template: "${condition} ? ${then} : ${else}",
    label: "tern",
    detail: "ternary expression",
  },
  {
    trigger: "dest",
    template: "const { ${key} } = ${obj}",
    label: "dest",
    detail: "destructure object",
  },
];

// ---------------------------------------------------------------------------
// Built-in Python snippets
// ---------------------------------------------------------------------------
export const PYTHON_SNIPPETS: SnippetDef[] = [
  {
    trigger: "pr",
    template: "print(${expr})",
    label: "pr",
    detail: "print(…)",
  },
  {
    trigger: "def",
    template: "def ${name}(${params}):\n\t${}",
    label: "def",
    detail: "def …(…):",
  },
  {
    trigger: "cl",
    template: "class ${Name}:\n\tdef __init__(self, ${}):\n\t\t${}",
    label: "cl",
    detail: "class …:",
  },
  {
    trigger: "for",
    template: "for ${item} in ${iterable}:\n\t${}",
    label: "for",
    detail: "for … in …:",
  },
  {
    trigger: "forr",
    template: "for ${i} in range(${n}):\n\t${}",
    label: "forr",
    detail: "for i in range(n):",
  },
  {
    trigger: "if",
    template: "if ${}:\n\t${}",
    label: "if",
    detail: "if …:",
  },
  {
    trigger: "ife",
    template: "if ${}:\n\t${}\nelse:\n\t${}",
    label: "ife",
    detail: "if … else …",
  },
  {
    trigger: "while",
    template: "while ${}:\n\t${}",
    label: "while",
    detail: "while …:",
  },
  {
    trigger: "try",
    template: "try:\n\t${}\nexcept ${Exception} as ${e}:\n\t${}",
    label: "try",
    detail: "try/except",
  },
  {
    trigger: "lc",
    template: "[${expr} for ${item} in ${iterable}]",
    label: "lc",
    detail: "list comprehension",
  },
  {
    trigger: "dc",
    template: "{${k}: ${v} for ${k}, ${v} in ${iterable}.items()}",
    label: "dc",
    detail: "dict comprehension",
  },
  {
    trigger: "lm",
    template: "lambda ${params}: ${}",
    label: "lm",
    detail: "lambda …: …",
  },
  {
    trigger: "main",
    template: "if __name__ == '__main__':\n\t${}",
    label: "main",
    detail: "if __name__ == '__main__':",
  },
  {
    trigger: "imp",
    template: "import ${module}",
    label: "imp",
    detail: "import …",
  },
  {
    trigger: "from",
    template: "from ${module} import ${name}",
    label: "from",
    detail: "from … import …",
  },
];

// ---------------------------------------------------------------------------
// Custom snippets — persisted to localStorage
// ---------------------------------------------------------------------------
const CUSTOM_KEY = "playground:custom-snippets";

export interface CustomSnippetEntry {
  id: string;
  language: "javascript" | "python";
  trigger: string;
  template: string;
  detail: string;
}

export function getCustomSnippets(): CustomSnippetEntry[] {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveCustomSnippet(
  entry: Omit<CustomSnippetEntry, "id">,
): CustomSnippetEntry {
  const snippets = getCustomSnippets();
  const newEntry: CustomSnippetEntry = { ...entry, id: crypto.randomUUID() };
  localStorage.setItem(CUSTOM_KEY, JSON.stringify([...snippets, newEntry]));
  return newEntry;
}

export function deleteCustomSnippet(id: string): void {
  const snippets = getCustomSnippets().filter((s) => s.id !== id);
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(snippets));
}

// ---------------------------------------------------------------------------
// Helpers: convert SnippetDef → CodeMirror Completion
// ---------------------------------------------------------------------------
export function toCompletion(def: SnippetDef): Completion {
  return snippetCompletion(def.template, {
    label: def.trigger,
    detail: def.detail ?? def.label ?? "",
    type: "keyword",
    boost: 99, // always appear at top of the list
  });
}
