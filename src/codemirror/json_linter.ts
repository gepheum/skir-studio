import { Diagnostic } from "@codemirror/lint";
import { EditorView } from "@codemirror/view";
import { Hint, JsonError } from "../json/types";
import { jsonStateField } from "./json_state";

export function jsonLinter(
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

    if (!jsonState.validationResult) {
      return [];
    }

    const { errors, hints } = jsonState.validationResult;
    return errors
      .map(errorToDiagnostic)
      .concat(hints.map((hint) => hintToDiagnostic(hint, editable)));
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
      wrapper.className = "cm-diagnostic-wrapper";
      wrapper.textContent = error.message;
      return wrapper;
    },
  };
}

function hintToDiagnostic(
  typeHint: Hint,
  editable: "editable" | "read-only",
): Diagnostic {
  const { message } = typeHint;
  const isString =
    (message === "string" || message === "string?") &&
    typeHint.valueContext &&
    typeHint.valueContext.value.kind === "literal" &&
    typeHint.valueContext.value.type === "string";
  return {
    from: typeHint.segment.start,
    to: typeHint.segment.end,
    message: "",
    severity: "info",
    renderMessage: (view): Node => {
      const wrapper = document.createElement("div");
      wrapper.className = "cm-diagnostic-wrapper";

      // If this is a type hint for a string value, add an editable text box
      // with the parsed value
      if (isString) {
        const jsonCode = view.state.doc.toString();
        const jsonString = jsonCode.substring(
          typeHint.segment.start,
          typeHint.segment.end,
        );

        const parsedValue = JSON.parse(jsonString) as string;

        const controlsDiv = document.createElement("div");
        controlsDiv.className = "cm-diagnostic-controls";

        const label = document.createElement("span");
        label.className = "cm-diagnostic-label";
        label.textContent = "Value:";

        const textarea = document.createElement("textarea");
        textarea.className = "cm-diagnostic-textarea";
        textarea.value = parsedValue;
        textarea.rows = 1;
        const isReadOnly = editable === "read-only";
        textarea.readOnly = isReadOnly;

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
        const pieces = typeof message === "string" ? [message] : message;
        for (const piece of pieces) {
          const messageDiv = document.createElement("div");
          messageDiv.className = "diagnostic-row";
          messageDiv.textContent = piece;
          wrapper.appendChild(messageDiv);
        }
      }

      return wrapper;
    },
    markClass: "",
  };
}
