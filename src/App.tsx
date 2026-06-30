import { useEffect, useState, useRef, useCallback } from "react";
import CodeMirror, { keymap, ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { autocompletion } from "@codemirror/autocomplete";
import { defaultKeymap } from "@codemirror/commands";
import { errorHighlighter, errorLineTheme, setErrorLine } from "./errorHighlighter";
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
import { explainErrorAI } from "./aiService";
import {
  getSnippets,
  saveSnippet,
  deleteSnippet,
  type Language,
  type Snippet,
} from "./snippetStore";
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
  const [explainingError, setExplainingError] = useState<string | null>(null);
  
  const { settings, updateSettings } = useSettings();

  const outputEndRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef({ python: PY_STARTER, javascript: JS_STARTER });
  const saveInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  const clearErrorHighlight = useCallback(() => {
    const view = editorRef.current?.view;
    if (view) view.dispatch({ effects: setErrorLine.of(null) });
  }, []);

  const highlightErrorLine = useCallback((errorStr: string, isPython: boolean) => {
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
  }, []);

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

  const handleExplainError = useCallback(async (errorText: string, lineId: string) => {
    if (explainingError) return;
    setExplainingError(lineId);
    try {
      const explanation = await explainErrorAI(errorText, codeRef.current[lang], settings);
      push(`\n✨ AI Explanation:\n${explanation}`, "system");
    } catch (e: any) {
      push(`\n✨ AI Explanation failed: ${e.message}`, "system");
    } finally {
      setExplainingError(null);
    }
  }, [explainingError, settings, lang, push]);

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
              }
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
        const errStr = String(e);
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

  const extensions = [
    lang === "python"
      ? python()
      : javascript({ jsx: false, typescript: false }),
    autocompletion({
      override: [lang === "python" ? pythonCompletions : jsCompletions],
      activateOnTyping: true,
    }),
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
      <header className="flex-none h-13 border-b border-border flex items-center justify-between px-3 bg-card gap-2 flex-wrap">
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-7 w-7 rounded bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
            <TerminalSquare size={14} />
          </div>
          <span className="font-semibold text-xs tracking-widest hidden sm:block">
            PLAYGROUND
          </span>
        </div>

        {/* Language tabs */}
        <div className="flex items-center gap-1 bg-muted/40 rounded-md p-0.5 border border-border/50">
          <button
            onClick={() => setLang("python")}
            data-testid="tab-python"
            className={
              "px-3 py-1 rounded text-xs font-medium transition-all " +
              (lang === "python"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            Python
          </button>
          <button
            onClick={() => setLang("javascript")}
            data-testid="tab-javascript"
            className={
              "px-3 py-1 rounded text-xs font-medium transition-all " +
              (lang === "javascript"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground")
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

          {/* Settings */}
          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-border/50 bg-muted/30 ml-2"
                title="Settings"
              >
                <SettingsIcon size={14} />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Settings</DialogTitle>
                <DialogDescription>
                  Configure AI providers for error explanations and autocomplete.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold">AI Provider</label>
                  <Select
                    value={settings.aiProvider}
                    onValueChange={(val: any) => updateSettings({ aiProvider: val })}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini" className="text-xs">Google Gemini</SelectItem>
                      <SelectItem value="groq" className="text-xs">Groq (Llama 3)</SelectItem>
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
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 h-8 shadow-md shadow-primary/20 transition-all active:scale-95"
                >
                  {isRunning ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                      Running
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Play size={12} fill="currentColor" />
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
          <ResizablePanel defaultSize={50} minSize={20} className="flex flex-col min-w-0 border-r border-border">
            <div className="flex-none flex items-center justify-between px-3 h-8 bg-muted/20 border-b border-border text-xs font-mono text-muted-foreground">
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

          <ResizableHandle withHandle />

          {/* Output */}
          <ResizablePanel defaultSize={50} minSize={20} className="flex flex-col min-w-0 bg-card">
            <div className="flex-none flex items-center justify-between px-3 h-8 bg-muted/20 border-b border-border text-xs">
              <span className="font-mono text-muted-foreground font-medium uppercase tracking-wider">
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
                            onClick={() => handleExplainError(line.content, line.id)}
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
