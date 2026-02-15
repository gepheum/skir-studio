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
  readonly kind: "error";
  readonly segment: Segment;
  readonly message: string;
}

export interface JsonErrors {
  readonly kind: "errors";
  readonly errors: JsonError[];
}

// -----------------------------------------------------------------------------
// PARSING
// -----------------------------------------------------------------------------

export type JsonValue = JsonArray | JsonObject | JsonLiteral;

export interface JsonArray {
  readonly kind: "array";
  /// Position of the '[' token.
  readonly firstToken: Segment;
  /// From '[' to ']' included.
  readonly segment: Segment;
  readonly values: JsonValue[];
  expectedType?: TypeSignature;
}

export interface JsonKeyValue {
  /// For the key.
  readonly firstToken: Segment;
  readonly key: string;
  readonly value: JsonValue;
  expectedType?: TypeSignature;
}

export interface JsonObject {
  readonly kind: "object";
  /// Position of the '{' token.
  readonly firstToken: Segment;
  /// From '{' to '}' included.
  readonly segment: Segment;
  readonly keyValues: { [key: string]: JsonKeyValue };
  expectedType?: TypeSignature;
}

export interface JsonLiteral {
  readonly kind: "literal";
  /// Position of the first and only token. Same as 'segment'.
  readonly firstToken: Segment;
  readonly segment: Segment;
  readonly jsonCode: string;
  readonly type: "boolean" | "null" | "number" | "string";
  expectedType?: TypeSignature;
}

export interface Segment {
  readonly start: number;
  readonly end: number;
}

/// Path to a sub-value within a valid Skir value.
export type Path =
  | {
      readonly kind: "root";
    }
  | {
      readonly kind: "field-value";
      /// Name of the field of the struct
      readonly fieldName: string;
      /// Path to the struct value
      readonly structPath: Path;
    }
  | {
      readonly kind: "variant-value";
      /// Name of the wrapper variant of the enum
      readonly variantName: string;
      /// Path to the enum value
      readonly enumPath: Path;
    }
  | {
      readonly kind: "array-item";
      readonly index: number;
      readonly key: string | null;
      readonly arrayPath: Path;
    };

export interface JsonValueContext {
  readonly value: JsonValue;
  readonly path: Path;
}

// -----------------------------------------------------------------------------
// SCHEMA
// -----------------------------------------------------------------------------

/** JSON representation of a `TypeDescriptor`. */
export type TypeDefinition = {
  readonly type: TypeSignature;
  readonly records: readonly RecordDefinition[];
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
  readonly kind: "array";
  readonly value: {
    readonly item: TypeSignature;
    readonly key_extractor?: string;
  };
}

export interface RecordTypeSignature {
  readonly kind: "record";
  readonly value: string;
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
  readonly kind: "struct";
  readonly id: string;
  readonly doc?: string;
  readonly fields: readonly FieldDefinition[];
  readonly removed_numbers?: readonly number[];
};

/**
 * Definition of a struct field in the JSON representation of a
 * `TypeDescriptor`.
 */
export type FieldDefinition = {
  readonly name: string;
  readonly type: TypeSignature;
  readonly number: number;
  readonly doc?: string;
};

/** Definition of an enum in the JSON representation of a `TypeDescriptor`. */
export type EnumDefinition = {
  readonly kind: "enum";
  readonly id: string;
  readonly doc?: string;
  readonly variants: readonly VariantDefinition[];
  readonly removed_numbers?: readonly number[];
};

/**
 * Definition of an enum variant in the JSON representation of a
 * `TypeDescriptor`.
 */
export type VariantDefinition = {
  readonly name: string;
  readonly type?: TypeSignature;
  readonly number: number;
  readonly doc?: string;
};

// -----------------------------------------------------------------------------
// SCHEMA VALIDATION
// -----------------------------------------------------------------------------

export interface TypeHint {
  readonly segment: Segment;
  readonly message: string | readonly string[];
  readonly valueContext: JsonValueContext;
  /// In order. All are included in 'valueContext.value.segment'.
  readonly childHints: readonly TypeHint[];
}

export type Hint =
  | {
      readonly segment: Segment;
      readonly message: string;
      readonly valueContext?: undefined;
    }
  | TypeHint;

export interface MutableTypeHint extends TypeHint {
  readonly childHints: TypeHint[];
}

export interface ValidationResult {
  readonly errors: JsonError[];
  readonly hints: Hint[];
  readonly rootTypeHint: TypeHint | undefined;
  readonly pathToTypeHint: ReadonlyMap<Path, TypeHint>;
}
