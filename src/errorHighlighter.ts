import { StateField, StateEffect } from "@codemirror/state";
import { EditorView, Decoration, DecorationSet } from "@codemirror/view";

// Effect to dispatch when we want to highlight an error
export const setErrorLine = StateEffect.define<number | null>();

// The decoration to apply to the error line
const errorLineMark = Decoration.line({
  attributes: { class: "cm-errorLine" },
});

// A state field that stores the current error line (if any) and provides decorations
export const errorHighlighter = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(errorLines, tr) {
    errorLines = errorLines.map(tr.changes);

    for (const e of tr.effects) {
      if (e.is(setErrorLine)) {
        if (e.value === null) {
          return Decoration.none; // Clear error
        }
        const line = tr.state.doc.line(Math.min(e.value, tr.state.doc.lines));
        return Decoration.set([errorLineMark.range(line.from)]);
      }
    }

    return errorLines;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// CSS for the error line
export const errorLineTheme = EditorView.theme({
  ".cm-errorLine": {
    backgroundColor: "rgba(239, 68, 68, 0.2) !important", // Tailwind red-500 with opacity
  },
});
