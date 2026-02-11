import { Diagnostic } from "@codemirror/lint";
import { EditorView } from "@codemirror/view";
import { parseJsonValue } from "../json/json_parser";
import { validateSchema } from "../json/schema_validator";
import { Hint, JsonError, TypeDefinition } from "../json/types";

export function jsonLinter(
  schema: TypeDefinition,
): (view: EditorView) => Diagnostic[] {
  function lintJson(view: EditorView): Diagnostic[] {
    const jsonCode = view.state.doc.toString();

    const parseResult = parseJsonValue(jsonCode);
    if (parseResult.kind === "errors") {
      return parseResult.errors.map(errorToDiagnostic);
    }

    const validationResult = validateSchema(parseResult, schema);
    const { errors, hints: typeHints } = validationResult;
    return errors
      .map(errorToDiagnostic)
      .concat(typeHints.map(typeHintToDiagnostic));
  }

  return lintJson;
}

function errorToDiagnostic(error: JsonError): Diagnostic {
  return {
    from: error.segment.start,
    to: error.segment.end,
    message: error.message,
    severity: "error",
    renderMessage: () => {
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

function typeHintToDiagnostic(typeHint: Hint): Diagnostic {
  return {
    from: typeHint.segment.start,
    to: typeHint.segment.end,
    message: typeHint.message,
    severity: "info",
    renderMessage: () => {
      const wrapper = document.createElement("div");
      wrapper.style.fontFamily =
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
      wrapper.style.fontSize = "13px";
      wrapper.style.lineHeight = "1.5";
      wrapper.style.padding = "4px";
      wrapper.textContent = typeHint.message;
      return wrapper;
    },
    markClass: "",
  };
}
