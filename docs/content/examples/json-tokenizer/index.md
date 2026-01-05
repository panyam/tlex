---
title: JSON Tokenizer
description: Building a JSON tokenizer with TLEX
section: examples
useExamples: true
---

## Overview

This example demonstrates building a complete tokenizer for JSON documents. JSON has a simple grammar that makes it perfect for learning tokenization concepts.

## JSON Token Types

| Token | Pattern | Examples |
|-------|---------|----------|
| STRING | `"..."` with escapes | `"hello"`, `"line\nbreak"` |
| NUMBER | integers and floats | `42`, `-3.14`, `1e10` |
| BOOLEAN | `true` or `false` | `true`, `false` |
| NULL | `null` | `null` |
| LBRACE/RBRACE | `{` and `}` | Object delimiters |
| LBRACKET/RBRACKET | `[` and `]` | Array delimiters |
| COLON | `:` | Key-value separator |
| COMMA | `,` | Element separator |

## Basic Implementation

```typescript
import { Tokenizer } from 'tlex';

const jsonLexer = new Tokenizer();

// Structural tokens
jsonLexer.add(/\{/, { tag: "LBRACE" });
jsonLexer.add(/\}/, { tag: "RBRACE" });
jsonLexer.add(/\[/, { tag: "LBRACKET" });
jsonLexer.add(/\]/, { tag: "RBRACKET" });
jsonLexer.add(/:/, { tag: "COLON" });
jsonLexer.add(/,/, { tag: "COMMA" });

// Values
jsonLexer.add(/"(?:[^"\\]|\\.)*"/, { tag: "STRING" });
jsonLexer.add(/-?[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/, { tag: "NUMBER" });
jsonLexer.add(/true|false/, { tag: "BOOLEAN" });
jsonLexer.add(/null/, { tag: "NULL" });

// Whitespace (skip)
jsonLexer.add(/\s+/, { skip: true });
```

## Try It Live

<div id="example-json" data-example-runner data-example-config='{"rules": "%token LBRACE /\\{/\n%token RBRACE /\\}/\n%token LBRACKET /\\[/\n%token RBRACKET /\\]/\n%token COLON /:/\n%token COMMA /,/\n%token STRING /\"(?:[^\"\\\\]|\\\\.)*\"/\n%token NUMBER /-?[0-9]+(?:\\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/\n%token BOOLEAN /true|false/\n%token NULL /null/\n%skip /\\s+/", "input": "{\"name\": \"John\", \"age\": 30, \"active\": true}"}'></div>

## Enhanced Implementation

Add value processing callbacks for a more useful tokenizer:

```typescript
import { Tokenizer } from 'tlex';

const jsonLexer = new Tokenizer();

// Structural tokens
jsonLexer.add(/\{/, { tag: "LBRACE" });
jsonLexer.add(/\}/, { tag: "RBRACE" });
jsonLexer.add(/\[/, { tag: "LBRACKET" });
jsonLexer.add(/\]/, { tag: "RBRACKET" });
jsonLexer.add(/:/, { tag: "COLON" });
jsonLexer.add(/,/, { tag: "COMMA" });

// String with escape processing
jsonLexer.add(/"(?:[^"\\]|\\.)*"/, { tag: "STRING" }, (rule, tape, token) => {
  // Remove quotes
  let value = token.value.slice(1, -1);

  // Process escape sequences
  value = value
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );

  token.value = value;
  return token;
});

// Number with conversion
jsonLexer.add(/-?[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/, { tag: "NUMBER" },
  (rule, tape, token) => {
    token.numValue = parseFloat(token.value);
    return token;
  }
);

// Boolean with conversion
jsonLexer.add(/true|false/, { tag: "BOOLEAN" }, (rule, tape, token) => {
  token.boolValue = token.value === 'true';
  return token;
});

// Null
jsonLexer.add(/null/, { tag: "NULL" }, (rule, tape, token) => {
  token.value = null;
  return token;
});

// Whitespace (skip)
jsonLexer.add(/\s+/, { skip: true });
```

## Usage Example

```typescript
const input = '{"name": "John Doe", "age": 30, "scores": [95, 87, 92]}';
const tokens = jsonLexer.tokenize(input);

for (const token of tokens) {
  console.log(`${token.tag}: ${JSON.stringify(token.value)}`);
}

// Output:
// LBRACE: "{"
// STRING: "name"
// COLON: ":"
// STRING: "John Doe"
// COMMA: ","
// STRING: "age"
// COLON: ":"
// NUMBER: "30"
// COMMA: ","
// STRING: "scores"
// COLON: ":"
// LBRACKET: "["
// NUMBER: "95"
// COMMA: ","
// NUMBER: "87"
// COMMA: ","
// NUMBER: "92"
// RBRACKET: "]"
// RBRACE: "}"
```

## Pattern Breakdown

### String Pattern

```
"(?:[^"\\]|\\.)*"
```

| Part | Meaning |
|------|---------|
| `"` | Opening quote |
| `(?:...)` | Non-capturing group |
| `[^"\\]` | Any char except quote or backslash |
| `\|` | OR |
| `\\.` | Backslash followed by any char (escape) |
| `*` | Zero or more of the group |
| `"` | Closing quote |

### Number Pattern

```
-?[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?
```

| Part | Meaning |
|------|---------|
| `-?` | Optional minus sign |
| `[0-9]+` | One or more digits (integer part) |
| `(?:\.[0-9]+)?` | Optional decimal part |
| `(?:[eE][+-]?[0-9]+)?` | Optional exponent |

## Error Handling

Add error handling for invalid JSON:

```typescript
jsonLexer.onError = (error, tape, startIndex) => {
  const char = tape.charAt(startIndex);
  const context = tape.substring(
    Math.max(0, startIndex - 10),
    Math.min(tape.length, startIndex + 10)
  );
  throw new Error(
    `Invalid JSON character '${char}' at position ${startIndex}\n` +
    `Context: ...${context}...`
  );
};
```

## Complete File

Here's the complete implementation ready to use:

```typescript
// json-lexer.ts
import { Tokenizer, Token } from 'tlex';

export function createJSONLexer(): Tokenizer {
  const lexer = new Tokenizer();

  // Structural
  lexer.add(/\{/, { tag: "LBRACE" });
  lexer.add(/\}/, { tag: "RBRACE" });
  lexer.add(/\[/, { tag: "LBRACKET" });
  lexer.add(/\]/, { tag: "RBRACKET" });
  lexer.add(/:/, { tag: "COLON" });
  lexer.add(/,/, { tag: "COMMA" });

  // Values with processing
  lexer.add(/"(?:[^"\\]|\\.)*"/, { tag: "STRING" }, processString);
  lexer.add(/-?[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/, { tag: "NUMBER" }, processNumber);
  lexer.add(/true|false/, { tag: "BOOLEAN" }, processBoolean);
  lexer.add(/null/, { tag: "NULL" });

  // Skip whitespace
  lexer.add(/\s+/, { skip: true });

  return lexer;
}

function processString(rule: any, tape: any, token: Token): Token {
  token.value = JSON.parse(token.value); // Use JSON.parse for proper unescaping
  return token;
}

function processNumber(rule: any, tape: any, token: Token): Token {
  token.numValue = parseFloat(token.value);
  return token;
}

function processBoolean(rule: any, tape: any, token: Token): Token {
  token.boolValue = token.value === 'true';
  return token;
}
```
