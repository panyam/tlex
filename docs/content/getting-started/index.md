---
title: Getting Started
description: Learn how to install and use TLEX in your project
section: getting-started
---

## Installation

Install TLEX using npm or pnpm:

```bash
npm install tlex
# or
pnpm add tlex
```

## Basic Usage

Create a tokenizer and add rules:

```typescript
import { Tokenizer } from 'tlex';

const lexer = new Tokenizer();

// Add tokenization rules
lexer.add(/[0-9]+/, { tag: "NUMBER" });
lexer.add(/[a-zA-Z_][a-zA-Z0-9_]*/, { tag: "IDENTIFIER" });
lexer.add(/\+|\-|\*|\//, { tag: "OPERATOR" });
lexer.add(/\s+/, { skip: true }); // Skip whitespace

// Tokenize input
const tokens = lexer.tokenize("x + 42 * y");
```

## Next Steps

- Learn about [Regex AST](/tlex/concepts/regex-ast/) to understand how patterns are represented
- Explore the [API Reference](/tlex/reference/api/) for detailed documentation
- Check out [Examples](/tlex/examples/) for real-world use cases
