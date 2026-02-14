import { Diagnostic } from "@codemirror/lint";
import { EditorView } from "@codemirror/view";
import { validateSchema } from "../json/schema_validator";
import { Hint, JsonError, TypeDefinition } from "../json/types";
import { jsonStateField } from "./json_state";

export function jsonLinter(
  schema: TypeDefinition,
  editable: "editable" | "read-only",
): (view: EditorView) => Diagnostic[] {
  function lintJson(view: EditorView): Diagnostic[] {
    const jsonState = view.state.field(jsonStateField, false);
    if (!jsonState) {
      return [];
    }

    const parseResult = jsonState.parseResult;
    if (parseResult.kind === "errors") {
      return parseResult.errors.map(errorToDiagnostic);
    }

    const validationResult = validateSchema(parseResult, schema);
    const { errors, hints: typeHints } = validationResult;
    return errors
      .map(errorToDiagnostic)
      .concat(typeHints.map((hint) => typeHintToDiagnostic(hint, editable)));
  }

  return lintJson;
}

function errorToDiagnostic(error: JsonError): Diagnostic {
  return {
    from: error.segment.start,
    to: error.segment.end,
    message: error.message,
    severity: "error",
    renderMessage: (): Node => {
      const wrapper = document.createElement("div");
      wrapper.style.fontFamily =
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
      wrapper.style.fontSize = "13px";
      wrapper.style.lineHeight = "1.5";
      wrapper.style.padding = "4px";
      wrapper.textContent = error.message;
      return wrapper;
    },
  };
}

function typeHintToDiagnostic(
  typeHint: Hint,
  editable: "editable" | "read-only",
): Diagnostic {
  return {
    from: typeHint.segment.start,
    to: typeHint.segment.end,
    message: typeHint.message,
    severity: "info",
    renderMessage: (view): Node => {
      const wrapper = document.createElement("div");
      wrapper.style.fontFamily =
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
      wrapper.style.fontSize = "13px";
      wrapper.style.lineHeight = "1.5";
      wrapper.style.padding = "4px";

      // If the message is "string", add an editable text box with the parsed value
      if (typeHint.message === "string") {
        const jsonCode = view.state.doc.toString();
        const jsonString = jsonCode.substring(
          typeHint.segment.start,
          typeHint.segment.end,
        );

        const parsedValue = JSON.parse(jsonString) as string;

        const controlsDiv = document.createElement("div");
        controlsDiv.style.marginTop = "8px";
        controlsDiv.style.display = "flex";
        controlsDiv.style.gap = "8px";
        controlsDiv.style.alignItems = "center";

        const label = document.createElement("span");
        label.textContent = "Value:";
        label.style.whiteSpace = "nowrap";
        label.style.fontWeight = "500";

        const textarea = document.createElement("textarea");
        textarea.value = parsedValue;
        textarea.rows = 1;
        const isReadOnly = editable === "read-only";
        textarea.readOnly = isReadOnly;
        textarea.style.flex = "1";
        textarea.style.padding = "4px 8px";
        textarea.style.border = "1px solid #e5e7eb";
        textarea.style.borderRadius = "4px";
        textarea.style.fontSize = "13px";
        textarea.style.fontFamily = "'JetBrains Mono', monospace";
        textarea.style.resize = "none";
        textarea.style.overflow = "auto";
        textarea.style.boxSizing = "border-box";
        if (isReadOnly) {
          textarea.style.backgroundColor = "#f9fafb";
          textarea.style.cursor = "default";
        }

        textarea.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && !e.shiftKey && !isReadOnly) {
            e.preventDefault();
            const newValue = textarea.value;
            const newJsonString = JSON.stringify(newValue);

            view.dispatch({
              changes: {
                from: typeHint.segment.start,
                to: typeHint.segment.end,
                insert: newJsonString,
              },
            });
          }
        });

        controlsDiv.appendChild(label);
        controlsDiv.appendChild(textarea);
        wrapper.appendChild(controlsDiv);
      } else {
        // Display the message for non-string types
        const messageDiv = document.createElement("div");
        messageDiv.textContent = typeHint.message;
        wrapper.appendChild(messageDiv);
      }

      return wrapper;
    },
    markClass: "",
  };
}
