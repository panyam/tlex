---
title: Examples
description: Real-world TLEX examples
section: examples
useExamples: true
---

## Overview

Learn TLEX by example with these real-world tokenizers. Each example demonstrates different features and patterns for building lexers.

## Example Tokenizers

| Example | Description | Features Demonstrated |
|---------|-------------|----------------------|
| [JSON Tokenizer](/tlex/examples/json-tokenizer/) | Tokenize JSON documents | String escapes, numbers, literals |
| [Calculator](/tlex/examples/calculator/) | Arithmetic expressions | Operators, precedence setup |
| [C Lexer](/tlex/examples/c-lexer/) | C-style language | Keywords, comments, states |

## Quick Start

### Minimal Tokenizer

The simplest possible tokenizer - just patterns and tags:

```typescript
import { Tokenizer } from 'tlex';

const lexer = new Tokenizer();
lexer.add(/[0-9]+/, { tag: "NUMBER" });
lexer.add(/[a-z]+/, { tag: "WORD" });
lexer.add(/\s+/, { skip: true });

const tokens = lexer.tokenize("hello 42 world");
// WORD: "hello", NUMBER: "42", WORD: "world"
```

<div id="example-minimal" data-example-runner data-example-config='{"rules": "%token NUMBER /[0-9]+/\n%token WORD /[a-z]+/\n%skip /\\s+/", "input": "hello 42 world"}'></div>

### With Value Processing

Use callbacks to transform matched values:

```typescript
// Parse numbers as integers
lexer.add(/[0-9]+/, { tag: "NUMBER" }, (rule, tape, token) => {
  token.numValue = parseInt(token.value, 10);
  return token;
});

// Strip quotes from strings
lexer.add(/"[^"]*"/, { tag: "STRING" }, (rule, tape, token) => {
  token.value = token.value.slice(1, -1);
  return token;
});

// Convert keywords
const KEYWORDS = new Set(["if", "else", "while"]);
lexer.add(/[a-z]+/, { tag: "IDENT" }, (rule, tape, token) => {
  if (KEYWORDS.has(token.value)) {
    token.tag = "KEYWORD";
  }
  return token;
});
```

### With Priority

Handle keyword/identifier conflicts with priority:

```typescript
// Keywords (higher priority)
lexer.add(/if|else|while|for|return/, { tag: "KEYWORD", priority: 10 });

// Identifiers (lower priority)
lexer.add(/[a-zA-Z_][a-zA-Z0-9_]*/, { tag: "IDENT", priority: 0 });

// "if" → KEYWORD, "iffy" → IDENT
```

<div id="example-priority" data-example-runner data-example-config='{"rules": "%token KEYWORD /if|else|while|for|return/\n%token IDENT /[a-zA-Z_][a-zA-Z0-9_]*/\n%token NUMBER /[0-9]+/\n%skip /\\s+/", "input": "if x else iffy return123"}'></div>

### Skipping Comments

Use `skip: true` for tokens that should be consumed but not emitted:

```typescript
// Skip whitespace
lexer.add(/\s+/, { skip: true });

// Skip single-line comments
lexer.add(/\/\/.*/, { skip: true });

// Skip multi-line comments
lexer.add(/\/\*[\s\S]*?\*\//, { skip: true });
```

<div id="example-comments" data-example-runner data-example-config='{"rules": "%token IDENT /[a-zA-Z_][a-zA-Z0-9_]*/\n%token NUMBER /[0-9]+/\n%skip /\\/\\/[^\\n]*/\n%skip /\\s+/", "input": "x = 42 // this is a comment\ny = 10"}'></div>

## Common Patterns

### Numbers

```typescript
// Integer
lexer.add(/[0-9]+/, { tag: "INT" });

// Float
lexer.add(/[0-9]+\.[0-9]+/, { tag: "FLOAT" });

// Scientific notation
lexer.add(/[0-9]+(\.[0-9]+)?[eE][+-]?[0-9]+/, { tag: "SCIENTIFIC" });

// Hexadecimal
lexer.add(/0x[0-9a-fA-F]+/, { tag: "HEX" });

// Binary
lexer.add(/0b[01]+/, { tag: "BINARY" });
```

### Strings

```typescript
// Simple double-quoted
lexer.add(/"[^"]*"/, { tag: "STRING" });

// With escape sequences
lexer.add(/"([^"\\]|\\.)*"/, { tag: "STRING" });

// Single-quoted
lexer.add(/'[^']*'/, { tag: "CHAR" });

// Template literals (backticks)
lexer.add(/`([^`\\]|\\.)*`/, { tag: "TEMPLATE" });
```

### Operators

```typescript
// Multi-character operators first (higher priority)
lexer.add(/==|!=|<=|>=|&&|\|\|/, { tag: "OP", priority: 10 });

// Single-character operators
lexer.add(/[+\-*\/%=<>!&|^~]/, { tag: "OP", priority: 0 });
```

### Delimiters

```typescript
lexer.add(/\(/, { tag: "LPAREN" });
lexer.add(/\)/, { tag: "RPAREN" });
lexer.add(/\[/, { tag: "LBRACKET" });
lexer.add(/\]/, { tag: "RBRACKET" });
lexer.add(/\{/, { tag: "LBRACE" });
lexer.add(/\}/, { tag: "RBRACE" });
lexer.add(/,/, { tag: "COMMA" });
lexer.add(/;/, { tag: "SEMICOLON" });
lexer.add(/:/, { tag: "COLON" });
lexer.add(/\./, { tag: "DOT" });
```

## Error Handling

Handle unexpected characters gracefully:

```typescript
lexer.onError = (error, tape, startIndex) => {
  console.warn(`Unexpected character '${tape.charAt(startIndex)}' at position ${startIndex}`);
  tape.advance(1); // Skip the bad character
  return null;     // Continue tokenizing
};

// Or throw on errors
lexer.onError = (error, tape, startIndex) => {
  throw new Error(`Tokenization error at position ${startIndex}: ${error.message}`);
};
```

## Performance Tips

1. **Order rules by frequency** - Put common patterns first
2. **Use specific patterns** - `/if|else/` is faster than `/[a-z]+/` with keyword check
3. **Avoid backtracking** - Prefer `[^"]*` over `.*?` when possible
4. **Skip early** - Put skip rules (whitespace) early for common input
5. **Use character classes** - `/[aeiou]/` is faster than `/a|e|i|o|u/`
