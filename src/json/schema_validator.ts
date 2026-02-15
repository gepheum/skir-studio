import { primitiveSerializer } from "skir-client";
import { parseJsonValue } from "./json_parser";
import { toJson } from "./to_json";
import type {
  FieldDefinition,
  Hint,
  JsonError,
  JsonObject,
  JsonValue,
  MutableTypeHint,
  Path,
  PrimitiveType,
  RecordDefinition,
  TypeDefinition,
  TypeHint,
  TypeSignature,
  ValidationResult,
  VariantDefinition,
} from "./types";

export function validateSchema(
  value: JsonValue,
  schema: TypeDefinition,
): ValidationResult {
  const idToRecordDef: { [id: string]: RecordDefinition } = {};
  for (const record of schema.records) {
    idToRecordDef[record.id] = record;
  }

  const validator = new SchemaValidator(idToRecordDef);
  const root: Path = { kind: "root" };
  validator.validate(value, root, schema.type);
  const pathToTypeHint = new Map<Path, TypeHint>();
  for (const hint of validator.hints) {
    const { valueContext } = hint;
    if (valueContext) {
      pathToTypeHint.set(valueContext.path, hint);
    }
  }
  return {
    errors: validator.errors,
    hints: validator.hints,
    rootTypeHint: validator.rootTypeHint,
    pathToTypeHint: pathToTypeHint,
  };
}

export function validateOrThrowError(
  jsonCode: string,
  schema: TypeDefinition,
): void {
  // TODO: show line/col numbers in error messages instead of position

  const parseResult = parseJsonValue(jsonCode);
  if (parseResult.kind === "errors") {
    const firstError = parseResult.errors[0];
    const { message, segment } = firstError;
    throw new Error(`JSON parsing error at ${segment.start}: ${message}`);
  }

  const validationResult = validateSchema(parseResult, schema);
  const { errors } = validationResult;
  if (errors.length) {
    const firstError = errors[0];
    const { message, segment } = firstError;
    throw new Error(`Schema validation error at ${segment.start}: ${message}`);
  }
}

class SchemaValidator {
  constructor(readonly idToRecordDef: { [id: string]: RecordDefinition }) {}
  readonly errors: JsonError[] = [];
  readonly hints: Hint[] = [];
  private readonly typeHintStack: MutableTypeHint[] = [];
  rootTypeHint: TypeHint | undefined;

  validate(value: JsonValue, path: Path, schema: TypeSignature): void {
    const { idToRecordDef, typeHintStack } = this;
    value.expectedType = schema;
    // For every call to pushTypeHint() there emust be one call to typeHintStack.pop()
    const pushTypeHint = (): void => {
      const typeDesc = getTypeDesc(schema);
      const typeDoc = getTypeDoc(schema, idToRecordDef);
      const message = [typeDesc];
      if (typeDoc) {
        message.push(typeDoc);
      }
      if (value.kind === "array") {
        const { length } = value.values;
        if (length) {
          message.push(`Length: ${length}`);
        }
      }
      const hint: MutableTypeHint = {
        segment: value.firstToken,
        message: message.length === 1 ? message[0] : message,
        valueContext: { value, path },
        childHints: [],
      };
      if (typeHintStack.length) {
        const topOfStack = typeHintStack[typeHintStack.length - 1];
        topOfStack.childHints.push(hint);
      } else {
        this.rootTypeHint = hint;
      }
      this.hints.push(hint);
      typeHintStack.push(hint);
    };
    switch (schema.kind) {
      case "array": {
        if (value.kind === "array") {
          pushTypeHint();
          for (const [index, item] of value.values.entries()) {
            const { key_extractor: keyExtractor, item: itemSchema } =
              schema.value;
            const itemKey = extractItemKey(item, keyExtractor);
            const itemPath: Path = {
              kind: "array-item",
              index: index,
              key: itemKey,
              arrayPath: path,
            };
            this.validate(item, itemPath, itemSchema);
          }
          typeHintStack.pop();
        } else {
          this.errors.push({
            kind: "error",
            segment: value.segment,
            message: "Expected: array",
          });
        }
        break;
      }
      case "optional": {
        if (value.kind === "literal" && value.jsonCode === "null") {
          pushTypeHint();
          typeHintStack.pop();
        } else {
          this.validate(value, path, schema.value);
        }
        break;
      }
      case "primitive": {
        const primitiveType = schema.value;
        if (hasPrimitiveType(value, primitiveType)) {
          pushTypeHint();
          typeHintStack.pop();
        } else {
          this.errors.push({
            kind: "error",
            segment: value.firstToken,
            message: `Expected: ${primitiveType}`,
          });
        }
        break;
      }
      case "record": {
        const recordDef = idToRecordDef[schema.value];
        if (recordDef.kind === "struct") {
          const nameToFieldDef: { [name: string]: FieldDefinition } = {};
          recordDef.fields.forEach((field) => {
            nameToFieldDef[field.name] = field;
          });
          if (value.kind === "object") {
            pushTypeHint();
            for (const keyValue of Object.values(value.keyValues)) {
              const { key, value } = keyValue;
              const fieldDef = nameToFieldDef[key];
              if (fieldDef) {
                if (fieldDef.doc) {
                  this.hints.push({
                    segment: keyValue.firstToken,
                    message: fieldDef.doc,
                  });
                }
                const valuePath: Path = {
                  kind: "field-value",
                  fieldName: key,
                  structPath: path,
                };
                this.validate(value, valuePath, fieldDef.type!);
              } else {
                this.errors.push({
                  kind: "error",
                  segment: keyValue.firstToken,
                  message: "Unknown field",
                });
              }
            }
            typeHintStack.pop();
          } else {
            this.errors.push({
              kind: "error",
              segment: value.firstToken,
              message: "Expected: object",
            });
          }
        } else {
          // Enum
          const nameToVariantDef: { [name: string]: VariantDefinition } = {};
          recordDef.variants.forEach((variant) => {
            nameToVariantDef[variant.name] = variant;
          });
          if (value.kind === "object") {
            pushTypeHint();
            this.validateEnumObject(value, path, nameToVariantDef);
            typeHintStack.pop();
          } else if (value.kind === "literal" && value.type === "string") {
            const name = JSON.parse(value.jsonCode);
            const fieldDef = nameToVariantDef[name];
            if (name === "UNKNOWN" || fieldDef) {
              pushTypeHint();
              typeHintStack.pop();
            } else {
              this.errors.push({
                kind: "error",
                segment: value.segment,
                message: "Unknown enumerator",
              });
            }
          } else {
            this.errors.push({
              kind: "error",
              segment: value.firstToken,
              message: "Expected: object or string",
            });
          }
        }
        break;
      }
      default: {
        const _: never = schema;
        throw new Error(_);
      }
    }
  }

  validateEnumObject(
    object: JsonObject,
    enumPath: Path,
    nameToVariantDef: { [name: string]: VariantDefinition },
  ): void {
    const kindKv = object.keyValues["kind"];
    if (!kindKv) {
      this.errors.push({
        kind: "error",
        segment: object.segment,
        message: "Missing: 'kind'",
      });
      return;
    }
    if (kindKv.value.kind !== "literal" || kindKv.value.type !== "string") {
      this.errors.push({
        kind: "error",
        segment: kindKv.value.firstToken,
        message: "Expected: string",
      });
      return;
    }
    const kind: string = JSON.parse(kindKv.value.jsonCode);
    if (kind !== kind.toLowerCase()) {
      this.errors.push({
        kind: "error",
        segment: kindKv.value.segment,
        message: "Expected: lowercase enumerator",
      });
      return;
    }
    const variantDef = nameToVariantDef[kind];
    if (!variantDef) {
      this.errors.push({
        kind: "error",
        segment: kindKv.value.segment,
        message: "Unknown enumerator",
      });
      return;
    }
    const valueKv = object.keyValues["value"];
    if (!valueKv) {
      this.errors.push({
        kind: "error",
        segment: object.segment,
        message: "Missing: 'value'",
      });
      return;
    }
    const path: Path = {
      kind: "variant-value",
      variantName: variantDef.name,
      enumPath: enumPath,
    };
    this.validate(valueKv.value, path, variantDef.type!);
  }
}

function extractItemKey(
  item: JsonValue,
  keyExtractor: string | undefined,
): string | null {
  if (keyExtractor === undefined) {
    return null;
  }
  const pieces = keyExtractor.split(".");
  let value = item;
  for (const piece of pieces) {
    if (value.kind !== "object") {
      // Error
      return null;
    }
    const kv = value.keyValues[piece];
    if (!kv) {
      // Error
      return null;
    }
    value = kv.value;
  }
  switch (item.kind) {
    case "literal": {
      switch (item.type) {
        case "string":
        case "number":
        case "boolean":
          return item.jsonCode;
      }
      // Error
      return null;
    }
    case "object": {
      const kv = item.keyValues["unix_millis"];
      if (kv && kv.value.kind === "literal" && kv.value.type === "number") {
        return kv.value.jsonCode;
      } else {
        // Error
        return null;
      }
    }
    case "array": {
      // Error
      return null;
    }
  }
}

function hasPrimitiveType(
  value: JsonValue,
  expectedType: PrimitiveType,
): boolean {
  switch (expectedType) {
    case "bool":
      return value.kind === "literal" && value.type === "boolean";
    case "int32": {
      return isInteger(value, -2147483648n, 2147483647n);
    }
    case "int64": {
      return isInteger(value, -9223372036854775808n, 9223372036854775807n);
    }
    case "hash64": {
      return isInteger(value, 0n, 18446744073709551615n);
    }
    case "timestamp": {
      try {
        primitiveSerializer("timestamp").fromJson(toJson(value));
        return true;
      } catch {
        return false;
      }
    }
    case "float32":
    case "float64": {
      return isFloat(value);
    }
    case "string": {
      return value.kind === "literal" && value.type === "string";
    }
    case "bytes": {
      if (value.kind !== "literal") {
        return false;
      }
      try {
        primitiveSerializer("bytes").fromJsonCode(value.jsonCode);
        return true;
      } catch {
        return false;
      }
    }
  }
}

function isInteger(value: JsonValue, min: bigint, max: bigint): boolean {
  if (value.kind !== "literal") {
    return false;
  }
  let decimalRep: string;
  if (value.type === "string") {
    decimalRep = JSON.parse(value.jsonCode);
  } else if (value.type === "number") {
    decimalRep = value.jsonCode;
  } else {
    return false;
  }
  let int: bigint;
  try {
    int = BigInt(decimalRep);
  } catch {
    return false;
  }
  return min <= int && int <= max;
}

function isFloat(value: JsonValue): boolean {
  if (value.kind !== "literal") {
    return false;
  }
  if (value.type === "number") {
    return true;
  } else if (value.type === "string") {
    try {
      primitiveSerializer("float64").fromJsonCode(value.jsonCode);
      return true;
    } catch {
      return false;
    }
  } else {
    return false;
  }
}

function getTypeDesc(type: TypeSignature): string {
  function getTypePart(type: TypeSignature): string {
    switch (type.kind) {
      case "primitive":
        return type.value;
      case "array":
        return `[${getTypePart(type.value.item)}]`;
      case "optional":
        return `${getTypePart(type.value)}?`;
      case "record": {
        const recordId = type.value;
        return recordId.split(":")[1];
      }
    }
  }
  function getModulePart(type: TypeSignature): string | null {
    switch (type.kind) {
      case "primitive":
        return null;
      case "array":
        return getModulePart(type.value.item);
      case "optional":
        return getModulePart(type.value);
      case "record": {
        const recordId = type.value;
        return recordId.split(":")[0];
      }
    }
  }
  const typePart = getTypePart(type);
  const modulePart = getModulePart(type);
  return modulePart ? `${typePart} (${modulePart})` : typePart;
}

function getTypeDoc(
  type: TypeSignature,
  idToRecordDef: Readonly<{ [id: string]: RecordDefinition }>,
): string | undefined {
  switch (type.kind) {
    case "primitive":
      return undefined;
    case "array":
      return getTypeDoc(type.value.item, idToRecordDef);
    case "optional":
      return getTypeDoc(type.value, idToRecordDef);
    case "record": {
      const recordId = type.value;
      const recordDef = idToRecordDef[recordId]!;
      return recordDef.doc;
    }
  }
}
