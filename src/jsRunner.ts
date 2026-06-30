function formatArg(arg: unknown): string {
  if (arg === null) return "null";
  if (arg === undefined) return "undefined";
  if (typeof arg === "string") return arg;
  if (typeof arg === "function") return arg.toString();
  try {
    return JSON.stringify(arg, null, 2);
  } catch {
    return String(arg);
  }
}

export interface RunResult {
  stdout: string;
  stderr: string;
}

// Timeout (ms) to wait for async code to settle before collecting output
const ASYNC_TIMEOUT_MS = 5000;

export async function runJavaScript(code: string): Promise<RunResult> {
  const outLines: string[] = [];
  const errLines: string[] = [];

  const cap = {
    log: (...args: unknown[]) => outLines.push(args.map(formatArg).join(" ")),
    error: (...args: unknown[]) => errLines.push(args.map(formatArg).join(" ")),
    warn: (...args: unknown[]) =>
      outLines.push("[warn] " + args.map(formatArg).join(" ")),
    info: (...args: unknown[]) => outLines.push(args.map(formatArg).join(" ")),
    dir: (...args: unknown[]) => outLines.push(args.map(formatArg).join(" ")),
    table: (data: unknown) => outLines.push(formatArg(data)),
  };

  try {
    // Wrap the user code in an async IIFE so top-level await works,
    // then race it against a timeout to avoid hanging forever.
    // eslint-disable-next-line no-new-func
    const fn = new Function(
      "console",
      `return (async () => { ${code} })()`
    );

    const userPromise: Promise<unknown> = fn(cap);

    await Promise.race([
      userPromise,
      new Promise<void>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Timed out after ${ASYNC_TIMEOUT_MS / 1000}s`)),
          ASYNC_TIMEOUT_MS
        )
      ),
    ]);
  } catch (e: unknown) {
    errLines.push(String(e));
  }

  return {
    stdout: outLines.join("\n"),
    stderr: errLines.join("\n"),
  };
}
