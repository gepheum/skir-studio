import { autocompletion } from "@codemirror/autocomplete";
import { json } from "@codemirror/lang-json";
import { linter } from "@codemirror/lint";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { makeJsonTemplate } from "../json/to_json";
import type { Json, RecordDefinition, TypeDefinition } from "../json/types";
import { enterKeyHandler } from "./enter_key_handler";
import { jsonCompletion } from "./json_completion";
import { jsonLinter } from "./json_linter";

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
      linter(jsonLinter(schema)),
      autocompletion({
        override: [jsonCompletion(schema)],
      }),
      EditorView.theme({
        "&": {
          fontSize: "14px",
          fontFamily: "'JetBrains Mono', monospace",
        },
        ".cm-editor": {
          height: "400px",
        },
        ".cm-lintRange-info": {
          backgroundImage:
            "repeating-linear-gradient(135deg, transparent 0, transparent 2px, rgba(100, 100, 100, 0.15) 2px, rgba(100, 100, 100, 0.15) 3px)",
        },
      }),
    ],
  });
}
