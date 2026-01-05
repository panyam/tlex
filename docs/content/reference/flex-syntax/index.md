---
title: Flex Syntax
description: Flex-style extended regular expression syntax
section: reference
---

## Overview

TLEX supports Flex-style extended regex syntax, providing features familiar to users of the classic Flex/Lex lexer generator. Use Flex syntax when you need features like trailing context, named definitions, or extended pattern modifiers.

```typescript
import { Builder } from "tlex";

// Parse Flex-style patterns
const pattern = Builder.exprFromFlexRE("[0-9]+");
tokenizer.add(pattern, { tag: "NUMBER" });

// Or use the flexRE template literal
import { flexRE } from "tlex";
tokenizer.add(flexRE`[a-zA-Z_][a-zA-Z0-9_]*`, { tag: "IDENT" });
```

## Character Matching

### Basic Characters

Most characters match themselves literally:

```
hello       # Matches "hello"
abc123      # Matches "abc123"
```

### Escape Sequences

| Escape | Description |
|--------|-------------|
| `\n` | Newline |
| `\r` | Carriage return |
| `\t` | Tab |
| `\f` | Form feed |
| `\v` | Vertical tab |
| `\b` | Backspace (in character classes) |
| `\0` | Null character |
| `\\` | Backslash |
| `\'` | Single quote |
| `\"` | Double quote |

### Hex and Unicode Escapes

```
\x41        # Matches "A" (2-digit hex)
\u0041      # Matches "A" (4-digit unicode)
```

## Character Classes

### Basic Classes

| Pattern | Description |
|---------|-------------|
| `[abc]` | Any character in set |
| `[^abc]` | Any character NOT in set |
| `[a-z]` | Character range |
| `[a-zA-Z0-9]` | Multiple ranges |

### Predefined Classes

| Pattern | Equivalent | Description |
|---------|------------|-------------|
| `.` | `[^\n]` | Any character except newline |
| `\d` | `[0-9]` | Digit |
| `\D` | `[^0-9]` | Non-digit |
| `\w` | `[a-zA-Z0-9_]` | Word character |
| `\W` | `[^a-zA-Z0-9_]` | Non-word character |
| `\s` | `[ \t\n\r\f\v]` | Whitespace |
| `\S` | `[^ \t\n\r\f\v]` | Non-whitespace |

### Character Class Operators

```
[a-z-]      # Range plus literal dash at end
[^0-9]      # Negated class
[[a-z]]     # Nested brackets (POSIX-style)
```

## Quantifiers

### Basic Quantifiers

| Pattern | Description |
|---------|-------------|
| `*` | Zero or more (greedy) |
| `+` | One or more (greedy) |
| `?` | Zero or one (optional) |
| `{n}` | Exactly n times |
| `{n,}` | n or more times |
| `{n,m}` | Between n and m times |

### Lazy Quantifiers

Add `?` after any quantifier for non-greedy matching:

```
a*?         # Zero or more (lazy)
a+?         # One or more (lazy)
a??         # Zero or one (lazy)
a{2,4}?     # 2 to 4 (lazy - prefers 2)
```

## Anchors

| Pattern | Description |
|---------|-------------|
| `^` | Start of line (multiline by default) |
| `$` | End of line (multiline by default) |

**Note:** Unlike JavaScript regex, Flex-style anchors `^` and `$` are multiline by default, matching at line boundaries rather than just input start/end.

```
^hello      # "hello" at start of any line
world$      # "world" at end of any line
```

## Groups

### Capturing Groups

Parentheses create capturing groups:

```
(abc)           # Capture "abc"
([0-9]+)-([0-9]+)   # Capture two number groups
```

### Modifier Groups

Use `(?flags:pattern)` to apply modifiers to a subpattern:

| Modifier | Description |
|----------|-------------|
| `i` | Case-insensitive matching |
| `s` | Dotall mode (. matches newlines) |
| `x` | Extended mode (ignore whitespace and comments) |
| `-` | Negate following modifiers |

```
(?i:hello)      # Case-insensitive "hello"
(?s:a.b)        # "a", any char including newline, "b"
(?x: a b c )    # Matches "abc" (spaces ignored)
(?i-s:text)     # Case-insensitive but NOT dotall
```

### Comment Groups

Use `(?#comment)` for inline comments:

```
[0-9]+(?#digits)\.(?#decimal point)[0-9]+
```

## Alternation

Use `|` for alternatives:

```
cat|dog         # "cat" or "dog"
red|green|blue  # Any of the three colors
(cat|dog)s?     # "cat", "cats", "dog", or "dogs"
```

## Trailing Context (Lookahead)

The `/` operator matches the left pattern only when followed by the right pattern, without consuming the right pattern:

```
abc/def         # Match "abc" only if followed by "def"
[0-9]+/px       # Match digits only if followed by "px"
```

This is equivalent to positive lookahead `(?=...)` in JavaScript regex.

```typescript
// Flex style
tokenizer.add(flexRE`[0-9]+/px`, { tag: "PX_NUMBER" });

// Equivalent JS regex
tokenizer.add(/[0-9]+(?=px)/, { tag: "PX_NUMBER" });
```

## Named Definitions

Reference named patterns using `{name}`:

```typescript
// Define reusable patterns
tokenizer.addVar("DIGIT", Builder.exprFromFlexRE("[0-9]"));
tokenizer.addVar("LETTER", Builder.exprFromFlexRE("[a-zA-Z]"));

// Use in rules with Flex syntax
tokenizer.add(flexRE`{DIGIT}+`, { tag: "NUMBER" });
tokenizer.add(flexRE`{LETTER}({LETTER}|{DIGIT})*`, { tag: "IDENT" });
```

In DSL syntax:

```
%define DIGIT   [0-9]
%define LETTER  [a-zA-Z]
%token NUMBER   {DIGIT}+
%token IDENT    {LETTER}({LETTER}|{DIGIT})*
```

## Raw String Literals

Double quotes create raw string literals where most characters are matched literally:

```
"hello world"   # Matches "hello world" literally
"a.b"           # Matches "a.b" (dot is literal)
"c++"           # Matches "c++" (plus signs are literal)
```

Inside quoted strings, only `\` retains its escape meaning:

```
"line1\nline2"  # Matches "line1", newline, "line2"
"path\\file"    # Matches "path\file"
```

## Extended Mode

With the `x` modifier, whitespace is ignored and `#` starts comments:

```
(?x:
  [0-9]+        # Integer part
  \.            # Decimal point
  [0-9]+        # Fractional part
)
```

This is useful for complex patterns that benefit from formatting.

## Differences from JavaScript Regex

| Feature | Flex Syntax | JS Regex |
|---------|-------------|----------|
| Anchors | Multiline by default | Single-line by default |
| Lookahead | `/pattern` | `(?=pattern)` |
| Variables | `{name}` | Not supported |
| Raw strings | `"text"` | Not supported |
| Extended mode | `(?x:...)` | Not supported |
| Comments | `(?#text)` | Not supported |

## Common Patterns

### Numbers

```
[0-9]+                          # Integer
[0-9]+\.[0-9]+                  # Decimal
[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?   # Scientific
0x[0-9a-fA-F]+                  # Hexadecimal
```

### Strings

```
\"[^"]*\"                       # Double-quoted (simple)
\"([^"\\]|\\.)*\"               # Double-quoted with escapes
'[^']*'                         # Single-quoted
```

### Identifiers

```
[a-zA-Z_][a-zA-Z0-9_]*          # C-style
[a-zA-Z$_][a-zA-Z0-9$_]*        # JavaScript-style
```

### Comments

```
"//".*                          # Single-line (// to end)
"/*"([^*]|\*[^/])*"*/"          # Multi-line /* ... */
```

## Using with the DSL

In the playground and ExampleRunner, use `%token_flex` directive for Flex syntax:

```
%token_flex NUMBER    [0-9]+
%token_flex IDENT     [a-zA-Z_][a-zA-Z0-9_]*
%skip_flex            [ \t\n]+
```

Compare with JS syntax:

```
%token NUMBER    /[0-9]+/
%token IDENT     /[a-zA-Z_][a-zA-Z0-9_]*/
%skip            /\s+/
```
