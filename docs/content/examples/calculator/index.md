---
title: Calculator Tokenizer
description: Tokenizer for arithmetic expressions
section: examples
---

## Overview

A simple tokenizer for arithmetic expressions.

## Implementation

```typescript
import { Tokenizer } from 'tlex';

const calcLexer = new Tokenizer();

// Numbers (including decimals)
calcLexer.add(/[0-9]+(\.[0-9]+)?/, { tag: "NUMBER" });

// Operators
calcLexer.add(/\+/, { tag: "PLUS" });
calcLexer.add(/-/, { tag: "MINUS" });
calcLexer.add(/\*/, { tag: "MULTIPLY" });
calcLexer.add(/\//, { tag: "DIVIDE" });
calcLexer.add(/\^/, { tag: "POWER" });

// Parentheses
calcLexer.add(/\(/, { tag: "LPAREN" });
calcLexer.add(/\)/, { tag: "RPAREN" });

// Variables
calcLexer.add(/[a-zA-Z_][a-zA-Z0-9_]*/, { tag: "VARIABLE" });

// Whitespace
calcLexer.add(/\s+/, { skip: true });
```

## Usage

```typescript
const tokens = calcLexer.tokenize("2 + 3 * x");
// NUMBER, PLUS, NUMBER, MULTIPLY, VARIABLE
```
