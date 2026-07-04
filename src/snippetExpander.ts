import { snippet } from "@codemirror/autocomplete";
import { keymap } from "@codemirror/view";
import type { EditorView } from "@codemirror/view";
import type { SnippetDef } from "./snippets";

/**
 * Build a CodeMirror `keymap` extension that expands snippet triggers on Enter.
 *
 * When the user presses Enter:
 *  1. We read the word immediately before the cursor.
 *  2. If it exactly matches a snippet trigger, we delete that trigger and apply
 *     the snippet template (with proper tab-stop support from CodeMirror).
 *  3. Otherwise we return false, letting the default Enter handler run.
 */
export function buildEnterSnippetKeymap(snippetDefs: SnippetDef[]) {
  // Build a fast lookup: trigger → template
  const lookup = new Map<string, string>(
    snippetDefs.map((s) => [s.trigger, s.template]),
  );

  return keymap.of([
    {
      key: "Enter",
      run(view: EditorView) {
        const state = view.state;
        const { from: selFrom, to: selTo } = state.selection.main;

        // Only handle single-cursor (no selection)
        if (selFrom !== selTo) return false;

        // Read the "word" token before the cursor (allow letters, digits, _)
        const lineBefore = state.doc.sliceString(
          state.doc.lineAt(selFrom).from,
          selFrom,
        );
        const match = lineBefore.match(/(\w+)$/);
        if (!match) return false;

        const trigger = match[1];
        const template = lookup.get(trigger);
        if (!template) return false;

        // Delete the trigger text
        const triggerStart = selFrom - trigger.length;
        view.dispatch({
          changes: { from: triggerStart, to: selFrom, insert: "" },
        });

        // Use CodeMirror's snippet() — correct call signature:
        // snippet(template)(view, completion, from, to)
        const expand = snippet(template);
        expand(view, null as any, triggerStart, triggerStart);

        return true;
      },
    },
  ]);
}
