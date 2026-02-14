import { CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { parseJsonValue } from "../json/json_parser";
import { validateSchema } from "../json/schema_validator";
import {
  JsonObject,
  JsonValue,
  RecordDefinition,
  Segment,
  StructDefinition,
  TypeDefinition,
} from "../json/types";

export function jsonCompletion(
  schema: TypeDefinition,
): (context: CompletionContext) => CompletionResult | null {
  // Index record definitions by record id.
  const idToRecordDef: { [id: string]: RecordDefinition } = {};
  for (const record of schema.records) {
    idToRecordDef[record.id] = record;
  }

  function doCompleteJson(
    jsonValue: JsonValue,
    position: number,
  ): CompletionResult | null {
    const { expectedType } = jsonValue;
    if (!expectedType) {
      return null;
    }
    const actualType =
      expectedType.kind === "optional" ? expectedType.value : expectedType;
    void actualType;
    switch (jsonValue.kind) {
      case "array": {
        if (expectedType.kind !== "array") {
          return null;
        }
        for (const element of jsonValue.values) {
          if (position < element.firstToken.start) {
            return null; // No need to continue (optimization)
          }
          const maybeResult = doCompleteJson(element, position);
          if (maybeResult) {
            return maybeResult;
          }
        }
        return null;
      }
      case "object": {
        if (expectedType.kind !== "record") {
          return null;
        }
        const recordDef = idToRecordDef[expectedType.value];
        if (recordDef.kind === "struct") {
          for (const keyValue of Object.values(jsonValue.keyValues)) {
            // First, see if the current position is within the key.
            if (inSegment(position, keyValue.firstToken)) {
              const missingFieldNames = collectMissingFieldNames(
                jsonValue,
                recordDef,
              );
              return {
                from: keyValue.firstToken.start + 1,
                to: keyValue.firstToken.end - 1,
                options: missingFieldNames.map((name) => ({
                  label: name,
                })),
              };
            }
            // Then, check the value.
            const maybeResult = doCompleteJson(keyValue.value, position);
            if (maybeResult) {
              return maybeResult;
            }
          }
        } else {
          const kindKv = jsonValue.keyValues["kind"];
          if (
            kindKv &&
            inSegment(position, kindKv.value.firstToken) &&
            kindKv.value.kind === "literal" &&
            kindKv.value.type === "string"
          ) {
            const options = recordDef.variants
              .filter((v) => v.type)
              .map((v) => ({
                label: v.name,
              }));
            return {
              from: kindKv.value.firstToken.start + 1,
              to: kindKv.value.firstToken.end - 1,
              options: options,
            };
          }
          const valueKv = jsonValue.keyValues["value"];
          if (valueKv) {
            const maybeResult = doCompleteJson(valueKv?.value, position);
            if (maybeResult) {
              return maybeResult;
            }
          }
        }
        return null;
      }
      case "literal": {
        if (!inSegment(position, jsonValue.firstToken)) {
          return null;
        }
        if (expectedType.kind !== "record") {
          return null;
        }
        const recordDef = idToRecordDef[expectedType.value];
        if (recordDef.kind !== "enum") {
          return null;
        }
        const options = recordDef.variants
          .filter((v) => !v.type)
          .map((v) => ({
            label: v.name,
          }))
          .concat({
            label: "UNKNOWN",
          });
        return {
          from: jsonValue.firstToken.start + 1,
          to: jsonValue.firstToken.end - 1,
          options: options,
        };
      }
    }
  }

  function completeJson(context: CompletionContext): CompletionResult | null {
    const position = context.pos;
    const jsonCode = context.state.doc.toString();

    const parseResult = parseJsonValue(jsonCode);
    if (parseResult.kind === "errors") {
      return null;
    }
    validateSchema(parseResult, schema);
    const jsonValue: JsonValue = parseResult;

    return doCompleteJson(jsonValue, position);
  }

  return completeJson;
}

function inSegment(position: number, segment: Segment): boolean {
  return position >= segment.start && position < segment.end;
}

function collectMissingFieldNames(
  object: JsonObject,
  recordDef: StructDefinition,
): string[] {
  const result: string[] = [];
  for (const field of recordDef.fields) {
    if (object.keyValues[field.name]) {
      continue;
    }
    result.push(field.name);
  }
  return result;
}
