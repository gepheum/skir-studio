import { EditorView, Panel, showPanel } from "@codemirror/view";

function createStatusBarPanel(view: EditorView): Panel {
  const dom = document.createElement("div");
  dom.className = "cm-status-bar";
  dom.style.display = "flex";
  dom.style.justifyContent = "flex-end";
  dom.style.padding = "4px 12px";
  dom.style.backgroundColor = "#f3f4f6";
  dom.style.borderTop = "1px solid #e5e7eb";
  dom.style.fontFamily =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  dom.style.fontSize = "12px";
  dom.style.color = "#6b7280";

  function updateCursor(): void {
    const pos = view.state.selection.main.head;
    const line = view.state.doc.lineAt(pos);
    const lineNumber = line.number;
    const column = pos - line.from + 1;
    dom.textContent = `Ln ${lineNumber}, Col ${column}`;
  }

  updateCursor();

  return {
    dom,
    update(update): void {
      if (update.selectionSet) {
        updateCursor();
      }
    },
    top: false,
  };
}

export function statusBar(): ReturnType<typeof showPanel.of> {
  return showPanel.of(createStatusBarPanel);
}
