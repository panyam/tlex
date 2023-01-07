import * as TLEX from "tlex";

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

export type TokenHandler = (token: TLEX.Token, tape: TLEX.Tape, owner: any) => TLEX.Token;

export function TokenizerFromDSL(input: string, tokenHandlers: any, context: any = null) {
  const tape = new TLEX.Tape(input);
  const et = InputTokenizer();
  const ntFunc = (tape: TLEX.Tape) => {
    return et.next(tape, context);
  };
  const tokenizer = new TLEX.TokenBuffer(ntFunc, context);
  let regexSyntax = "js";
  const generatedTokenizer = new TLEX.Tokenizer();

  function parseDirective(directive: string): string | null {
    if (directive == "resyntax") {
      // override start directive
      const next = tokenizer.expectToken(tape, TokenType.IDENT);
      if (next.value != "js" && next.value != "flex") {
        throw new SyntaxError("Invalid regex syntax: " + next.value);
      }
      regexSyntax = next.value;
    } else if (directive.startsWith("skip")) {
      const rule = parseRegex("", 30, directive.endsWith("flex") ? "flex" : "");
      const tokenHandler = parseTokenHandler(tape);
      if (tokenHandler) {
        generatedTokenizer.addRule(rule, (rule, tape, token) => {
          tokenHandler(rule, tape, token, context);
          return null;
        });
      } else {
        generatedTokenizer.addRule(rule, () => null);
      }
    } else if (directive.startsWith("token") || directive.startsWith("define")) {
      const isDef = directive.startsWith("define");
      const tokName = tokenizer.expectToken(tape, TokenType.IDENT, TokenType.STRING);
      let label = tokName.value as string;
      if (tokName.tag == TokenType.STRING || tokName.tag == TokenType.NUMBER) {
        label = `"${tokName.value}"`;
      }
      const rule = parseRegex(label, 0, directive.endsWith("flex") ? "flex" : "");
      if (isDef) {
        // Define a "reusable" regex that is not a token on its own
        generatedTokenizer.addVar(label, rule.expr);
      } else {
        const tokenHandler = parseTokenHandler(tape);
        // see if we have a handler function here
        generatedTokenizer.addRule(rule, tokenHandler);
        // register it
        // this.ensureSymbol(label, true);
        return label;
      }
    } else {
      throw new Error("Invalid directive: " + directive);
    }
    return null;
  }

  function parseRegex(tag?: string, priority = 0, syntax = ""): TLEX.Rule {
    if (syntax == "") syntax = regexSyntax;
    if (syntax == "js") {
      const tokPattern = tokenizer.expectToken(tape, TokenType.STRING, TokenType.NUMBER, TokenType.REGEX);
      let rule: TLEX.Rule;
      if (!tag || tag.length == 0) {
        tag = "/" + tokPattern.value[0] + "/" + tokPattern.value[1];
      }
      if (tokPattern.tag == TokenType.STRING || tokPattern.tag == TokenType.NUMBER) {
        const pattern = str2regex(tokPattern.value);
        rule = TLEX.Builder.build(pattern, { tag: tag, priority: priority + 20 });
      } else if (tokPattern.tag == TokenType.REGEX) {
        let re = tokPattern.value[0];
        if (tokPattern.value[1].length > 0) {
          // Flags given so create
          re = new RegExp(tokPattern.value[0], tokPattern.value[1]);
        }
        rule = TLEX.Builder.build(re, { tag: tag, priority: priority + 10 });
      } else {
        throw new TLEX.UnexpectedTokenError(tokPattern);
      }
      return rule;
    } else {
      // Flex style RE - no delimiters - just read until end of line and strip spaces
      let patternStr = "";
      while (tape.hasMore && tape.currCh != "\n") {
        patternStr += tape.currCh;
        tape.advance();
      }
      patternStr = patternStr.trim();
      if (!tag || tag.length == 0) {
        tag = "/" + patternStr + "/";
      }
      return new TLEX.Rule(TLEX.Builder.exprFromFlexRE(patternStr), { tag: tag, priority: priority });
    }
  }

  function parseTokenHandler(tape: TLEX.Tape): TLEX.RuleMatchHandler | null {
    if (!tokenizer.consumeIf(tape, TokenType.OPEN_BRACE)) {
      return null;
    }

    const funcName = tokenizer.expectToken(tape, TokenType.IDENT);

    // how do we use the funcName to
    const out = (rule: TLEX.Rule, tape: TLEX.Tape, token: any, owner: any) => {
      const handler = tokenHandlers[funcName.value];
      if (!handler) throw new Error("Handler method not found: " + funcName.value);
      token = handler(token, tape, owner);
      return token;
    };

    tokenizer.expectToken(tape, TokenType.CLOSE_BRACE);
    return out;
  }

  function parse(): void {
    let peeked = tokenizer.peek(tape);
    while (peeked != null) {
      if (peeked.tag == TokenType.PCT_IDENT) {
        tokenizer.next(tape);
        parseDirective(peeked.value);
      } else {
        throw new SyntaxError(`Declaration must start with %token/%token_flex, %skip or %define, Found: ` + peeked.tag);
      }
      peeked = tokenizer.peek(tape);
    }
  }
  parse();
  return generatedTokenizer;
}

function InputTokenizer(): TLEX.Tokenizer {
  const lexer = new TLEX.Tokenizer();
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
  lexer.add(
    TLEX.Samples.DOUBLE_QUOTE_STRING,
    { tag: TokenType.STRING },
    (rule: TLEX.Rule, tape: TLEX.TapeInterface, token: TLEX.Token) => {
      token.value = tape.substring(token.start + 1, token.end - 1);
      return token;
    },
  );
  lexer.add(
    TLEX.Samples.SINGLE_QUOTE_STRING,
    { tag: TokenType.STRING },
    (rule: TLEX.Rule, tape: TLEX.TapeInterface, token: TLEX.Token) => {
      token.value = tape.substring(token.start + 1, token.end - 1);
      return token;
    },
  );
  lexer.add(
    TLEX.Samples.JS_REGEX,
    { tag: TokenType.REGEX },
    (rule: TLEX.Rule, tape: TLEX.TapeInterface, token: TLEX.Token) => {
      const pattern = tape.substring(token.positions[1][0], token.positions[1][1]);
      const flags = tape.substring(token.positions[3][0], token.positions[3][1]);
      token.value = [pattern, flags];
      return token;
    },
  );
  lexer.add(/\d+/, { tag: TokenType.NUMBER }, (rule: TLEX.Rule, tape: TLEX.TapeInterface, token: TLEX.Token) => {
    token.value = parseInt(tape.substring(token.start, token.end));
    return token;
  });
  lexer.add(
    /%([\w][\w\d_]*)/,
    { tag: TokenType.PCT_IDENT },
    (rule: TLEX.Rule, tape: TLEX.TapeInterface, token: TLEX.Token) => {
      token.value = tape.substring(token.start + 1, token.end);
      return token;
    },
  );
  lexer.add(/\$\d+/, { tag: TokenType.DOLLAR_NUM }, (rule: TLEX.Rule, tape: TLEX.TapeInterface, token: TLEX.Token) => {
    token.value = parseInt(tape.substring(token.start + 1, token.end));
    return token;
  });
  lexer.add(
    /\$([\w][\w\d_]*)/,
    { tag: TokenType.DOLLAR_IDENT },
    (rule: TLEX.Rule, tape: TLEX.TapeInterface, token: TLEX.Token) => {
      token.value = tape.substring(token.start + 1, token.end);
      return token;
    },
  );
  lexer.add(/[\w][\w\d_]*/, { tag: TokenType.IDENT });
  return lexer;
}
