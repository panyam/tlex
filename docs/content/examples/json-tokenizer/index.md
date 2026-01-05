---
title: JSON Tokenizer
description: Building a JSON tokenizer with TLEX
section: examples
---

## Overview

This example shows how to build a tokenizer for JSON documents.

## Implementation

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

// Whitespace
jsonLexer.add(/\s+/, { skip: true });
```

## Usage

```typescript
const input = '{"name": "John", "age": 30}';
const tokens = jsonLexer.tokenize(input);
```
