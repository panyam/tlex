const util = require("util");
import { InstrDebugValue } from "../vm";
import { Tape } from "../tape";
import { Tokenizer } from "../tokenizer";
import { Token } from "../token";

export enum TokenType {
  STRING = "STRING",
  REGEX = "REGEX",
  NUMBER = "NUMBER",
  SPACES = "SPACES",
  IDENT = "IDENT",
  PCT_IDENT = "PCT_IDENT",
  STAR = "STAR",
  PLUS = "PLUS",
  QMARK = "QMARK",
  PIPE = "PIPE",
  OPEN_PAREN = "OPEN_PAREN",
  CLOSE_PAREN = "CLOSE_PAREN",
  OPEN_BRACE = "OPEN_BRACE",
  CLOSE_BRACE = "CLOSE_BRACE",
  OPEN_SQ = "OPEN_SQ",
  CLOSE_SQ = "CLOSE_SQ",
  COMMENT = "COMMENT",
  ARROW = "ARROW",
  COLCOLHYPHEN = "COLCOLHYPHEN",
  COLON = "COLON",
  SEMI_COLON = "SEMI_COLON",
}

export function newTokenizer(): Tokenizer {
  const lexer = new Tokenizer();
  lexer.add(/->/, { tag: TokenType.ARROW });
  lexer.add(/\[/, { tag: TokenType.OPEN_SQ });
  lexer.add(/\]/, { tag: TokenType.CLOSE_SQ });
  lexer.add(/\(/, { tag: TokenType.OPEN_PAREN });
  lexer.add(/\)/, { tag: TokenType.CLOSE_PAREN });
  lexer.add(/\{/, { tag: TokenType.OPEN_BRACE });
  lexer.add(/\}/, { tag: TokenType.CLOSE_BRACE });
  lexer.add(/\*/, { tag: TokenType.STAR });
  lexer.add(/\+/, { tag: TokenType.PLUS });
  lexer.add(/\?/, { tag: TokenType.QMARK });
  lexer.add(/;/, { tag: TokenType.SEMI_COLON });
  lexer.add(/:/, { tag: TokenType.COLON });
  lexer.add(/\|/, { tag: TokenType.PIPE });
  lexer.add(/\s+/m, { tag: TokenType.SPACES }, () => null);
  lexer.add(/\/\*.*?\*\//s, { tag: TokenType.COMMENT }, () => null);
  lexer.add(/\/\/.*$/m, { tag: TokenType.COMMENT }, () => null);
  lexer.add(/"(.*?(?<!\\))"/, { tag: TokenType.STRING }, (rule, tape, token) => {
    token.value = tape.substring(token.start + 1, token.end - 1);
    return token;
  });
  lexer.add(/'(.*?(?<!\\))'/, { tag: TokenType.STRING }, (rule, tape, token) => {
    token.value = tape.substring(token.start + 1, token.end - 1);
    return token;
  });
  lexer.add(/\/(.+?(?<!\\))\//, { tag: TokenType.REGEX }, (rule, tape, token) => {
    token.value = tape.substring(token.start + 1, token.end - 1);
    return token;
  });
  lexer.add(/\d+/, { tag: TokenType.NUMBER });
  lexer.add(/%([\w][\w\d_]*)/, { tag: TokenType.PCT_IDENT }, (rule, tape, token) => {
    token.value = tape.substring(token.start + 1, token.end);
    return token;
  });
  lexer.add(/[\w][\w\d_]*/, { tag: TokenType.IDENT });
  return lexer;
}

describe("Tape Tests", () => {
  test("Basic", () => {
    const t1 = new Tape("Hello World");
    expect(t1.currCh).toBe("H");
    expect(t1.index).toBe(0);
    expect(t1.currCh).toBe("H");
    expect(t1.advance()).toBe(true);
    expect(t1.index).toBe(1);
    expect(t1.substring(4, 6)).toBe("o ");
    t1.push(" And Universe");
    expect(t1.input).toEqual([..."Hello World And Universe"]);
  });
});

function tokenize(input: string, debug = false): any[] {
  const tokens = [] as Token[];
  const found = [] as any[];
  const t = newTokenizer();
  if (debug) {
    const t2 = newTokenizer();
    console.log("Prog: \n", `${t2.compile().debugValue(InstrDebugValue).join("\n")}`, "\n\nInput: ", input);
    console.log(
      "\n\nFound: ",
      util.inspect(found, {
        showHidden: false,
        depth: null,
        maxArrayLength: null,
        maxStringLength: null,
      }),
    );
    /*
    console.log(
      "\n\nExpected: ",
      util.inspect(expected, {
        showHidden: false,
        depth: null,
        maxArrayLength: null,
        maxStringLength: null,
      }),
    );
    */
  }
  const tape = new Tape(input);
  let next = t.next(tape, null);
  while (next) {
    tokens.push(next);
    found.push({
      tag: next.tag,
      value: next.value,
      range: [next.start, next.end],
    });
    next = t.next(tape, null);
  }
  if (debug) {
    console.log(
      "Filtered Tokens: ",
      tokens,
      "Tokens: ",
      util.inspect(found, {
        showHidden: false,
        depth: null,
        maxArrayLength: null,
        maxStringLength: null,
      }),
    );
  }
  return found;
}

describe("Tokenizer Tests", () => {
  test("Create Tokenizer", () => {
    const tokens = tokenize(
      `
      %token "a"
      %token "b"
      %token "c"
    `,
    );
    expect(tokens).toEqual([
      { tag: "PCT_IDENT", value: "token", range: [7, 13] },
      { tag: "STRING", value: "a", range: [14, 17] },
      { tag: "PCT_IDENT", value: "token", range: [24, 30] },
      { tag: "STRING", value: "b", range: [31, 34] },
      { tag: "PCT_IDENT", value: "token", range: [41, 47] },
      { tag: "STRING", value: "c", range: [48, 51] },
    ]);
  });
  test("Testing out more basic tokens", () => {
    const tokens = tokenize(
      `
      a -> "3"
      b : "c"
    `,
    );
    expect(tokens).toEqual([
      { tag: "IDENT", value: "a", range: [7, 8] },
      { tag: "ARROW", value: "->", range: [9, 11] },
      { tag: "STRING", value: "3", range: [12, 15] },
      { tag: "IDENT", value: "b", range: [22, 23] },
      { tag: "COLON", value: ":", range: [24, 25] },
      { tag: "STRING", value: "c", range: [26, 29] },
    ]);
  });
  test("Testing out Flex RE Syntax", () => {
    const tokens = tokenize(
      `
      %resyntax flex
      // A single line comment
      rule1   "hello world"

      /**
        * Multiline Comment
        */
      rule2   {abc}def{ghi}
    `,
    );
    expect(tokens).toEqual([
      { tag: "PCT_IDENT", value: "resyntax", range: [7, 16] },
      { tag: "IDENT", value: "flex", range: [17, 21] },
      { tag: "IDENT", value: "rule1", range: [59, 64] },
      { tag: "STRING", value: "hello world", range: [67, 80] },
      { tag: "IDENT", value: "rule2", range: [137, 142] },
      { tag: "OPEN_BRACE", value: "{", range: [145, 146] },
      { tag: "IDENT", value: "abc", range: [146, 149] },
      { tag: "CLOSE_BRACE", value: "}", range: [149, 150] },
      { tag: "IDENT", value: "def", range: [150, 153] },
      { tag: "OPEN_BRACE", value: "{", range: [153, 154] },
      { tag: "IDENT", value: "ghi", range: [154, 157] },
      { tag: "CLOSE_BRACE", value: "}", range: [157, 158] },
    ]);
  });
  test("Testing comment", () => {
    const tokens = tokenize(
      String.raw`
      %resyntax flex

      %define   WS            /[ \t\v\n\f\r]/

      // comments
      %skip                   /"\/*"[.\n]*?"*\/"/
    `,
    );
    expect(tokens).toEqual([
      { tag: "PCT_IDENT", value: "resyntax", range: [7, 16] },
      { tag: "IDENT", value: "flex", range: [17, 21] },
      { tag: "PCT_IDENT", value: "define", range: [29, 36] },
      { tag: "IDENT", value: "WS", range: [39, 41] },
      { tag: "REGEX", value: "[ \\t\\v\\n\\f\\r]", range: [53, 68] },
      { tag: "PCT_IDENT", value: "skip", range: [94, 99] },
      { tag: "REGEX", value: '"\\/*"[.\\n]*?"*\\/"', range: [118, 137] },
    ]);
  });
});

describe("Tokenizer Error Tests", () => {
  test("Testing Invalid Char", () => {
    try {
      const tokens = tokenize("a -> #");
      expect(tokens).toEqual([]);
    } catch (err: any) {
      if (err.name != "TokenizerError") {
        throw err;
      }
      expect(err.offset).toEqual(5);
      expect(err.value).toEqual("#");
    }
  });

  test("Testing Unterminated String", () => {
    try {
      const tokens = tokenize('a -> "Hello...');
      expect(tokens).toEqual([]);
    } catch (err: any) {
      if (err.name != "TokenizerError") {
        throw err;
      }
      expect(err.offset).toEqual(5);
      expect(err.length).toEqual(9);
    }
  });
});
