import { Extension, StateEffect, StateField } from "@codemirror/state";
import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { parseJsonValue } from "../json/json_parser";
import { validateSchema } from "../json/schema_validator";
import type {
  JsonParseResult,
  TypeDefinition,
  ValidationResult,
} from "../json/types";

export interface JsonState {
  parseResult: JsonParseResult;
  validationResult?: ValidationResult;
}

const updateJsonState = StateEffect.define<JsonState>();

export const jsonStateField = StateField.define<JsonState | null>({
  create(): JsonState | null {
    return null;
  },
  update(value, tr): JsonState | null {
    for (const effect of tr.effects) {
      if (effect.is(updateJsonState)) {
        return effect.value;
      }
    }
    return value;
  },
});

/**
 * Ensures the JSON state is up-to-date with the current document.
 * If the state is stale or missing, triggers an immediate parse and returns the updated state.
 */
export function ensureJsonState(
  view: EditorView,
  schema: TypeDefinition,
): JsonState {
  const currentState = view.state.field(jsonStateField, false);
  const jsonCode = view.state.doc.toString();

  // Parse and validate immediately
  const parseResult = parseJsonValue(jsonCode);
  let validationResult;
  if (parseResult.value) {
    validationResult = validateSchema(parseResult.value, schema);
  }

  const newState: JsonState = { parseResult, validationResult };

  // Update the state if it's different
  if (!currentState || currentState !== newState) {
    view.dispatch({
      effects: updateJsonState.of(newState),
    });
  }

  return newState;
}

export function debouncedJsonParser(schema: TypeDefinition): Extension[] {
  return [
    jsonStateField,
    ViewPlugin.fromClass(
      class {
        timeout: number | null = null;
        view: EditorView;

        constructor(view: EditorView) {
          this.view = view;
          this.scheduleUpdate();
        }

        update(update: ViewUpdate): void {
          if (update.docChanged) {
            this.scheduleUpdate();
          }
        }

        scheduleUpdate(): void {
          if (this.timeout !== null) {
            clearTimeout(this.timeout);
          }
          this.timeout = window.setTimeout(() => {
            this.parseJson();
            this.timeout = null;
          }, 200);
        }

        parseJson(): void {
          const jsonCode = this.view.state.doc.toString();
          const parseResult = parseJsonValue(jsonCode);

          let validationResult;
          if (parseResult.value) {
            validationResult = validateSchema(parseResult.value, schema);
          }

          this.view.dispatch({
            effects: updateJsonState.of({ parseResult, validationResult }),
          });
        }

        destroy(): void {
          if (this.timeout !== null) {
            clearTimeout(this.timeout);
          }
        }
      },
    ),
  ];
}
