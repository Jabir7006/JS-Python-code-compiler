import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import CodeMirror, { keymap, ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { autocompletion, completeAnyWord } from "@codemirror/autocomplete";
import { defaultKeymap } from "@codemirror/commands";
import {
  errorHighlighter,
  errorLineTheme,
  setErrorLine,
} from "./errorHighlighter";
import {
  Play,
  Trash2,
  Clock,
  TerminalSquare,
  AlertCircle,
  Check,
  Save,
  X,
  BookOpen,
  Bookmark,
  Settings as SettingsIcon,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { pythonCompletions } from "./completions";
import { jsCompletions } from "./jsCompletions";
import { runJavaScript } from "./jsRunner";
import { useSettings } from "./hooks/useSettings";
import { explainErrorAI, generateCodeSnippet } from "./aiService";
import {
  getSnippets,
  saveSnippet,
  deleteSnippet,
  type Language,
  type Snippet,
} from "./snippetStore";
import {
  JS_SNIPPETS,
  PYTHON_SNIPPETS,
  getCustomSnippets,
  saveCustomSnippet,
  deleteCustomSnippet,
  toCompletion,
  type CustomSnippetEntry,
} from "./snippets";
import { buildEnterSnippetKeymap } from "./snippetExpander";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

declare global {
  interface Window {
    loadPyodide: (options: { indexURL: string }) => Promise<any>;
  }
}

const PY_STARTER = [
  "# Welcome to Python Playground!",
  "# Press Ctrl+Enter to run",
  "",
  'name = "Python"',
  "version = 3.12",
  "",
  'print(f"Hello from {name} {version}!")',
  "",
  "numbers = [1, 2, 3, 4, 5]",
  'print(f"Sum = {sum(numbers)}")',
  "",
  "def greet(person):",
  '    return f"Hi, {person}!"',
  "",
  'print(greet("learner"))',
].join("\n");

const JS_STARTER = [
  "// JavaScript Playground",
  "// Press Ctrl+Enter to run",
  "",
  "const name = 'JavaScript';",
  "const version = 2024;",
  "console.log(`Hello from ${name} ${version}!`);",
  "",
  "const numbers = [1, 2, 3, 4, 5];",
  "const sum = numbers.reduce((a, b) => a + b, 0);",
  "console.log('Sum =', sum);",
  "",
  "const greet = (person) => `Hi, ${person}!`;",
  "console.log(greet('learner'));",
].join("\n");

const PY_EXAMPLES = [
  { name: "starter", label: "Starter", code: PY_STARTER },
  {
    name: "fibonacci",
    label: "Fibonacci",
    code: [
      "def fibonacci(n):",
      "    a, b = 0, 1",
      "    for _ in range(n):",
      "        print(a, end=' ')",
      "        a, b = b, a + b",
      "    print()",
      "",
      "fibonacci(12)",
    ].join("\n"),
  },
  {
    name: "list_comp",
    label: "List comprehensions",
    code: [
      "squares = [x**2 for x in range(10)]",
      'print("Squares:", squares)',
      "",
      "evens = [x for x in range(20) if x % 2 == 0]",
      'print("Evens:", evens)',
      "",
      "matrix = [[i * j for j in range(1, 4)] for i in range(1, 4)]",
      "for row in matrix:",
      "    print(row)",
    ].join("\n"),
  },
  {
    name: "classes",
    label: "Classes",
    code: [
      "class Developer:",
      "    def __init__(self, name, lang):",
      "        self.name = name",
      "        self.lang = lang",
      "        self.coffee = 0",
      "",
      "    def code(self):",
      "        self.coffee += 1",
      '        return f"{self.name} writes {self.lang}. Coffee: {self.coffee}"',
      "",
      'dev = Developer("Alex", "Python")',
      "print(dev.code())",
      "print(dev.code())",
    ].join("\n"),
  },
];

const JS_EXAMPLES = [
  { name: "starter", label: "Starter", code: JS_STARTER },
  {
    name: "array_methods",
    label: "Array methods",
    code: [
      "const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];",
      "",
      "const evens = nums.filter(n => n % 2 === 0);",
      "console.log('Evens:', evens);",
      "",
      "const doubled = nums.map(n => n * 2);",
      "console.log('Doubled:', doubled);",
      "",
      "const sum = nums.reduce((acc, n) => acc + n, 0);",
      "console.log('Sum:', sum);",
    ].join("\n"),
  },
  {
    name: "promises",
    label: "Promises & async",
    code: [
      "const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));",
      "",
      "async function main() {",
      "  console.log('Start');",
      "  await delay(0);",
      "  console.log('After await');",
      "  return 42;",
      "}",
      "",
      "main().then(result => console.log('Result:', result));",
    ].join("\n"),
  },
  {
    name: "classes",
    label: "Classes",
    code: [
      "class Animal {",
      "  constructor(name, sound) {",
      "    this.name = name;",
      "    this.sound = sound;",
      "  }",
      "  speak() {",
      "    return `${this.name} says ${this.sound}!`;",
      "  }",
      "}",
      "",
      "class Dog extends Animal {",
      "  constructor(name) { super(name, 'woof'); }",
      "  fetch(item) { return `${this.name} fetches the ${item}`; }",
      "}",
      "",
      "const dog = new Dog('Rex');",
      "console.log(dog.speak());",
      "console.log(dog.fetch('ball'));",
    ].join("\n"),
  },
];

type OutputLine = {
  id: string;
  type: "stdout" | "stderr" | "system";
  content: string;
  timestamp: Date;
};

const INIT_SCRIPT =
  "import sys\nfrom io import StringIO\nsys.stdout = StringIO()\nsys.stderr = StringIO()";

function lineClass(type: OutputLine["type"]) {
  if (type === "stderr")
    return "py-2 px-3 border-l-2 border-red-500 bg-red-950/30 rounded-r text-red-300";
  if (type === "system")
    return "py-1 px-3 border-l-2 border-primary/40 text-muted-foreground italic";
  return "py-1 px-3 border-l-2 border-transparent text-foreground";
}

export default function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => document.documentElement.classList.remove("dark");
  }, []);

  const [lang, setLang] = useState<Language>("python");
  const [pyodide, setPyodide] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pyCode, setPyCode] = useState(PY_STARTER);
  const [jsCode, setJsCode] = useState(JS_STARTER);
  const [output, setOutput] = useState<OutputLine[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const [snippets, setSnippets] = useState<Snippet[]>(() => getSnippets());
  const [showSave, setShowSave] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [explainingError, setExplainingError] = useState<string | null>(null);

  // Custom snippets state
  const [customSnippets, setCustomSnippets] = useState<CustomSnippetEntry[]>(
    () => getCustomSnippets(),
  );
  const [newSnippetTrigger, setNewSnippetTrigger] = useState("");
  const [newSnippetTemplate, setNewSnippetTemplate] = useState("");
  const [settingsTab, setSettingsTab] = useState<"ai" | "snippets">("ai");

  const { settings, updateSettings } = useSettings();

  const outputEndRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef({ python: PY_STARTER, javascript: JS_STARTER });
  const saveInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  const clearErrorHighlight = useCallback(() => {
    const view = editorRef.current?.view;
    if (view) view.dispatch({ effects: setErrorLine.of(null) });
  }, []);

  const highlightErrorLine = useCallback(
    (errorStr: string, isPython: boolean) => {
      const view = editorRef.current?.view;
      if (!view) return;

      let lineNum: number | null = null;
      if (isPython) {
        // Python traceback often has: File "<exec>", line X
        const match = errorStr.match(/line (\d+)/i);
        if (match) lineNum = parseInt(match[1], 10);
      } else {
        // JS eval often has: <anonymous>:X:Y
        const match = errorStr.match(/<anonymous>:(\d+)/i);
        if (match) lineNum = parseInt(match[1], 10);
      }

      if (lineNum !== null && lineNum > 0) {
        view.dispatch({ effects: setErrorLine.of(lineNum) });
      }
    },
    [],
  );

  const code = lang === "python" ? pyCode : jsCode;
  const setCode = lang === "python" ? setPyCode : setJsCode;
  const examples = lang === "python" ? PY_EXAMPLES : JS_EXAMPLES;
  const langSnippets = snippets.filter((s) => s.language === lang);

  const push = useCallback((content: string, type: OutputLine["type"]) => {
    setOutput((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2, 9),
        type,
        content,
        timestamp: new Date(),
      },
    ]);
  }, []);

  const handleExplainError = useCallback(
    async (errorText: string, lineId: string) => {
      if (explainingError) return;
      setExplainingError(lineId);
      try {
        const explanation = await explainErrorAI(
          errorText,
          codeRef.current[lang],
          settings,
        );
        push(`\n✨ AI Explanation:\n${explanation}`, "system");
      } catch (e: any) {
        push(`\n✨ AI Explanation failed: ${e.message}`, "system");
      } finally {
        setExplainingError(null);
      }
    },
    [explainingError, settings, lang, push],
  );

  const handleGenerateCode = useCallback(async () => {
    if (!generatePrompt.trim() || isGenerating) return;
    setIsGenerating(true);
    try {
      const generatedCode = await generateCodeSnippet(
        generatePrompt,
        lang,
        settings,
      );
      const view = editorRef.current?.view;
      if (view) {
        const insertPos = view.state.selection.main.head;
        view.dispatch({
          changes: { from: insertPos, insert: generatedCode + "\n" },
          selection: { anchor: insertPos + generatedCode.length + 1 },
        });
      } else {
        setCode((prev) => prev + "\n" + generatedCode);
        codeRef.current[lang] = codeRef.current[lang] + "\n" + generatedCode;
      }
      setShowGenerate(false);
      setGeneratePrompt("");
      push("✨ Code generated successfully.", "system");
    } catch (e: any) {
      push(`\n✨ Generation failed: ${e.message}`, "system");
    } finally {
      setIsGenerating(false);
    }
  }, [generatePrompt, isGenerating, lang, settings, push, setCode]);

  useEffect(() => {
    let alive = true;
    const poll = setInterval(() => {
      if (window.loadPyodide) {
        clearInterval(poll);
        window
          .loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.0/full/",
          })
          .then((py) => {
            if (!alive) return;
            // Intercept Python input()
            py.setStdin({
              stdin: () => {
                const userInput = window.prompt("Python input:");
                return userInput !== null ? userInput + "\n" : "\n";
              },
            });
            setPyodide(py);
            setIsLoading(false);
            push("Python 3.12 ready.", "system");
          })
          .catch((err) => {
            if (!alive) return;
            setIsLoading(false);
            push("Failed to initialize Python: " + String(err), "stderr");
          });
      }
    }, 80);
    return () => {
      alive = false;
      clearInterval(poll);
    };
  }, [push]);

  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [output]);

  useEffect(() => {
    if (showSave) setTimeout(() => saveInputRef.current?.focus(), 50);
  }, [showSave]);

  const runCode = useCallback(
    async (src?: string) => {
      if (isRunning) return;
      const toRun = src ?? codeRef.current[lang];

      if (lang === "javascript") {
        setIsRunning(true);
        clearErrorHighlight();
        try {
          const { stdout, stderr } = await runJavaScript(toRun);
          if (stdout) push(stdout, "stdout");
          if (stderr) {
            push(stderr, "stderr");
            highlightErrorLine(stderr, false);
          }
          if (!stdout && !stderr)
            push("Ran successfully (no output).", "system");
        } finally {
          setIsRunning(false);
        }
        return;
      }

      if (!pyodide) return;
      setIsRunning(true);
      clearErrorHighlight();
      try {
        push("Installing required packages (if any)...", "system");
        await pyodide.loadPackagesFromImports(toRun);

        await pyodide.runPythonAsync(INIT_SCRIPT);
        await pyodide.runPythonAsync(toRun);
        const out: string = await pyodide.runPythonAsync(
          "sys.stdout.getvalue()",
        );
        const err: string = await pyodide.runPythonAsync(
          "sys.stderr.getvalue()",
        );
        if (out) push(out.replace(/\n$/, ""), "stdout");
        if (err) push(err.replace(/\n$/, ""), "stderr");
        if (!out && !err) push("Ran successfully (no output).", "system");
      } catch (e: any) {
        let errStr = e.message || String(e);

        // Try to get the actual Python traceback from sys.stderr
        try {
          if (pyodide) {
            const stderrStr = pyodide.runPython("sys.stderr.getvalue()");
            if (stderrStr && stderrStr.includes("Traceback")) {
              errStr = stderrStr;
            }
          }
        } catch (_) {}

        // If it's still a JS stack trace from Pyodide, clean out the WebAssembly 'at' frames
        if (typeof errStr === "string" && errStr.includes("PythonError")) {
          errStr = errStr
            .split("\n")
            .filter((line) => !line.trim().startsWith("at "))
            .join("\n")
            .trim();
        }

        push(errStr, "stderr");
        highlightErrorLine(errStr, true);
      } finally {
        setIsRunning(false);
      }
    },
    [pyodide, isRunning, lang, push],
  );

  const handleChange = useCallback(
    (val: string) => {
      setCode(val);
      codeRef.current[lang] = val;
      clearErrorHighlight();
    },
    [lang, setCode, clearErrorHighlight],
  );

  const handleLoadExample = useCallback(
    (name: string) => {
      const ex = examples.find((e) => e.name === name);
      if (!ex) return;
      setCode(ex.code);
      codeRef.current[lang] = ex.code;
    },
    [examples, lang, setCode],
  );

  const handleLoadSnippet = useCallback(
    (id: string) => {
      const s = snippets.find((sn) => sn.id === id);
      if (!s) return;
      if (s.language !== lang) setLang(s.language);
      if (s.language === "python") {
        setPyCode(s.code);
        codeRef.current.python = s.code;
      } else {
        setJsCode(s.code);
        codeRef.current.javascript = s.code;
      }
    },
    [snippets, lang],
  );

  const handleSave = useCallback(() => {
    const s = saveSnippet(saveName || "Untitled", lang, codeRef.current[lang]);
    setSnippets(getSnippets());
    push(`Saved snippet "${s.name}".`, "system");
    setShowSave(false);
    setSaveName("");
  }, [saveName, lang, push]);

  const handleDelete = useCallback((id: string) => {
    deleteSnippet(id);
    setSnippets(getSnippets());
  }, []);

  const isRunDisabled = lang === "python" ? isLoading || isRunning : isRunning;

  // Build snippet completions + Enter expander, recomputed when lang or custom snippets change
  const snippetExtensions = useMemo(() => {
    const builtins = lang === "python" ? PYTHON_SNIPPETS : JS_SNIPPETS;
    const customs = customSnippets
      .filter((s) => s.language === lang)
      .map((s) => ({ trigger: s.trigger, template: s.template, detail: s.detail }));
    const allSnippets = [...builtins, ...customs];
    return [
      // Show snippets as suggestions in the autocomplete dropdown
      autocompletion({
        override: [
          () => ({
            from: 0,
            options: allSnippets.map(toCompletion),
            validFor: /^\w*$/,
          }),
          lang === "python" ? pythonCompletions : jsCompletions,
          completeAnyWord,
        ],
        activateOnTyping: true,
      }),
      // Enter key expander (takes priority — runs before defaultKeymap)
      buildEnterSnippetKeymap(allSnippets),
    ];
  }, [lang, customSnippets]);

  const extensions = [
    lang === "python"
      ? python()
      : javascript({ jsx: false, typescript: false }),
    ...snippetExtensions,
    errorHighlighter,
    errorLineTheme,
    keymap.of([
      {
        key: "Ctrl-Enter",
        mac: "Cmd-Enter",
        run: () => {
          runCode(codeRef.current[lang]);
          return true;
        },
      },
      ...defaultKeymap,
    ]),
  ];

  return (
    <div className="flex flex-col h-screen w-full bg-background text-foreground font-sans overflow-hidden">
      {/* Header */}
      <header className="flex-none h-14 border-b border-border/40 flex items-center justify-between px-4 bg-background/70 backdrop-blur-xl gap-2 flex-wrap z-10 shadow-sm relative">
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
            <TerminalSquare size={14} />
          </div>
          <span className="font-semibold text-xs tracking-widest hidden sm:block">
            PLAYGROUND
          </span>
        </div>

        {/* Language tabs */}
        <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1 border border-border/40 backdrop-blur-md">
          <button
            onClick={() => setLang("python")}
            data-testid="tab-python"
            className={
              "px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-300 " +
              (lang === "python"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50")
            }
          >
            Python
          </button>
          <button
            onClick={() => setLang("javascript")}
            data-testid="tab-javascript"
            className={
              "px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-300 " +
              (lang === "javascript"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50")
            }
          >
            JavaScript
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Examples */}
          <Select onValueChange={handleLoadExample}>
            <SelectTrigger
              className="w-[130px] h-8 text-xs bg-muted/50 border-border/50"
              data-testid="select-example"
            >
              <BookOpen size={12} className="mr-1 shrink-0" />
              <SelectValue placeholder="Examples" />
            </SelectTrigger>
            <SelectContent>
              {examples.map((ex) => (
                <SelectItem key={ex.name} value={ex.name} className="text-xs">
                  {ex.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Snippets */}
          {langSnippets.length > 0 && (
            <Select onValueChange={handleLoadSnippet}>
              <SelectTrigger
                className="w-[130px] h-8 text-xs bg-muted/50 border-border/50"
                data-testid="select-snippets"
              >
                <Bookmark size={12} className="mr-1 shrink-0" />
                <SelectValue placeholder="Snippets" />
              </SelectTrigger>
              <SelectContent>
                {langSnippets.map((s) => (
                  <div key={s.id} className="flex items-center group">
                    <SelectItem value={s.id} className="text-xs flex-1">
                      {s.name}
                    </SelectItem>
                    <button
                      className="px-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(s.id);
                      }}
                      title="Delete snippet"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Generate Code */}
          <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-border/50 bg-muted/30 ml-2"
                title="Generate Code with AI"
              >
                <Sparkles size={14} className="text-purple-400" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Code</DialogTitle>
                <DialogDescription>
                  Describe what you want to build. The generated code will be
                  inserted at your cursor.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <textarea
                  className="w-full h-32 p-3 text-sm rounded-md border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="E.g., Write a function that calculates the nth Fibonacci number..."
                  value={generatePrompt}
                  onChange={(e) => setGeneratePrompt(e.target.value)}
                />
                <Button
                  onClick={handleGenerateCode}
                  disabled={isGenerating || !generatePrompt.trim()}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isGenerating ? "Generating..." : "Generate ✨"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full border-border/40 bg-muted/20 ml-2 hover:bg-muted/50 transition-colors"
                title="Settings"
              >
                <SettingsIcon size={14} />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Settings</DialogTitle>
                <DialogDescription>
                  Configure AI providers and manage code snippets.
                </DialogDescription>
              </DialogHeader>

              {/* Tab switcher */}
              <div className="flex gap-1 bg-muted/30 rounded-lg p-1 border border-border/40">
                <button
                  className={"flex-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all " + (settingsTab === "ai" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground")}
                  onClick={() => setSettingsTab("ai")}
                >AI Provider</button>
                <button
                  className={"flex-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all " + (settingsTab === "snippets" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground")}
                  onClick={() => setSettingsTab("snippets")}
                >Snippets</button>
              </div>

              {settingsTab === "ai" && (
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">AI Provider</label>
                    <Select
                      value={settings.aiProvider}
                      onValueChange={(val: any) =>
                        updateSettings({ aiProvider: val })
                      }
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini" className="text-xs">
                          Google Gemini
                        </SelectItem>
                        <SelectItem value="groq" className="text-xs">
                          Groq (Llama 3)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {settings.aiProvider === "gemini" && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold">Gemini API Key</label>
                      <Input
                        type="password"
                        value={settings.geminiApiKey}
                        onChange={(e) => updateSettings({ geminiApiKey: e.target.value })}
                        placeholder="AIzaSy..."
                        className="text-xs font-mono"
                      />
                      <p className="text-[10px] text-muted-foreground">Keys are stored locally in your browser.</p>
                    </div>
                  )}

                  {settings.aiProvider === "groq" && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold">Groq API Key</label>
                      <Input
                        type="password"
                        value={settings.groqApiKey}
                        onChange={(e) => updateSettings({ groqApiKey: e.target.value })}
                        placeholder="gsk_..."
                        className="text-xs font-mono"
                      />
                      <p className="text-[10px] text-muted-foreground">Keys are stored locally in your browser.</p>
                    </div>
                  )}
                </div>
              )}

              {settingsTab === "snippets" && (
                <div className="space-y-4 py-2">
                  {/* Built-in snippets reference */}
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Built-in ({lang})</p>
                    <div className="max-h-36 overflow-y-auto rounded-lg border border-border/40 divide-y divide-border/40">
                      {(lang === "python" ? PYTHON_SNIPPETS : JS_SNIPPETS).map((s) => (
                        <div key={s.trigger} className="flex items-center justify-between px-3 py-1.5 text-xs">
                          <code className="font-mono text-primary font-bold">{s.trigger}</code>
                          <span className="text-muted-foreground ml-2 truncate">{s.detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Custom snippets */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">My Snippets</p>
                    {customSnippets.filter(s => s.language === lang).length > 0 ? (
                      <div className="max-h-28 overflow-y-auto rounded-lg border border-border/40 divide-y divide-border/40">
                        {customSnippets.filter(s => s.language === lang).map((s) => (
                          <div key={s.id} className="flex items-center justify-between px-3 py-1.5 text-xs group">
                            <code className="font-mono text-emerald-400 font-bold">{s.trigger}</code>
                            <span className="text-muted-foreground ml-2 truncate flex-1">{s.detail || s.template.slice(0, 30)}</span>
                            <button
                              className="ml-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-opacity"
                              onClick={() => {
                                deleteCustomSnippet(s.id);
                                setCustomSnippets(getCustomSnippets());
                              }}
                              title="Delete"
                            ><X size={11} /></button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground italic px-1">No custom snippets yet.</p>
                    )}
                  </div>

                  {/* Add new snippet */}
                  <div className="space-y-2 border-t border-border/40 pt-3">
                    <p className="text-xs font-semibold">Add Snippet</p>
                    <Input
                      placeholder="Trigger word (e.g. mylog)"
                      value={newSnippetTrigger}
                      onChange={e => setNewSnippetTrigger(e.target.value)}
                      className="text-xs font-mono h-8"
                    />
                    <textarea
                      placeholder={`Template (e.g. console.log(\${}))`}
                      value={newSnippetTemplate}
                      onChange={e => setNewSnippetTemplate(e.target.value)}
                      className="w-full h-20 p-2 text-xs font-mono rounded-md border border-border/40 bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <Button
                      size="sm"
                      className="w-full h-8 text-xs"
                      disabled={!newSnippetTrigger.trim() || !newSnippetTemplate.trim()}
                      onClick={() => {
                        saveCustomSnippet({
                          language: lang,
                          trigger: newSnippetTrigger.trim(),
                          template: newSnippetTemplate,
                          detail: `Custom: ${newSnippetTrigger.trim()}`,
                        });
                        setCustomSnippets(getCustomSnippets());
                        setNewSnippetTrigger("");
                        setNewSnippetTemplate("");
                      }}
                    >Add Snippet</Button>
                    <p className="text-[10px] text-muted-foreground">Use <code className="font-mono">{'${}'}</code> for cursor position, <code className="font-mono">{'${name}'}</code> for named tab stops.</p>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Save snippet */}
          {showSave ? (
            <div className="flex items-center gap-1">
              <Input
                ref={saveInputRef}
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") {
                    setShowSave(false);
                    setSaveName("");
                  }
                }}
                placeholder="Snippet name..."
                className="h-8 w-32 text-xs bg-muted/50 border-border/50"
                data-testid="input-snippet-name"
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={handleSave}
                data-testid="button-confirm-save"
              >
                <Check size={13} className="text-emerald-400" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => {
                  setShowSave(false);
                  setSaveName("");
                }}
              >
                <X size={13} />
              </Button>
            </div>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs border-border/50 bg-muted/30"
                    onClick={() => setShowSave(true)}
                    data-testid="button-save"
                  >
                    <Save size={12} className="mr-1" />
                    Save
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  Save current code as snippet
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Run */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => runCode()}
                  disabled={isRunDisabled}
                  size="sm"
                  data-testid="button-run"
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold px-5 h-8 rounded-full shadow-lg shadow-violet-600/20 hover:shadow-violet-600/40 transition-all duration-300 hover:scale-[1.03] active:scale-95 border border-white/10"
                >
                  {isRunning ? (
                    <span className="flex items-center gap-2">
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Running
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Play size={13} fill="currentColor" />
                      Run
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs font-mono">
                Ctrl + Enter
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </header>

      {/* Split view */}
      <main className="flex-1 min-h-0 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full w-full">
          {/* Editor */}
          <ResizablePanel
            defaultSize={50}
            minSize={20}
            className="flex flex-col min-w-0 border-r border-border/40 relative"
          >
            <div className="flex-none flex items-center justify-between px-4 h-9 bg-muted/10 border-b border-border/30 text-xs font-mono text-muted-foreground shadow-sm z-10">
              <span className="text-primary font-semibold">
                {lang === "python" ? "main.py" : "main.js"}
              </span>
              {editorReady && (
                <span className="flex items-center gap-1 opacity-50">
                  <Check size={10} className="text-emerald-400" />
                  Ready
                </span>
              )}
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <CodeMirror
                ref={editorRef}
                key={lang}
                value={code}
                height="100%"
                theme={oneDark}
                extensions={extensions}
                onChange={handleChange}
                onCreateEditor={() => setEditorReady(true)}
                basicSetup={{
                  lineNumbers: true,
                  highlightActiveLineGutter: true,
                  highlightSpecialChars: true,
                  foldGutter: true,
                  dropCursor: false,
                  allowMultipleSelections: false,
                  indentOnInput: true,
                  bracketMatching: true,
                  closeBrackets: true,
                  autocompletion: false,
                  rectangularSelection: false,
                  crosshairCursor: false,
                  highlightActiveLine: true,
                  highlightSelectionMatches: true,
                  closeBracketsKeymap: true,
                  defaultKeymap: false,
                  searchKeymap: false,
                  historyKeymap: true,
                  foldKeymap: false,
                  completionKeymap: true,
                  lintKeymap: false,
                }}
                style={{ height: "100%", fontSize: "13.5px" }}
                data-testid="editor"
              />
            </div>
          </ResizablePanel>

          <ResizableHandle className="w-1.5 bg-border/40 hover:bg-primary/50 transition-colors duration-300" withHandle />

          {/* Output */}
          <ResizablePanel
            defaultSize={50}
            minSize={20}
            className="flex flex-col min-w-0 bg-black/20 shadow-inner"
          >
            <div className="flex-none flex items-center justify-between px-4 h-9 bg-background/50 border-b border-border/30 text-xs shadow-sm z-10 backdrop-blur-md">
              <span className="font-mono text-muted-foreground/80 font-semibold uppercase tracking-widest text-[10px]">
                Output
              </span>
              {output.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={() => setOutput([])}
                  data-testid="button-clear"
                  title="Clear output"
                >
                  <Trash2 size={12} />
                </Button>
              )}
            </div>

            <div
              className="flex-1 min-h-0 overflow-y-auto p-3 font-mono text-sm leading-relaxed"
              data-testid="output-panel"
            >
              {output.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30 select-none gap-2">
                  <TerminalSquare size={36} />
                  <p className="text-xs">Output appears here</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {output.map((line) => (
                    <div key={line.id} className={lineClass(line.type)}>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground/40 mb-0.5">
                        <Clock size={9} />
                        {line.timestamp.toLocaleTimeString([], {
                          hour12: false,
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </div>
                      {line.type === "stderr" && (
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1 text-red-400 font-semibold text-[11px] uppercase tracking-wider">
                            <AlertCircle size={11} />
                            Error
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-1.5 text-[10px] bg-red-950/40 hover:bg-red-900/40 text-red-300 gap-1 border border-red-900/50"
                            onClick={() =>
                              handleExplainError(line.content, line.id)
                            }
                            disabled={explainingError === line.id}
                          >
                            {explainingError === line.id ? (
                              <span className="h-2 w-2 rounded-full border-2 border-red-300/30 border-t-red-300 animate-spin" />
                            ) : (
                              <Sparkles size={10} />
                            )}
                            Explain Error
                          </Button>
                        </div>
                      )}
                      <pre className="whitespace-pre-wrap break-words text-[13px]">
                        {line.content}
                      </pre>
                    </div>
                  ))}
                  <div ref={outputEndRef} />
                </div>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>

      {/* Status bar */}
      <footer className="flex-none h-6 bg-muted/10 border-t border-border flex items-center justify-between px-3 text-[10px] font-mono text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>
            {lang === "python"
              ? "Python 3.12 · Pyodide"
              : "JavaScript · Browser"}
          </span>
          {lang === "python" && !isLoading && (
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Ready
            </span>
          )}
          {lang === "javascript" && (
            <span className="flex items-center gap-1 text-sky-400">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              Ready
            </span>
          )}
        </div>
        <span>
          {snippets.length > 0
            ? snippets.length +
              " snippet" +
              (snippets.length !== 1 ? "s" : "") +
              " saved"
            : "UTF-8"}
        </span>
      </footer>
    </div>
  );
}
