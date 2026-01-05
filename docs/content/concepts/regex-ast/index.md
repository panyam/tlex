---
title: Regex AST
description: Understanding the regex abstract syntax tree
section: concepts
---

## Overview

TLEX represents regular expressions as an Abstract Syntax Tree (AST). This allows for:
- Programmatic pattern construction
- Pattern analysis and optimization
- Support for multiple regex syntaxes

## AST Node Types

### Union (Alternation)

Represents `a|b` - matches either a or b.

```typescript
import { Union, LeafChar } from 'tlex';

const pattern = new Union(
  LeafChar.Single('a'),
  LeafChar.Single('b')
);
```

### Cat (Concatenation)

Represents `ab` - matches a followed by b.

### Quant (Quantifiers)

Represents `*`, `+`, `?`, `{n,m}` - repetition patterns.

### CharGroup (Character Classes)

Represents `[a-z]`, `[^0-9]` - character sets.

## Building Patterns

You can build patterns programmatically or parse from string syntax:

```typescript
import { exprFromJSRE } from 'tlex';

// Parse from JavaScript regex string
const pattern = exprFromJSRE('[a-z]+');
```
