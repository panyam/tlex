---
title: C Lexer
description: Tokenizer for C-style languages with comments and states
section: examples
useExamples: true
---

## Overview

This example demonstrates building a tokenizer for C-style programming languages. It showcases:
- Keyword vs identifier priority
- Multi-character operators
- String and character literals with escapes
- Single-line and multi-line comments
- State-based tokenization for block comments
- Preprocessor directives

## C Token Types

| Token | Pattern | Examples |
|-------|---------|----------|
| KEYWORD | Reserved words | `if`, `while`, `return`, `int` |
| IDENTIFIER | Names | `foo`, `myVar`, `_count` |
| NUMBER | Integers and floats | `42`, `3.14`, `0xFF` |
| STRING | Double-quoted | `"hello"`, `"line\n"` |
| CHAR | Single-quoted | `'a'`, `'\n'` |
| OPERATOR | Arithmetic, logic | `+`, `==`, `&&`, `<<` |
| PUNCTUATION | Delimiters | `{`, `}`, `;`, `,` |
| COMMENT | Single/multi-line | `// ...`, `/* ... */` |
| PREPROCESSOR | Directives | `#include`, `#define` |

## Basic Implementation

```typescript
import { Tokenizer } from 'tlex';

const cLexer = new Tokenizer();

// Keywords (higher priority than identifiers)
const keywords = [
  'auto', 'break', 'case', 'char', 'const', 'continue',
  'default', 'do', 'double', 'else', 'enum', 'extern',
  'float', 'for', 'goto', 'if', 'int', 'long',
  'register', 'return', 'short', 'signed', 'sizeof', 'static',
  'struct', 'switch', 'typedef', 'union', 'unsigned', 'void',
  'volatile', 'while'
];

// Add keywords with word boundaries
keywords.forEach(kw => {
  cLexer.add(new RegExp(`\\b${kw}\\b`), { tag: "KEYWORD", priority: 20 });
});

// Identifiers (lower priority - matched when not a keyword)
cLexer.add(/[a-zA-Z_][a-zA-Z0-9_]*/, { tag: "IDENTIFIER", priority: 10 });

// Numbers
cLexer.add(/0[xX][0-9a-fA-F]+[uUlL]*/, { tag: "HEX" });        // Hex
cLexer.add(/0[0-7]+[uUlL]*/, { tag: "OCTAL" });                 // Octal
cLexer.add(/[0-9]+\.[0-9]*([eE][+-]?[0-9]+)?[fFlL]?/, { tag: "FLOAT" }); // Float
cLexer.add(/[0-9]+[eE][+-]?[0-9]+[fFlL]?/, { tag: "FLOAT" });   // Float with exp
cLexer.add(/[0-9]+[uUlL]*/, { tag: "INTEGER" });                // Integer

// String and character literals
cLexer.add(/"(?:[^"\\]|\\.)*"/, { tag: "STRING" });
cLexer.add(/'(?:[^'\\]|\\.)+'/, { tag: "CHAR" });

// Multi-character operators (check first due to maximal munch)
cLexer.add(/->|<<|>>|<=|>=|==|!=|&&|\|\||\+\+|--|[+\-*\/%&|^]=?/, { tag: "OPERATOR" });
cLexer.add(/[+\-*\/%<>=!&|^~?:]/, { tag: "OPERATOR" });

// Punctuation
cLexer.add(/[{}()\[\];,.]/, { tag: "PUNCTUATION" });

// Comments (skip)
cLexer.add(/\/\/[^\n]*/, { skip: true });           // Single-line
cLexer.add(/\/\*[\s\S]*?\*\//, { skip: true });     // Multi-line

// Preprocessor directives
cLexer.add(/#\s*[a-z]+[^\n]*/, { tag: "PREPROCESSOR" });

// Whitespace (skip)
cLexer.add(/\s+/, { skip: true });
```

## Try It Live

<div id="example-c-basic" data-example-runner data-example-config='{"rules": "%token KEYWORD /\\b(if|else|while|for|return|int|void|char|float|double|struct|typedef|const|static|extern|sizeof)\\b/ 20\n%token IDENTIFIER /[a-zA-Z_][a-zA-Z0-9_]*/ 10\n%token HEX /0[xX][0-9a-fA-F]+/\n%token FLOAT /[0-9]+\\.[0-9]*([eE][+-]?[0-9]+)?/\n%token INTEGER /[0-9]+/\n%token STRING /\"(?:[^\"\\\\]|\\\\.)*\"/\n%token CHAR /'\''(?:[^'\''\\\\]|\\\\.)+'\''/\n%token OPERATOR /->|<<|>>|<=|>=|==|!=|&&|\\|\\||\\+\\+|--|[+\\-*\\/%&|^]=?|[+\\-*\\/%<>=!&|^~?:]/\n%token PUNCTUATION /[{}()\\[\\];,.]/\n%token PREPROCESSOR /#\\s*[a-z]+[^\\n]*/\n%skip /\\/\\/[^\\n]*/\n%skip /\\/\\*[\\s\\S]*?\\*\\//\n%skip /\\s+/", "input": "#include <stdio.h>\n\nint main(void) {\n    int x = 42;\n    float pi = 3.14;\n    // This is a comment\n    if (x >= 10 && x <= 100) {\n        printf(\"x = %d\\n\", x);\n    }\n    return 0;\n}"}'></div>

---

## State-Based Block Comments

For more robust multi-line comment handling, use lexer states. This approach:
- Handles unterminated comments gracefully
- Allows incremental parsing mid-comment
- Provides better error messages

```typescript
import { Tokenizer } from 'tlex';

const cLexer = new Tokenizer();

// Normal code tokens (only active in INITIAL state)
cLexer.add(/[a-zA-Z_][a-zA-Z0-9_]*/, {
  tag: "IDENTIFIER",
  activeStates: ["INITIAL"]
});

cLexer.add(/[0-9]+/, {
  tag: "NUMBER",
  activeStates: ["INITIAL"]
});

// Enter block comment state
cLexer.add(/\/\*/, {
  tag: "COMMENT_START",
  activeStates: ["INITIAL"]
}, (rule, tape, token, tokenizer) => {
  tokenizer.pushState("COMMENT");
  return token;
});

// Inside block comment - match content
cLexer.add(/[^*]+/, {
  tag: "COMMENT_CONTENT",
  activeStates: ["COMMENT"]
});

// Inside block comment - match lone stars
cLexer.add(/\*(?!\/)/, {
  tag: "COMMENT_CONTENT",
  activeStates: ["COMMENT"]
});

// Exit block comment state
cLexer.add(/\*\//, {
  tag: "COMMENT_END",
  activeStates: ["COMMENT"]
}, (rule, tape, token, tokenizer) => {
  tokenizer.popState();
  return token;
});

// Single-line comment (no state change needed)
cLexer.add(/\/\/[^\n]*/, {
  skip: true,
  activeStates: ["INITIAL"]
});

// Whitespace
cLexer.add(/\s+/, { skip: true });
```

### How States Work

```text
Input: "x /* comment */ y"

Position 0: State = INITIAL
  Match "x" → IDENTIFIER

Position 2: State = INITIAL
  Match "/*" → COMMENT_START, pushState("COMMENT")

Position 4: State = COMMENT
  Match " comment " → COMMENT_CONTENT

Position 13: State = COMMENT
  Match "*/" → COMMENT_END, popState()

Position 16: State = INITIAL
  Match "y" → IDENTIFIER
```

---

## Enhanced Implementation

Full implementation with value processing:

```typescript
import { Tokenizer, Token } from 'tlex';

export function createCLexer(): Tokenizer {
  const lexer = new Tokenizer();

  // Keywords
  const keywords = [
    'auto', 'break', 'case', 'char', 'const', 'continue',
    'default', 'do', 'double', 'else', 'enum', 'extern',
    'float', 'for', 'goto', 'if', 'int', 'long',
    'register', 'return', 'short', 'signed', 'sizeof', 'static',
    'struct', 'switch', 'typedef', 'union', 'unsigned', 'void',
    'volatile', 'while'
  ];

  keywords.forEach(kw => {
    lexer.add(new RegExp(`\\b${kw}\\b`), { tag: kw.toUpperCase(), priority: 20 });
  });

  // Identifiers
  lexer.add(/[a-zA-Z_][a-zA-Z0-9_]*/, { tag: "IDENTIFIER", priority: 10 });

  // Numbers with value conversion
  lexer.add(/0[xX][0-9a-fA-F]+/, { tag: "NUMBER" }, (rule, tape, token) => {
    token.numValue = parseInt(token.value, 16);
    return token;
  });

  lexer.add(/0[0-7]+/, { tag: "NUMBER" }, (rule, tape, token) => {
    token.numValue = parseInt(token.value, 8);
    return token;
  });

  lexer.add(/[0-9]+\.[0-9]*(?:[eE][+-]?[0-9]+)?/, { tag: "NUMBER" }, (rule, tape, token) => {
    token.numValue = parseFloat(token.value);
    return token;
  });

  lexer.add(/[0-9]+/, { tag: "NUMBER" }, (rule, tape, token) => {
    token.numValue = parseInt(token.value, 10);
    return token;
  });

  // Strings with escape processing
  lexer.add(/"(?:[^"\\]|\\.)*"/, { tag: "STRING" }, (rule, tape, token) => {
    token.stringValue = processEscapes(token.value.slice(1, -1));
    return token;
  });

  // Characters
  lexer.add(/'(?:[^'\\]|\\.)+'/, { tag: "CHAR" }, (rule, tape, token) => {
    token.charValue = processEscapes(token.value.slice(1, -1));
    return token;
  });

  // Operators
  lexer.add(/->/, { tag: "ARROW" });
  lexer.add(/\+\+/, { tag: "INCREMENT" });
  lexer.add(/--/, { tag: "DECREMENT" });
  lexer.add(/<</, { tag: "LEFT_SHIFT" });
  lexer.add(/>>/, { tag: "RIGHT_SHIFT" });
  lexer.add(/<=/, { tag: "LESS_EQUAL" });
  lexer.add(/>=/, { tag: "GREATER_EQUAL" });
  lexer.add(/==/, { tag: "EQUAL" });
  lexer.add(/!=/, { tag: "NOT_EQUAL" });
  lexer.add(/&&/, { tag: "LOGICAL_AND" });
  lexer.add(/\|\|/, { tag: "LOGICAL_OR" });
  lexer.add(/[+\-*\/%]/, { tag: "ARITHMETIC_OP" });
  lexer.add(/[<>=!]/, { tag: "RELATIONAL_OP" });
  lexer.add(/[&|^~]/, { tag: "BITWISE_OP" });
  lexer.add(/\?/, { tag: "QUESTION" });
  lexer.add(/:/, { tag: "COLON" });

  // Punctuation
  lexer.add(/\{/, { tag: "LBRACE" });
  lexer.add(/\}/, { tag: "RBRACE" });
  lexer.add(/\(/, { tag: "LPAREN" });
  lexer.add(/\)/, { tag: "RPAREN" });
  lexer.add(/\[/, { tag: "LBRACKET" });
  lexer.add(/\]/, { tag: "RBRACKET" });
  lexer.add(/;/, { tag: "SEMICOLON" });
  lexer.add(/,/, { tag: "COMMA" });
  lexer.add(/\./, { tag: "DOT" });

  // Comments
  lexer.add(/\/\/[^\n]*/, { tag: "LINE_COMMENT", skip: true });
  lexer.add(/\/\*[\s\S]*?\*\//, { tag: "BLOCK_COMMENT", skip: true });

  // Preprocessor
  lexer.add(/#\s*include\s*[<"][^>"]+[>"]/, { tag: "INCLUDE" });
  lexer.add(/#\s*define\s+[a-zA-Z_][a-zA-Z0-9_]*[^\n]*/, { tag: "DEFINE" });
  lexer.add(/#\s*ifdef\s+[a-zA-Z_][a-zA-Z0-9_]*/, { tag: "IFDEF" });
  lexer.add(/#\s*ifndef\s+[a-zA-Z_][a-zA-Z0-9_]*/, { tag: "IFNDEF" });
  lexer.add(/#\s*endif/, { tag: "ENDIF" });
  lexer.add(/#\s*else/, { tag: "PP_ELSE" });
  lexer.add(/#\s*elif[^\n]*/, { tag: "ELIF" });

  // Whitespace
  lexer.add(/\s+/, { skip: true });

  return lexer;
}

function processEscapes(str: string): string {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\0/g, '\0')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
}
```

---

## Pattern Breakdown

### Identifier Pattern

```
[a-zA-Z_][a-zA-Z0-9_]*
```

| Part | Meaning |
|------|---------|
| `[a-zA-Z_]` | First char: letter or underscore |
| `[a-zA-Z0-9_]*` | Rest: letters, digits, underscores |

### Float Pattern

```
[0-9]+\.[0-9]*([eE][+-]?[0-9]+)?
```

| Part | Meaning |
|------|---------|
| `[0-9]+` | Integer part (required) |
| `\.` | Decimal point |
| `[0-9]*` | Fractional part (optional) |
| `([eE][+-]?[0-9]+)?` | Optional exponent |

### String Pattern

```
"(?:[^"\\]|\\.)*"
```

| Part | Meaning |
|------|---------|
| `"` | Opening quote |
| `[^"\\]` | Any char except `"` or `\` |
| `\\.` | Escape sequence (backslash + any char) |
| `*` | Zero or more of above |
| `"` | Closing quote |

### Block Comment Pattern

```
\/\*[\s\S]*?\*\/
```

| Part | Meaning |
|------|---------|
| `\/\*` | Opening `/*` |
| `[\s\S]*?` | Any chars (non-greedy) |
| `\*\/` | Closing `*/` |

Note: `[\s\S]` matches any character including newlines (unlike `.`).

---

## Usage Example

```typescript
const lexer = createCLexer();

const code = `
#include <stdio.h>

/* Multi-line
   comment */

int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

int main(void) {
    int result = factorial(5);
    printf("5! = %d\\n", result);
    return 0;
}
`;

const tokens = lexer.tokenize(code);

for (const token of tokens) {
  console.log(`${token.tag.padEnd(15)} ${token.value}`);
}
```

Output:

```
INCLUDE         #include <stdio.h>
INT             int
IDENTIFIER      factorial
LPAREN          (
INT             int
IDENTIFIER      n
RPAREN          )
LBRACE          {
IF              if
LPAREN          (
IDENTIFIER      n
LESS_EQUAL      <=
NUMBER          1
RPAREN          )
RETURN          return
NUMBER          1
SEMICOLON       ;
RETURN          return
IDENTIFIER      n
ARITHMETIC_OP   *
IDENTIFIER      factorial
...
```

---

## Error Handling

```typescript
lexer.onError = (error, tape, startIndex) => {
  const line = getLineNumber(tape.input, startIndex);
  const col = getColumn(tape.input, startIndex);
  const char = tape.charAt(startIndex);

  throw new SyntaxError(
    `Unexpected character '${char}' at line ${line}, column ${col}`
  );
};

function getLineNumber(input: string, index: number): number {
  return input.slice(0, index).split('\n').length;
}

function getColumn(input: string, index: number): number {
  const lastNewline = input.lastIndexOf('\n', index - 1);
  return index - lastNewline;
}
```

---

## See Also

- [Tokenizer States](/tlex/reference/tokenizer-states/) - State management patterns
- [Rule Configuration](/tlex/reference/rule-config/) - Priority and activeStates
- [JSON Tokenizer](/tlex/examples/json-tokenizer/) - Simpler example
