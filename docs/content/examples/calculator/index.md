---
title: Calculator Tokenizer
description: Tokenizer for arithmetic expressions
section: examples
useExamples: true
---

## Overview

This example builds a tokenizer for arithmetic expressions, supporting numbers, operators, variables, and function calls. This is the foundation for building a calculator or expression evaluator.

## Token Types

| Token | Pattern | Examples |
|-------|---------|----------|
| NUMBER | integers and decimals | `42`, `3.14`, `.5` |
| OPERATOR | arithmetic operators | `+`, `-`, `*`, `/`, `^`, `%` |
| LPAREN/RPAREN | parentheses | `(`, `)` |
| VARIABLE | identifiers | `x`, `PI`, `result` |
| FUNCTION | function names | `sin`, `cos`, `sqrt` |
| COMMA | argument separator | `,` |

## Basic Implementation

```typescript
import { Tokenizer } from 'tlex';

const calcLexer = new Tokenizer();

// Numbers (integers and decimals)
calcLexer.add(/[0-9]+(\.[0-9]+)?|\.[0-9]+/, { tag: "NUMBER" });

// Operators (multi-char first for priority)
calcLexer.add(/\*\*/, { tag: "POWER", priority: 10 });    // ** for power
calcLexer.add(/[+\-*\/%^]/, { tag: "OPERATOR", priority: 0 });

// Parentheses
calcLexer.add(/\(/, { tag: "LPAREN" });
calcLexer.add(/\)/, { tag: "RPAREN" });

// Comma for function arguments
calcLexer.add(/,/, { tag: "COMMA" });

// Variables/Identifiers
calcLexer.add(/[a-zA-Z_][a-zA-Z0-9_]*/, { tag: "VARIABLE" });

// Whitespace
calcLexer.add(/\s+/, { skip: true });
```

## Try It Live

<div id="example-calc" data-example-runner data-example-config='{"rules": "%token NUMBER /[0-9]+(\\.[0-9]+)?|\\.0-9]+/\n%token POWER /\\*\\*/\n%token OPERATOR /[+\\-*\\/%^]/\n%token LPAREN /\\(/\n%token RPAREN /\\)/\n%token COMMA /,/\n%token VARIABLE /[a-zA-Z_][a-zA-Z0-9_]*/\n%skip /\\s+/", "input": "2 + 3 * (x - 1) ** 2"}'></div>

## Enhanced Implementation

Add function detection and numeric conversion:

```typescript
import { Tokenizer } from 'tlex';

// Known functions
const FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
  'sqrt', 'abs', 'floor', 'ceil', 'round',
  'log', 'log10', 'exp', 'pow', 'min', 'max'
]);

// Known constants
const CONSTANTS: Record<string, number> = {
  'PI': Math.PI,
  'E': Math.E,
  'TAU': Math.PI * 2
};

const calcLexer = new Tokenizer();

// Numbers with conversion
calcLexer.add(/[0-9]+(\.[0-9]+)?|\.[0-9]+/, { tag: "NUMBER" },
  (rule, tape, token) => {
    token.numValue = parseFloat(token.value);
    return token;
  }
);

// Operators
calcLexer.add(/\*\*/, { tag: "POWER", priority: 10 });
calcLexer.add(/\+/, { tag: "PLUS" });
calcLexer.add(/-/, { tag: "MINUS" });
calcLexer.add(/\*/, { tag: "MULTIPLY" });
calcLexer.add(/\//, { tag: "DIVIDE" });
calcLexer.add(/%/, { tag: "MODULO" });

// Parentheses and comma
calcLexer.add(/\(/, { tag: "LPAREN" });
calcLexer.add(/\)/, { tag: "RPAREN" });
calcLexer.add(/,/, { tag: "COMMA" });

// Identifiers (functions, constants, variables)
calcLexer.add(/[a-zA-Z_][a-zA-Z0-9_]*/, { tag: "VARIABLE" },
  (rule, tape, token) => {
    const name = token.value;

    if (FUNCTIONS.has(name)) {
      token.tag = "FUNCTION";
    } else if (name in CONSTANTS) {
      token.tag = "CONSTANT";
      token.numValue = CONSTANTS[name];
    }
    // Otherwise stays as VARIABLE

    return token;
  }
);

// Whitespace
calcLexer.add(/\s+/, { skip: true });
```

## Usage Examples

```typescript
// Simple expression
const tokens1 = calcLexer.tokenize("2 + 3 * 4");
// NUMBER(2), PLUS, NUMBER(3), MULTIPLY, NUMBER(4)

// With variables
const tokens2 = calcLexer.tokenize("x ** 2 + y ** 2");
// VARIABLE(x), POWER, NUMBER(2), PLUS, VARIABLE(y), POWER, NUMBER(2)

// With functions
const tokens3 = calcLexer.tokenize("sqrt(x ** 2 + y ** 2)");
// FUNCTION(sqrt), LPAREN, VARIABLE(x), POWER, NUMBER(2), ...

// With constants
const tokens4 = calcLexer.tokenize("2 * PI * r");
// NUMBER(2), MULTIPLY, CONSTANT(PI), MULTIPLY, VARIABLE(r)
```

## Operator Precedence

While the tokenizer doesn't handle precedence (that's the parser's job), tokens carry enough information for a parser to apply proper operator precedence:

| Precedence | Operators | Associativity |
|------------|-----------|---------------|
| Highest | `()` function calls | Left |
| | `**` power | Right |
| | `*`, `/`, `%` | Left |
| Lowest | `+`, `-` | Left |

## Handling Negative Numbers

There's a subtle issue: is `-5` a negative number or subtraction? The tokenizer treats `-` as an operator. The parser handles the distinction:

```typescript
// "-5" tokenizes as: MINUS, NUMBER(5)
// "3 - 5" tokenizes as: NUMBER(3), MINUS, NUMBER(5)

// The parser determines meaning from context:
// - MINUS at start of expression → unary negation
// - MINUS after operator/LPAREN → unary negation
// - MINUS after NUMBER/RPAREN/VARIABLE → subtraction
```

## Error Cases

```typescript
calcLexer.onError = (error, tape, startIndex) => {
  const char = tape.charAt(startIndex);
  throw new Error(`Invalid character '${char}' in expression at position ${startIndex}`);
};

// Invalid inputs:
// "2 @ 3"     → Error: '@' not recognized
// "2..3"      → Tokenizes as NUMBER(2), DOT(?), DOT(?), NUMBER(3) - parser error
// "2 + + 3"   → Valid tokens, parser handles double operator
```

## Complete Implementation

```typescript
// calc-lexer.ts
import { Tokenizer, Token } from 'tlex';

export enum CalcTokenType {
  NUMBER = "NUMBER",
  PLUS = "PLUS",
  MINUS = "MINUS",
  MULTIPLY = "MULTIPLY",
  DIVIDE = "DIVIDE",
  MODULO = "MODULO",
  POWER = "POWER",
  LPAREN = "LPAREN",
  RPAREN = "RPAREN",
  COMMA = "COMMA",
  FUNCTION = "FUNCTION",
  CONSTANT = "CONSTANT",
  VARIABLE = "VARIABLE"
}

const FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
  'sqrt', 'cbrt', 'abs', 'floor', 'ceil', 'round', 'trunc',
  'log', 'log2', 'log10', 'exp', 'pow', 'min', 'max',
  'sign', 'random'
]);

const CONSTANTS: Record<string, number> = {
  'PI': Math.PI,
  'E': Math.E,
  'TAU': Math.PI * 2,
  'PHI': (1 + Math.sqrt(5)) / 2,  // Golden ratio
  'SQRT2': Math.SQRT2
};

export function createCalcLexer(): Tokenizer {
  const lexer = new Tokenizer();

  // Number
  lexer.add(/[0-9]+(\.[0-9]+)?|\.[0-9]+/, { tag: CalcTokenType.NUMBER },
    (rule, tape, token) => {
      token.numValue = parseFloat(token.value);
      return token;
    }
  );

  // Multi-char operators (higher priority)
  lexer.add(/\*\*/, { tag: CalcTokenType.POWER, priority: 10 });

  // Single-char operators
  lexer.add(/\+/, { tag: CalcTokenType.PLUS });
  lexer.add(/-/, { tag: CalcTokenType.MINUS });
  lexer.add(/\*/, { tag: CalcTokenType.MULTIPLY });
  lexer.add(/\//, { tag: CalcTokenType.DIVIDE });
  lexer.add(/%/, { tag: CalcTokenType.MODULO });

  // Delimiters
  lexer.add(/\(/, { tag: CalcTokenType.LPAREN });
  lexer.add(/\)/, { tag: CalcTokenType.RPAREN });
  lexer.add(/,/, { tag: CalcTokenType.COMMA });

  // Identifiers
  lexer.add(/[a-zA-Z_][a-zA-Z0-9_]*/, { tag: CalcTokenType.VARIABLE },
    (rule, tape, token) => {
      const name = token.value;
      if (FUNCTIONS.has(name.toLowerCase())) {
        token.tag = CalcTokenType.FUNCTION;
      } else if (name.toUpperCase() in CONSTANTS) {
        token.tag = CalcTokenType.CONSTANT;
        token.numValue = CONSTANTS[name.toUpperCase()];
      }
      return token;
    }
  );

  // Whitespace
  lexer.add(/\s+/, { skip: true });

  // Error handling
  lexer.onError = (error, tape, startIndex) => {
    throw new Error(`Invalid character '${tape.charAt(startIndex)}' at position ${startIndex}`);
  };

  return lexer;
}
```
