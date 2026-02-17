import { autocompletion } from "@codemirror/autocomplete";
import { json } from "@codemirror/lang-json";
import { linter, lintGutter } from "@codemirror/lint";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { tokyoNight } from "@uiw/codemirror-theme-tokyo-night";
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
  // Tokyo Night theme colors
  // TODO: make this a parameter of the exported
  const theme = {
    background: "#1a1b26",
    lighterBg: "#1f2335",
    border: "#414868",
    foreground: "#c0caf5",
    accent: "#7aa2f7",
    error: "#f7768e",
    selection: "#515c7e40",
  };

  return EditorState.create({
    doc: JSON.stringify(content, null, 2),
    extensions: [
      EditorState.readOnly.of(editable === "read-only"),
      enterKeyHandler(schema),
      basicSetup,
      tokyoNight,
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
          backgroundImage: "none",
        },
        ".cm-lintRange-info:hover": {
          backgroundColor: theme.selection,
        },
        ".cm-lintRange-error": {
          backgroundImage: "none",
          borderBottom: `3px solid ${theme.error}`,
        },
        ".cm-tooltip-hover": {
          backgroundColor: theme.lighterBg,
          border: `1px solid ${theme.border}`,
          borderRadius: "4px",
          padding: "8px 12px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
          fontSize: "14px",
          lineHeight: "1.4",
          color: theme.foreground,
        },
        ".cm-tooltip.cm-tooltip-lint": {
          backgroundColor: theme.lighterBg,
          border: `1px solid ${theme.border}`,
          borderRadius: "4px",
          padding: "8px 12px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
          fontSize: "14px", // Ensure consistency
          color: theme.foreground,
        },
        ".cm-tooltip-lint .cm-diagnostic-error": {
          fontWeight: "bold",
          color: theme.error,
        },
        ".cm-status-bar": {
          backgroundColor: theme.lighterBg,
          borderTopColor: theme.border,
          color: theme.accent,
        },
        ".cm-diagnostic-textarea": {
          backgroundColor: theme.lighterBg,
          borderColor: theme.border,
          color: theme.foreground,
        },
        ".cm-diagnostic-textarea[readonly]": {
          backgroundColor: theme.background,
        },
        ".cm-diagnostic-input": {
          backgroundColor: theme.lighterBg,
          borderColor: theme.border,
          color: theme.foreground,
        },
        ".cm-diagnostic-button": {
          backgroundColor: theme.lighterBg,
          borderColor: theme.border,
          color: theme.foreground,
        },
        ".cm-diagnostic-button:hover": {
          backgroundColor: theme.border,
        },
        ".cm-diagnostic-error-message": {
          color: theme.error,
        },
        ".diagnostic-row + .diagnostic-row": {
          borderTopColor: theme.border,
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
          borderTop: "1px solid",
          fontSize: "12px",
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
          fontSize: "12px",
          lineHeight: "1.3",
          padding: "2px",
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
          minWidth: "64px",
        },
        ".cm-diagnostic-textarea": {
          flex: "1",
          padding: "3px 6px",
          border: "1px solid",
          borderRadius: "3px",
          fontSize: "12px",
          fontFamily: "'JetBrains Mono', monospace",
          resize: "none",
          overflow: "auto",
          boxSizing: "border-box",
        },
        ".cm-diagnostic-textarea[readonly]": {
          cursor: "default",
        },
        ".cm-diagnostic-input": {
          padding: "3px 6px",
          border: "1px solid",
          borderRadius: "3px",
          fontSize: "12px",
          fontFamily: "'JetBrains Mono', monospace",
          boxSizing: "border-box",
          width: "100%",
        },
        ".cm-diagnostic-button": {
          padding: "3px 12px",
          border: "1px solid",
          borderRadius: "3px",
          fontSize: "12px",
          fontFamily: "'JetBrains Mono', monospace",
          cursor: "pointer",
          boxSizing: "border-box",
        },
        ".cm-diagnostic-button:active": {
          transform: "translateY(1px)",
        },
        ".cm-diagnostic-error-message": {
          fontSize: "11px",
          marginTop: "2px",
          fontWeight: "500",
        },
        ".cm-timestamp-field": {
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          flex: "1",
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
        ".diagnostic-row + .diagnostic-row": {
          marginTop: "8px",
          paddingTop: "8px",
          borderTop: "1px solid",
        },
      }),
    ],
  });
}
