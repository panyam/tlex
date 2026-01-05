---
title: Concepts
description: Core concepts behind TLEX
section: concepts
---

## Overview

TLEX is built on several key concepts that work together to provide a flexible and powerful lexical analysis system.

## Core Components

### Tokenizer

The main entry point for lexical analysis. You define rules and use the tokenizer to process input text into tokens.

### Rules

Rules define how input text is matched and converted to tokens. Each rule has:
- A pattern (regex or AST)
- Optional configuration (tag, priority, skip, states)
- Optional callback for custom processing

### Patterns

Patterns can be specified using:
- JavaScript RegExp syntax (`/[a-z]+/`)
- Flex extended syntax
- Programmatic AST construction

## Learn More

- [Regex AST](/tlex/concepts/regex-ast/) - How patterns are represented internally
- [VM Architecture](/tlex/concepts/vm-architecture/) - How pattern matching works
