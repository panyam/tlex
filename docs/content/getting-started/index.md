---
title: Getting Started
description: Learn how to install and use TLEX in your project
section: getting-started
useExamples: true
---

## What is TLEX?

TLEX is a powerful lexical analyzer and tokenizer library for TypeScript. It compiles regular expressions into efficient bytecode and executes them using a Thompson NFA-based virtual machine, providing fast and reliable tokenization for your parsing needs.

**Key Features:**
- Multiple regex syntax support (JavaScript RegExp and Flex/Lex)
- Priority-based rule matching
- Lexical states for context-sensitive tokenization
- Capture groups and backreferences
- Custom match callbacks for token transformation

## Installation

Install TLEX using npm or pnpm:

```bash
npm install tlex
# or
pnpm add tlex
```

## Quick Start

Create a tokenizer and add pattern rules:

```typescript
import { Tokenizer } from 'tlex';

// Create a new tokenizer
const lexer = new Tokenizer();

// Add tokenization rules
lexer.add(/[0-9]+/, { tag: "NUMBER" });
lexer.add(/[a-zA-Z_][a-zA-Z0-9_]*/, { tag: "IDENTIFIER" });
lexer.add(/\+|\-|\*|\//, { tag: "OPERATOR" });
lexer.add(/\s+/, { skip: true }); // Skip whitespace

// Tokenize input
const tokens = lexer.tokenize("x + 42 * y");

for (const token of tokens) {
  console.log(`${token.tag}: "${token.value}" at ${token.start}-${token.end}`);
}
// Output:
// IDENTIFIER: "x" at 0-1
// OPERATOR: "+" at 2-3
// NUMBER: "42" at 4-6
// OPERATOR: "*" at 7-8
// IDENTIFIER: "y" at 9-10
```

### Try It Live

Edit the rules and input below to see tokenization in action:

<div id="example-quickstart" data-example-runner data-example-config='{"rules": "%token NUMBER /[0-9]+/\n%token IDENTIFIER /[a-zA-Z_][a-zA-Z0-9_]*/\n%token OPERATOR /[+*\\/-]/\n%skip /\\s+/", "input": "x + 42 * y"}'></div>

## Pattern Formats

TLEX accepts patterns in multiple formats:

```typescript
// JavaScript RegExp object
lexer.add(/[0-9]+/, { tag: "NUMBER" });

// String pattern (JS regex syntax)
lexer.add("[a-z]+", { tag: "WORD" });

// Programmatic Regex AST (advanced)
import { LeafChar, Quant } from 'tlex';
const digits = new Quant(LeafChar.Range('0', '9'), 1);
lexer.add(digits, { tag: "DIGITS" });
```

## Using Callbacks

Transform tokens as they're matched using callback functions:

```typescript
// Remove quotes from string literals
lexer.add(/"[^"]*"/, { tag: "STRING" }, (rule, tape, token) => {
  token.value = token.value.slice(1, -1); // Strip quotes
  return token;
});

// Convert numbers to actual numeric values
lexer.add(/[0-9]+/, { tag: "NUMBER" }, (rule, tape, token) => {
  token.numValue = parseInt(token.value, 10);
  return token;
});

// Skip certain matches conditionally
lexer.add(/\/\/.*/, { tag: "COMMENT" }, (rule, tape, token) => {
  return null; // Return null to skip the token
});
```

## Rule Priority

When multiple rules match at the same position, priority determines which wins:

```typescript
// Keywords have higher priority than identifiers
const keywords = ['if', 'else', 'while', 'for', 'return'];
keywords.forEach(kw => {
  lexer.add(new RegExp(`\\b${kw}\\b`), { tag: "KEYWORD", priority: 2 });
});

// Identifiers have lower priority (default is 0)
lexer.add(/[a-zA-Z_][a-zA-Z0-9_]*/, { tag: "IDENTIFIER", priority: 1 });
```

## Iterative Tokenization

For streaming or incremental parsing, use `next()` instead of `tokenize()`:

```typescript
import { Tokenizer, Tape } from 'tlex';

const lexer = new Tokenizer();
lexer.add(/[0-9]+/, { tag: "NUMBER" });
lexer.add(/\s+/, { skip: true });

const tape = new Tape("123 456 789");

let token;
while ((token = lexer.next(tape)) !== null) {
  console.log(token.tag, token.value);
}
```

## TokenBuffer for Lookahead

When building parsers, use `TokenBuffer` for lookahead without consuming tokens:

```typescript
import { Tokenizer, TokenBuffer, Tape } from 'tlex';

const lexer = new Tokenizer();
// ... add rules ...

const tape = new Tape("x + y * z");
const buffer = new TokenBuffer(lexer);

// Peek at the next token without consuming
const first = buffer.peek(tape, 0);  // First token
const second = buffer.peek(tape, 1); // Second token

// Consume the next token
const token = buffer.next(tape);

// Match with a predicate
const op = buffer.match((t) => t.tag === "OPERATOR");
```

## Error Handling

Handle tokenization errors gracefully:

```typescript
lexer.onError = (error, tape, startIndex) => {
  console.warn(`Unexpected character at position ${startIndex}: ${tape.charAt(startIndex)}`);
  tape.advance(1); // Skip the problematic character
  return null; // Continue tokenization (return error to stop)
};
```

## Next Steps

- **[Installation Details](/tlex/getting-started/installation/)** - TypeScript configuration and bundler setup
- **[API Reference](/tlex/reference/api/)** - Complete Tokenizer, Token, and Rule documentation
- **[Rule Configuration](/tlex/reference/rule-config/)** - Priority, skip, and state options
- **[Tokenizer States](/tlex/reference/tokenizer-states/)** - Context-sensitive lexing
- **[Examples](/tlex/examples/)** - Real-world tokenizer implementations
