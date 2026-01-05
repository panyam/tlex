---
title: C Lexer
description: Tokenizer for C-style languages
section: examples
---

## Overview

A tokenizer for C-style programming languages.

## Implementation

```typescript
import { Tokenizer } from 'tlex';

const cLexer = new Tokenizer();

// Keywords
const keywords = ['if', 'else', 'while', 'for', 'return', 'int', 'void', 'char'];
keywords.forEach(kw => {
  cLexer.add(new RegExp(`\\b${kw}\\b`), { tag: "KEYWORD", priority: 2 });
});

// Identifiers (lower priority than keywords)
cLexer.add(/[a-zA-Z_][a-zA-Z0-9_]*/, { tag: "IDENTIFIER", priority: 1 });

// Numbers
cLexer.add(/0x[0-9a-fA-F]+/, { tag: "HEX_NUMBER" });
cLexer.add(/[0-9]+(\.[0-9]+)?/, { tag: "NUMBER" });

// Strings
cLexer.add(/"(?:[^"\\]|\\.)*"/, { tag: "STRING" });

// Characters
cLexer.add(/'(?:[^'\\]|\\.)'/, { tag: "CHAR" });

// Operators
cLexer.add(/==|!=|<=|>=|&&|\|\||<<|>>/, { tag: "OPERATOR" });
cLexer.add(/[+\-*\/%=<>!&|^~]/, { tag: "OPERATOR" });

// Comments
cLexer.add(/\/\/[^\n]*/, { skip: true });
cLexer.add(/\/\*[\s\S]*?\*\//, { skip: true });

// Whitespace
cLexer.add(/\s+/, { skip: true });
```
