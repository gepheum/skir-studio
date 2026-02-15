import { expect } from "buckwheat";
import { describe, it } from "mocha";
import { parseJsonValue } from "./json_parser.js";

describe("json_parser", () => {
  it("parses true", () => {
    expect(parseJsonValue("true")).toMatch({
      value: {
        kind: "literal",
        jsonCode: "true",
        type: "boolean",
      },
      errors: [],
    });
  });

  it("parses false", () => {
    expect(parseJsonValue("false")).toMatch({
      value: {
        kind: "literal",
        jsonCode: "false",
        type: "boolean",
      },
      errors: [],
    });
  });

  it("parses null", () => {
    expect(parseJsonValue("null")).toMatch({
      value: {
        kind: "literal",
        jsonCode: "null",
        type: "null",
      },
      errors: [],
    });
  });

  it("parses number", () => {
    expect(parseJsonValue("123.45")).toMatch({
      value: {
        kind: "literal",
        jsonCode: "123.45",
        type: "number",
      },
      errors: [],
    });
  });

  it("parses string", () => {
    expect(parseJsonValue('"hello"')).toMatch({
      value: {
        kind: "literal",
        jsonCode: '"hello"',
        type: "string",
      },
      errors: [],
    });
  });

  it("parses empty array", () => {
    expect(parseJsonValue("[]")).toMatch({
      value: { kind: "array", values: [] },
      errors: [],
    });
  });

  it("parses array with values", () => {
    expect(parseJsonValue("[1, true]")).toMatch({
      value: {
        kind: "array",
        values: [
          { kind: "literal", jsonCode: "1", type: "number" },
          { kind: "literal", jsonCode: "true", type: "boolean" },
        ],
      },
      errors: [],
    });
  });

  it("parses empty object", () => {
    expect(parseJsonValue("{}")).toMatch({
      value: {
        kind: "object",
        keyValues: {},
      },
      errors: [],
    });
  });

  it("parses object with values", () => {
    expect(parseJsonValue('{"a": 1}')).toMatch({
      value: {
        kind: "object",
        keyValues: {
          a: {
            key: "a",
            value: { kind: "literal", jsonCode: "1", type: "number" },
          },
        },
      },
      errors: [],
    });
  });

  it("parses arrays with whitespace", () => {
    expect(parseJsonValue(" [ 1 ] ")).toMatch({
      value: {
        kind: "array",
        values: [{ kind: "literal", jsonCode: "1" }],
      },
      errors: [],
    });
  });

  it("reports error for invalid token", () => {
    expect(parseJsonValue("@")).toMatch({
      value: undefined,
      errors: [
        {
          message: "not a token",
        },
      ],
    });
  });

  it("reports error for unclosed array", () => {
    const result = parseJsonValue("[");
    // Lenient parsing: returns a value even with errors
    expect(result).toMatch({
      value: { kind: "array" },
    });
    expect(result.errors.length > 0).toBe(true);
  });
});
