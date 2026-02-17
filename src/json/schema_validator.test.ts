import { expect } from "buckwheat";
import { describe, it } from "mocha";
import { parseJsonValue } from "./json_parser.js";
import { validateSchema } from "./schema_validator.js";
import { JsonValue, TypeDefinition } from "./types.js";

function parse(json: string): JsonValue {
  const result = parseJsonValue(json);
  if (!result.value) {
    throw new Error(`JSON parse error: ${JSON.stringify(result.errors)}`);
  }
  return result.value;
}

describe("schema_validator", () => {
  it("validates primitive int32", () => {
    const schema: TypeDefinition = {
      type: { kind: "primitive", value: "int32" },
      records: [],
    };
    const result = validateSchema(parse("123"), schema);
    expect(result).toMatch({ errors: [] });
    if (result.hints.length === 0) {
      throw new Error("Expected type hints");
    }
  });

  it("validates primitive string", () => {
    const schema: TypeDefinition = {
      type: { kind: "primitive", value: "string" },
      records: [],
    };
    const result = validateSchema(parse('"hello"'), schema);
    expect(result).toMatch({ errors: [] });
  });

  it("reports error for type mismatch (int32 vs string)", () => {
    const schema: TypeDefinition = {
      type: { kind: "primitive", value: "int32" },
      records: [],
    };
    const result = validateSchema(parse('"hello"'), schema);
    expect(result.errors).toMatch([
      {
        message: "Expected: int32",
      },
    ]);
  });

  it("validates array of primitives", () => {
    const schema: TypeDefinition = {
      type: {
        kind: "array",
        value: { item: { kind: "primitive", value: "int32" } },
      },
      records: [],
    };
    const result = validateSchema(parse("[1, 2, 3]"), schema);
    expect(result).toMatch({ errors: [] });
  });

  it("reports error for invalid array item", () => {
    const schema: TypeDefinition = {
      type: {
        kind: "array",
        value: { item: { kind: "primitive", value: "int32" } },
      },
      records: [],
    };
    const result = validateSchema(parse('[1, "bad", 3]'), schema);
    expect(result.errors).toMatch([
      {
        message: "Expected: int32",
        segment: {
          start: 4,
          end: 9,
        },
      },
    ]);
  });

  it("validates optional field (present)", () => {
    const schema: TypeDefinition = {
      type: {
        kind: "optional",
        value: { kind: "primitive", value: "int32" },
      },
      records: [],
    };
    const result = validateSchema(parse("123"), schema);
    expect(result).toMatch({ errors: [] });
  });

  it("validates optional field (null)", () => {
    const schema: TypeDefinition = {
      type: {
        kind: "optional",
        value: { kind: "primitive", value: "int32" },
      },
      records: [],
    };
    const result = validateSchema(parse("null"), schema);
    expect(result).toMatch({ errors: [] });
  });

  it("validates struct", () => {
    const schema: TypeDefinition = {
      type: { kind: "record", value: "MyStruct" },
      records: [
        {
          kind: "struct",
          id: "MyStruct",
          fields: [
            {
              name: "foo",
              number: 1,
              type: { kind: "primitive", value: "string" },
            },
            {
              name: "bar",
              number: 2,
              type: { kind: "primitive", value: "int32" },
            },
          ],
        },
      ],
    };
    const result = validateSchema(parse('{"foo": "hi", "bar": 123}'), schema);
    expect(result).toMatch({ errors: [] });
  });

  it("reports unknown field in struct", () => {
    const schema: TypeDefinition = {
      type: { kind: "record", value: "MyStruct" },
      records: [
        {
          kind: "struct",
          id: "MyStruct",
          fields: [],
        },
      ],
    };
    const result = validateSchema(parse('{"unknown": 1}'), schema);
    expect(result.errors).toMatch([
      {
        message: "Unknown field",
        segment: {
          start: 1,
          end: 10,
        },
      },
    ]);
  });

  it("validates enum (string literal)", () => {
    const schema: TypeDefinition = {
      type: { kind: "record", value: "MyEnum" },
      records: [
        {
          kind: "enum",
          id: "MyEnum",
          variants: [
            { name: "First", number: 1 },
            { name: "Second", number: 2 },
          ],
        },
      ],
    };
    const result = validateSchema(parse('"First"'), schema);
    expect(result).toMatch({ errors: [] });
  });

  it("reports unknown enum variant", () => {
    const schema: TypeDefinition = {
      type: { kind: "record", value: "MyEnum" },
      records: [
        {
          kind: "enum",
          id: "MyEnum",
          variants: [{ name: "First", number: 1 }],
        },
      ],
    };
    const result = validateSchema(parse('"Unknown"'), schema);
    expect(result.errors).toMatch([
      {
        message: "Unknown variant",
      },
    ]);
  });

  it("validates enum (object with kind)", () => {
    const schema: TypeDefinition = {
      type: { kind: "record", value: "MyEnum" },
      records: [
        {
          kind: "enum",
          id: "MyEnum",
          variants: [
            {
              name: "complex",
              number: 1,
              type: { kind: "primitive", value: "int32" },
            },
          ],
        },
      ],
    };

    expect(
      validateSchema(parse('{"kind": "complex", "value": 123}'), schema),
    ).toMatch({ errors: [] });
    expect(
      validateSchema(parse('{"kind": "complex", "value": "foo"}'), schema),
    ).toMatch({
      errors: [
        {
          message: "Expected: int32",
        },
      ],
    });
    expect(validateSchema(parse('{"kind": "complex"}'), schema)).toMatch({
      errors: [
        {
          message: "Missing: 'value'",
        },
      ],
    });
  });
});
