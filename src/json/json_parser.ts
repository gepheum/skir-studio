import type {
  JsonArray,
  JsonError,
  JsonErrors,
  JsonKeyValue,
  JsonObject,
  JsonValue,
  Segment,
} from "./types";

export function parseJsonValue(input: string): JsonValue | JsonErrors {
  const tokens = tokenize(input);
  if (tokens.kind === "error") {
    return {
      kind: "errors",
      errors: [tokens],
    };
  }
  const parser = new JsonParser(tokens.tokens);
  const parseResult = parser.parseValueOrSkip();
  parser.expectEnd();

  if (parser.errors.length) {
    return {
      kind: "errors",
      errors: parser.errors,
    };
  }
  if (!parseResult) {
    throw new Error(`input: ${input}`);
  }
  return parseResult;
}

interface JsonToken {
  segment: Segment;
  jsonCode: string;
}

interface JsonTokens {
  kind: "tokens";
  tokens: JsonToken[];
}

function tokenize(input: string): JsonTokens | JsonError {
  const tokens: JsonToken[] = [];
  let pos = 0;

  const whitespaceRegex = /[ \t\r\n]*/y;
  const tokenRegex =
    /([[\]{}:,]|(-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)|false|true|null|("(((?=\\)\\(["\\/ bfnrt]|u[0-9a-fA-F]{4}))|[^"\\\0-\x1F\x7F]+)*")|$)/y;

  while (true) {
    whitespaceRegex.lastIndex = pos;
    whitespaceRegex.exec(input);
    pos = whitespaceRegex.lastIndex;

    tokenRegex.lastIndex = pos;
    const tokenMatch = tokenRegex.exec(input);
    if (tokenMatch) {
      const tokenText = tokenMatch[0];
      const segment: Segment = {
        start: pos,
        end: pos + tokenText.length,
      };
      const token: JsonToken = { segment, jsonCode: tokenText };
      pos = tokenRegex.lastIndex;
      tokens.push(token);
      if (tokenText === "") {
        return {
          kind: "tokens",
          tokens: tokens,
        };
      }
    } else {
      // Find the next word boundary using unicode support
      const wordBoundaryRegex = /\w*/uy;
      wordBoundaryRegex.lastIndex = pos + 1;
      wordBoundaryRegex.exec(input);
      const end = wordBoundaryRegex.lastIndex || pos + 1;
      return {
        kind: "error",
        message: "not a token",
        segment: { start: pos, end: end },
      };
    }
  }
}

class JsonParser {
  constructor(private tokens: JsonToken[]) {}
  private i = 0;
  errors: JsonError[] = [];

  parseValueOrSkip(): JsonValue | undefined {
    const token = this.peekToken();
    const firstChar = token.jsonCode ? token.jsonCode[0] : "";

    switch (firstChar) {
      case "[":
        return this.parseArray();
      case "{":
        return this.parseObject();
      case "n":
        this.nextToken();
        return {
          kind: "literal",
          firstToken: token.segment,
          segment: token.segment,
          jsonCode: "null",
          type: "null",
        };
      case "f":
        this.nextToken();
        return {
          kind: "literal",
          firstToken: token.segment,
          segment: token.segment,
          jsonCode: "false",
          type: "boolean",
        };
      case "t":
        this.nextToken();
        return {
          kind: "literal",
          firstToken: token.segment,
          segment: token.segment,
          jsonCode: "true",
          type: "boolean",
        };
      case '"':
        this.nextToken();
        return {
          kind: "literal",
          firstToken: token.segment,
          segment: token.segment,
          jsonCode: token.jsonCode,
          type: "string",
        };
      case "0":
      case "1":
      case "2":
      case "3":
      case "4":
      case "5":
      case "6":
      case "7":
      case "8":
      case "9":
      case "-":
        this.nextToken();
        return {
          kind: "literal",
          firstToken: token.segment,
          segment: token.segment,
          jsonCode: token.jsonCode,
          type: "number",
        };
    }

    this.errors.push({
      kind: "error",
      message: "expected: value",
      segment: this.peekToken().segment,
    });
    this.skip();
    return undefined;
  }

  private parseArray(): JsonArray {
    const leftBracket = this.nextToken();
    const values: JsonValue[] = [];
    let expectComma = false;
    while (true) {
      if (this.peekToken().jsonCode === "]") {
        const rightBracket = this.nextToken();
        return {
          kind: "array",
          firstToken: leftBracket.segment,
          segment: {
            start: leftBracket.segment.start,
            end: rightBracket.segment.end,
          },
          values,
        };
      }
      if (this.peekToken().jsonCode === "}") {
        this.errors.push({
          kind: "error",
          message: "expected: ']'",
          segment: this.peekToken().segment,
        });
        const wrongBracket = this.nextToken();
        return {
          kind: "array",
          firstToken: leftBracket.segment,
          segment: {
            start: leftBracket.segment.start,
            end: wrongBracket.segment.end,
          },
          values,
        };
      }
      if (this.peekToken().jsonCode === "") {
        // End of file
        this.expectSymbolOrSkip("]");
        return {
          kind: "array",
          firstToken: leftBracket.segment,
          segment: {
            start: leftBracket.segment.start,
            end: this.peekToken().segment.start,
          },
          values,
        };
      }
      if (expectComma && !this.expectSymbolOrSkip(",")) {
        continue;
      }
      expectComma = true;
      const value = this.parseValueOrSkip();
      if (value) {
        values.push(value);
      }
    }
  }

  private parseObject(): JsonObject {
    const leftBracket = this.nextToken();
    const keyValues: { [key: string]: JsonKeyValue } = {};
    let expectComma = false;
    while (true) {
      if (this.peekToken().jsonCode === "}") {
        const rightBracket = this.nextToken();
        return {
          kind: "object",
          firstToken: leftBracket.segment,
          segment: {
            start: leftBracket.segment.start,
            end: rightBracket.segment.end,
          },
          keyValues,
        };
      }
      if (this.peekToken().jsonCode === "]") {
        this.errors.push({
          kind: "error",
          message: "expected: ']'",
          segment: this.peekToken().segment,
        });
        const wrongBracket = this.nextToken();
        return {
          kind: "object",
          firstToken: leftBracket.segment,
          segment: {
            start: leftBracket.segment.start,
            end: wrongBracket.segment.end,
          },
          keyValues,
        };
      }
      if (this.peekToken().jsonCode === "") {
        // End of file
        this.expectSymbolOrSkip("}");
        return {
          kind: "object",
          firstToken: leftBracket.segment,
          segment: {
            start: leftBracket.segment.start,
            end: this.peekToken().segment.start,
          },
          keyValues,
        };
      }
      if (expectComma && !this.expectSymbolOrSkip(",")) {
        continue;
      }
      expectComma = true;
      const keyToken = this.peekToken();
      if (!keyToken.jsonCode.startsWith('"')) {
        this.errors.push({
          kind: "error",
          message: "expected: string",
          segment: keyToken.segment,
        });
        this.skip();
        continue;
      }
      this.nextToken();
      if (!this.expectSymbolOrSkip(":")) {
        continue;
      }
      const key = JSON.parse(keyToken.jsonCode) as string;
      if (keyValues[key]) {
        this.errors.push({
          kind: "error",
          message: "duplicate key",
          segment: keyToken.segment,
        });
      }
      const value = this.parseValueOrSkip();
      if (value) {
        keyValues[key] = {
          keyToken: keyToken.segment,
          key: key,
          value: value,
        };
      }
    }
  }

  expectEnd(): void {
    if (this.peekToken().jsonCode) {
      this.errors.push({
        kind: "error",
        message: "expected: end",
        segment: this.peekToken().segment,
      });
    }
  }

  private nextToken(): JsonToken {
    const result = this.tokens[this.i];
    ++this.i;
    return result;
  }

  private peekToken(): JsonToken {
    return this.tokens[this.i];
  }

  private expectSymbolOrSkip(symbol: string): boolean {
    if (this.peekToken().jsonCode !== symbol) {
      this.errors.push({
        kind: "error",
        message: `expected: '${symbol}'`,
        segment: this.peekToken().segment,
      });
      this.skip();
      return false;
    }
    this.nextToken();
    return true;
  }

  private skip(): void {
    while (true) {
      const tokenJson = this.peekToken().jsonCode;
      if (
        tokenJson === "" ||
        tokenJson === "," ||
        tokenJson === "]" ||
        tokenJson === "}"
      ) {
        return;
      } else if (tokenJson === "[") {
        this.parseArray();
      } else if (tokenJson === "{") {
        this.parseObject();
      } else {
        this.nextToken();
      }
    }
  }
}
