---
title: VM Architecture
description: How the regex virtual machine works
section: concepts
---

## Overview

TLEX uses a virtual machine (VM) approach to regex matching, similar to Pike's NFA implementation. This provides efficient pattern matching with predictable performance.

## Compilation Pipeline

1. **Parse**: Regex string → AST
2. **Compile**: AST → VM Instructions
3. **Execute**: VM runs instructions against input

## Instruction Set

The VM uses a set of opcodes including:
- `CHAR` - Match a single character
- `RANGE` - Match character range
- `SPLIT` - Fork execution (for alternation)
- `JUMP` - Unconditional jump
- `MATCH` - Successful match
- And more...

## Execution Model

The VM maintains multiple threads of execution to handle non-deterministic patterns efficiently. When a split instruction is encountered, the VM creates two execution paths.
