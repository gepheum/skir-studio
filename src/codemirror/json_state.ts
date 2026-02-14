import { StateEffect, StateField } from "@codemirror/state";
import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { parseJsonValue } from "../json/json_parser";
import type { JsonErrors, JsonValue } from "../json/types";

export interface JsonState {
  parseResult: JsonValue | JsonErrors;
}

const updateJsonState = StateEffect.define<JsonState>();

export const jsonStateField = StateField.define<JsonState | null>({
  create() {
    return null;
  },
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(updateJsonState)) {
        return effect.value;
      }
    }
    return value;
  },
});

export function debouncedJsonParser() {
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

        update(update: ViewUpdate) {
          if (update.docChanged) {
            this.scheduleUpdate();
          }
        }

        scheduleUpdate() {
          if (this.timeout !== null) {
            clearTimeout(this.timeout);
          }
          this.timeout = window.setTimeout(() => {
            this.parseJson();
            this.timeout = null;
          }, 200);
        }

        parseJson() {
          const jsonCode = this.view.state.doc.toString();
          const parseResult = parseJsonValue(jsonCode);
          this.view.dispatch({
            effects: updateJsonState.of({ parseResult }),
          });
        }

        destroy() {
          if (this.timeout !== null) {
            clearTimeout(this.timeout);
          }
        }
      },
    ),
  ];
}
