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
import { debouncedJsonParser } from "./json_state";
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
      debouncedJsonParser(schema),
      linter(jsonLinter(editable)),
      autocompletion({
        override: [jsonCompletion(schema)],
      }),
      lintGutter(),
      statusBar(),
      EditorView.theme({
        "&": {
          fontSize: "14px",
          height: "100%",
        },
        ".cm-scroller": {
          fontFamily: "'JetBrains Mono', monospace",
          overflow: "auto",
        },
        ".cm-lintRange-info": {
          backgroundColor: "#f6f6f6",
          backgroundImage: "none",
        },
        ".cm-lintRange-error": {
          backgroundImage: "none",
          borderBottom: "3px solid #dc2626",
        },
        ".cm-tooltip-hover": {
          backgroundColor: "#1f2937",
          border: "1px solid #374151",
          borderRadius: "4px",
          padding: "4px 8px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          fontSize: "12px",
          lineHeight: "1.3",
          color: "white",
        },
        ".cm-tooltip.cm-tooltip-lint": {
          backgroundColor: "#1f2937",
          border: "1px solid #374151",
          borderRadius: "4px",
          padding: "4px 8px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
          color: "white",
        },
        ".cm-tooltip-lint .cm-diagnostic": {
          color: "white",
        },
        ".cm-tooltip-lint .cm-diagnostic-error": {
          color: "white",
        },
        ".cm-tooltip-lint .cm-diagnostic-info": {
          color: "white",
        },
      }),
      EditorView.baseTheme({
        ".cm-lint-marker-info": {
          display: "none",
        },
        ".cm-status-bar": {
          display: "flex",
          flexDirection: "row-reverse",
          justifyContent: "flex-end",
          padding: "4px 12px",
          backgroundColor: "#f3f4f6",
          borderTop: "1px solid #e5e7eb",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontSize: "12px",
          color: "#6b7280",
          height: "16px",
        },
        ".cm-status-bar-link": {
          textDecoration: "none",
          cursor: "pointer",
        },
        ".cm-status-bar-link:hover": {
          textDecoration: "underline",
        },
        ".cm-status-bar-link:hover ~ .cm-status-bar-link": {
          textDecoration: "underline",
        },
        ".cm-diagnostic-wrapper": {
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          fontSize: "12px",
          lineHeight: "1.3",
          padding: "2px",
          color: "white",
        },
        ".cm-diagnostic-controls": {
          marginTop: "4px",
          display: "flex",
          gap: "6px",
          alignItems: "center",
        },
        ".cm-diagnostic-label": {
          whiteSpace: "nowrap",
          fontWeight: "500",
        },
        ".cm-diagnostic-textarea": {
          flex: "1",
          padding: "3px 6px",
          border: "1px solid #4b5563",
          borderRadius: "3px",
          fontSize: "12px",
          fontFamily: "'JetBrains Mono', monospace",
          resize: "none",
          overflow: "auto",
          boxSizing: "border-box",
          backgroundColor: "#1f2937",
          color: "white",
        },
        ".cm-diagnostic-textarea[readonly]": {
          backgroundColor: "#374151",
          cursor: "default",
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
