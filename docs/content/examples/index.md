---
title: Examples
description: Real-world TLEX examples
section: examples
---

## Example Tokenizers

Learn by example with these real-world tokenizers:

- [JSON Tokenizer](/tlex/examples/json-tokenizer/) - Tokenize JSON documents
- [Calculator](/tlex/examples/calculator/) - Simple expression tokenizer
- [C Lexer](/tlex/examples/c-lexer/) - C-style language tokenizer

## Quick Examples

### Simple Tokenizer

```typescript
import { Tokenizer } from 'tlex';

const lexer = new Tokenizer();
lexer.add(/[0-9]+/, { tag: "NUMBER" });
lexer.add(/[a-z]+/, { tag: "WORD" });
lexer.add(/\s+/, { skip: true });

lexer.tokenize("hello 42 world");
```

### With Callbacks

```typescript
lexer.add(/"[^"]*"/, { tag: "STRING" }, (rule, tape, token) => {
  // Remove quotes from value
  token.value = token.value.slice(1, -1);
  return token;
});
```
