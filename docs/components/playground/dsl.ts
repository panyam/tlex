/**
 * dsl.ts - DSL parser for lexer rule definitions
 * Supports %token, %skip, and %define directives
 */

import * as T from "tlex";

const str2regex = (s: string | number): string => {
  if (typeof s === "number") return "" + s;
  return s.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
};

enum TokenType {
  ARROW = "ARROW",
  OPEN_PAREN = "OPEN_PAREN",
  CLOSE_PAREN = "CLOSE_PAREN",
  OPEN_BRACE = "OPEN_BRACE",
  CLOSE_BRACE = "CLOSE_BRACE",
  OPEN_SQ = "OPEN_SQ",
  CLOSE_SQ = "CLOSE_SQ",
  STAR = "STAR",
  PLUS = "PLUS",
  QMARK = "QMARK",
  PIPE = "PIPE",
  COLON = "COLON",
  SEMI_COLON = "SEMI_COLON",
  SPACES = "SPACES",
  COMMENT = "COMMENT",
  STRING = "STRING",
  REGEX = "REGEX",
  NUMBER = "NUMBER",
  IDENT = "IDENT",
  PCT_IDENT = "PCT_IDENT",
  DOLLAR_NUM = "DOLLAR_NUM",
  DOLLAR_IDENT = "DOLLAR_IDENT",
}

type TokenHandler = (token: T.Token, tape: T.TapeInterface, owner: any) => T.Token;

function InputTokenizer(): T.Tokenizer {
  const lexer = new T.Tokenizer();
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
  lexer.add(T.Samples.DOUBLE_QUOTE_STRING, { tag: TokenType.STRING }, (rule, tape, token) => {
    token.value = tape.substring(token.start + 1, token.end - 1);
    return token;
  });
  lexer.add(T.Samples.SINGLE_QUOTE_STRING, { tag: TokenType.STRING }, (rule, tape, token) => {
    token.value = tape.substring(token.start + 1, token.end - 1);
    return token;
  });
  lexer.add(T.Samples.JS_REGEX, { tag: TokenType.REGEX }, (rule, tape, token) => {
    const pattern = tape.substring(token.positions[1][0], token.positions[1][1]);
    const flags = tape.substring(token.positions[3][0], token.positions[3][1]);
    token.value = [pattern, flags];
    return token;
  });
  lexer.add(/\d+/, { tag: TokenType.NUMBER }, (rule, tape, token) => {
    token.value = parseInt(tape.substring(token.start, token.end));
    return token;
  });
  lexer.add(/%([\w][\w\d_]*)/, { tag: TokenType.PCT_IDENT }, (rule, tape, token) => {
    token.value = tape.substring(token.start + 1, token.end);
    return token;
  });
  lexer.add(/\$\d+/, { tag: TokenType.DOLLAR_NUM }, (rule, tape, token) => {
    token.value = parseInt(tape.substring(token.start + 1, token.end));
    return token;
  });
  lexer.add(/\$([\w][\w\d_]*)/, { tag: TokenType.DOLLAR_IDENT }, (rule, tape, token) => {
    token.value = tape.substring(token.start + 1, token.end);
    return token;
  });
  lexer.add(/[\w][\w\d_]*/, { tag: TokenType.IDENT });
  return lexer;
}

export function TokenizerFromDSL(input: string, tokenHandlers: Record<string, TokenHandler>): T.Tokenizer {
  const tape = new T.Tape(input);
  const et = InputTokenizer();
  const ntFunc = (tape: T.TapeInterface) => et.next(tape, null);
  const tokenizer = new T.TokenBuffer(ntFunc, null);
  let regexSyntax = "js";
  const generatedTokenizer = new T.Tokenizer();

  function parseDirective(directive: string): string | null {
    if (directive === "resyntax") {
      const next = tokenizer.expectToken(tape, TokenType.IDENT);
      if (next.value !== "js" && next.value !== "flex") {
        throw new SyntaxError("Invalid regex syntax: " + next.value);
      }
      regexSyntax = next.value;
    } else if (directive.startsWith("skip")) {
      const rule = parseRegex("", 30, directive.endsWith("flex") ? "flex" : "");
      const handler = parseTokenHandler(tape);
      if (handler) {
        generatedTokenizer.addRule(rule, (rule, tape, token) => {
          handler(rule, tape, token, null);
          return null;
        });
      } else {
        generatedTokenizer.addRule(rule, () => null);
      }
    } else if (directive.startsWith("token") || directive.startsWith("define")) {
      const isDef = directive.startsWith("define");
      const tokName = tokenizer.expectToken(tape, TokenType.IDENT, TokenType.STRING);
      let label = tokName.value as string;
      if (tokName.tag === TokenType.STRING || tokName.tag === TokenType.NUMBER) {
        label = `"${tokName.value}"`;
      }
      const rule = parseRegex(label, 0, directive.endsWith("flex") ? "flex" : "");
      if (isDef) {
        generatedTokenizer.addVar(label, rule.expr);
      } else {
        const handler = parseTokenHandler(tape);
        generatedTokenizer.addRule(rule, handler);
        return label;
      }
    } else {
      throw new Error("Invalid directive: " + directive);
    }
    return null;
  }

  function parseRegex(tag?: string, priority = 0, syntax = ""): T.Rule {
    if (syntax === "") syntax = regexSyntax;
    if (syntax === "js") {
      const tokPattern = tokenizer.expectToken(tape, TokenType.STRING, TokenType.NUMBER, TokenType.REGEX);
      let rule: T.Rule;
      if (!tag || tag.length === 0) {
        tag = "/" + tokPattern.value[0] + "/" + tokPattern.value[1];
      }
      if (tokPattern.tag === TokenType.STRING || tokPattern.tag === TokenType.NUMBER) {
        const pattern = str2regex(tokPattern.value);
        rule = T.Builder.build(pattern, { tag: tag, priority: priority + 20 });
      } else if (tokPattern.tag === TokenType.REGEX) {
        let re = tokPattern.value[0];
        if (tokPattern.value[1].length > 0) {
          re = new RegExp(tokPattern.value[0], tokPattern.value[1]);
        }
        rule = T.Builder.build(re, { tag: tag, priority: priority + 10 });
      } else {
        throw new T.UnexpectedTokenError(tokPattern);
      }
      return rule;
    } else {
      // Flex style RE
      let patternStr = "";
      while (tape.hasMore && tape.currCh !== "\n") {
        patternStr += tape.currCh;
        tape.advance(1);
      }
      patternStr = patternStr.trim();
      if (!tag || tag.length === 0) {
        tag = "/" + patternStr + "/";
      }
      return new T.Rule(T.Builder.exprFromFlexRE(patternStr), { tag: tag, priority: priority });
    }
  }

  function parseTokenHandler(tape: T.TapeInterface): T.RuleMatchHandler | null {
    if (!tokenizer.consumeIf(tape, TokenType.OPEN_BRACE)) {
      return null;
    }
    const funcName = tokenizer.expectToken(tape, TokenType.IDENT);
    const out: T.RuleMatchHandler = (rule, tape, token, owner) => {
      const handler = tokenHandlers[funcName.value];
      if (!handler) throw new Error("Handler method not found: " + funcName.value);
      return handler(token, tape, owner);
    };
    tokenizer.expectToken(tape, TokenType.CLOSE_BRACE);
    return out;
  }

  function parse(): void {
    let peeked = tokenizer.peek(tape);
    while (peeked != null) {
      if (peeked.tag === TokenType.PCT_IDENT) {
        tokenizer.next(tape);
        parseDirective(peeked.value);
      } else {
        throw new SyntaxError(
          `Declaration must start with %token/%token_flex, %skip or %define, Found: ${peeked.tag}`
        );
      }
      peeked = tokenizer.peek(tape);
    }
  }

  parse();
  return generatedTokenizer;
}
