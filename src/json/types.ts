// To use instead of `any`
export type Json =
  | null
  | boolean
  | number
  | string
  | readonly Json[]
  | Readonly<{ [name: string]: Json }>;

// -----------------------------------------------------------------------------
// ERRORS
// -----------------------------------------------------------------------------

export interface JsonError {
  kind: "error";
  segment: Segment;
  message: string;
}

export interface JsonErrors {
  kind: "errors";
  errors: JsonError[];
}

// -----------------------------------------------------------------------------
// PARSING
// -----------------------------------------------------------------------------

export type JsonValue = JsonArray | JsonObject | JsonLiteral;

export interface JsonArray {
  kind: "array";
  segment: Segment;
  values: JsonValue[];
  expectedType?: TypeSignature;
}

export interface JsonKeyValue {
  /// For the key.
  segment: Segment;
  key: string;
  value: JsonValue;
  expectedType?: TypeSignature;
}

export interface JsonObject {
  kind: "object";
  segment: Segment;
  keyValues: { [key: string]: JsonKeyValue };
  expectedType?: TypeSignature;
}

export interface JsonLiteral {
  kind: "literal";
  segment: Segment;
  jsonCode: string;
  type: "boolean" | "null" | "number" | "string";
  expectedType?: TypeSignature;
}

export interface Segment {
  start: number;
  end: number;
}

// -----------------------------------------------------------------------------
// SCHEMA
// -----------------------------------------------------------------------------

/** JSON representation of a `TypeDescriptor`. */
export type TypeDefinition = {
  type: TypeSignature;
  records: readonly RecordDefinition[];
};

/** A type in the JSON representation of a `TypeDescriptor`. */
export type TypeSignature =
  | {
      kind: "optional";
      value: TypeSignature;
    }
  | ArrayTypeSignature
  | RecordTypeSignature
  | {
      kind: "primitive";
      value: PrimitiveType;
    };

export interface ArrayTypeSignature {
  kind: "array";
  value: {
    item: TypeSignature;
    key_extractor?: string;
  };
}

export interface RecordTypeSignature {
  kind: "record";
  value: string;
}

export type PrimitiveType =
  | "bool"
  | "int32"
  | "int64"
  | "hash64"
  | "float32"
  | "float64"
  | "timestamp"
  | "string"
  | "bytes";

export type RecordDefinition = StructDefinition | EnumDefinition;

/** Definition of a struct in the JSON representation of a `TypeDescriptor`. */
export type StructDefinition = {
  kind: "struct";
  id: string;
  doc?: string;
  fields: readonly FieldDefinition[];
  removed_numbers?: readonly number[];
};

/**
 * Definition of a struct field in the JSON representation of a
 * `TypeDescriptor`.
 */
export type FieldDefinition = {
  name: string;
  type: TypeSignature;
  number: number;
  doc?: string;
};

/** Definition of an enum in the JSON representation of a `TypeDescriptor`. */
export type EnumDefinition = {
  kind: "enum";
  id: string;
  doc?: string;
  variants: readonly VariantDefinition[];
  removed_numbers?: readonly number[];
};

/**
 * Definition of an enum variant in the JSON representation of a
 * `TypeDescriptor`.
 */
export type VariantDefinition = {
  name: string;
  type?: TypeSignature;
  number: number;
  doc?: string;
};

// -----------------------------------------------------------------------------
// SCHEMA VALIDATION
// -----------------------------------------------------------------------------

export interface Hint {
  segment: Segment;
  message: string;
}

export interface ValidationResult {
  errors: JsonError[];
  hints: Hint[];
}
