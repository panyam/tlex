---
title: API Reference
description: Complete TLEX API documentation
section: reference
---

## Tokenizer

The main class for building lexers.

### Constructor

```typescript
const lexer = new Tokenizer();
```

### Methods

#### add(pattern, config?, onMatch?)

Add a tokenization rule.

```typescript
lexer.add(/[0-9]+/, { tag: "NUMBER" });
lexer.add(/[a-z]+/, { tag: "IDENT" }, (rule, tape, token) => {
  // Custom processing
  return token;
});
```

#### tokenize(input)

Tokenize a string and return all tokens.

```typescript
const tokens = lexer.tokenize("hello 123");
```

#### next(tape)

Get the next token from input.

## Token

Represents a matched token.

### Properties

- `tag` - Token type identifier
- `value` - Matched string value
- `start` - Start position in input
- `end` - End position in input
