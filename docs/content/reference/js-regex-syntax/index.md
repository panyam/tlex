---
title: JavaScript Regex Syntax
description: JavaScript regular expression syntax supported by TLEX
section: reference
---

## Overview

TLEX supports standard JavaScript RegExp syntax for defining patterns.

## Supported Features

### Character Classes
- `[abc]` - Any character in set
- `[^abc]` - Any character not in set
- `[a-z]` - Character range
- `.` - Any character except newline

### Quantifiers
- `*` - Zero or more
- `+` - One or more
- `?` - Zero or one
- `{n}` - Exactly n times
- `{n,}` - n or more times
- `{n,m}` - Between n and m times

### Anchors
- `^` - Start of input
- `$` - End of input
- `\b` - Word boundary

### Escape Sequences
- `\d` - Digit `[0-9]`
- `\w` - Word character `[a-zA-Z0-9_]`
- `\s` - Whitespace
- `\n`, `\r`, `\t` - Newline, carriage return, tab
