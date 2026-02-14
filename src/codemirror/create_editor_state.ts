import { autocompletion } from "@codemirror/autocomplete";
import { json } from "@codemirror/lang-json";
import { linter, lintGutter } from "@codemirror/lint";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { makeJsonTemplate } from "../json/to_json";
import type { Json, RecordDefinition, TypeDefinition } from "../json/types";
import { enterKeyHandler } from "./enter_key_handler";
import { jsonCompletion } from "./json_completion";
import { jsonLinter } from "./json_linter";
import { statusBar } from "./status_bar";

export function createReqEditorState(schema: TypeDefinition): EditorState {
  const idToRecordDef: { [id: string]: RecordDefinition } = {};
  for (const record of schema.records) {
    idToRecordDef[record.id] = record;
  }
  const jsonTemplate = makeJsonTemplate(schema.type, idToRecordDef);
  return createEditorState(schema, jsonTemplate, "editable");
}

export function createRespEditorState(
  respJson: Json,
  schema: TypeDefinition,
): EditorState {
  return createEditorState(schema, respJson, "read-only");
}

function createEditorState(
  schema: TypeDefinition,
  content: Json,
  editable: "editable" | "read-only",
): EditorState {
  return EditorState.create({
    doc: JSON.stringify(content, null, 2),
    extensions: [
      EditorState.readOnly.of(editable === "read-only"),
      enterKeyHandler(schema),
      basicSetup,
      json(),
      linter(jsonLinter(schema, editable)),
      autocompletion({
        override: [jsonCompletion(schema)],
      }),
      lintGutter(),
      statusBar(),
      EditorView.theme({
        "&": {
          fontSize: "14px",
        },
        ".cm-scroller": {
          fontFamily: "'JetBrains Mono', monospace",
        },
        ".cm-editor": {
          height: "400px",
        },
        ".cm-lintRange-info": {
          backgroundColor: "#f6f6f6",
          backgroundImage: "none",
        },
        ".cm-lintRange-error": {
          backgroundImage: "none",
          borderBottom: "3px solid #dc2626",
        },
      }),
      EditorView.baseTheme({
        ".cm-lint-marker-info": {
          display: "none",
        },
        ".cm-tooltip-hover": {
          backgroundColor: "white",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "8px 12px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          fontSize: "13px",
          lineHeight: "1.5",
        },
        ".cm-tooltip.cm-tooltip-lint": {
          backgroundColor: "white",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "8px 12px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
        },
        ".cm-tooltip-lint .cm-diagnostic": {
          padding: "0",
          borderTop: "none",
          borderLeft: "none",
        },
        ".cm-tooltip-lint .cm-diagnostic-error": {
          borderLeft: "none",
          fontWeight: "bold",
        },
        ".cm-tooltip-lint .cm-diagnostic-info": {
          borderLeft: "none",
        },
      }),
    ],
  });
}
