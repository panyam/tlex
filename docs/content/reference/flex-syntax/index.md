---
title: Flex Syntax
description: Flex-style extended regular expression syntax
section: reference
---

## Overview

TLEX supports Flex-style extended regex syntax for more powerful pattern matching.

## Extended Features

### Named Definitions

```
DIGIT   [0-9]
LETTER  [a-zA-Z]
IDENT   {LETTER}({LETTER}|{DIGIT})*
```

### Start Conditions

```
<INITIAL>pattern   { action }
<STRING>pattern    { action }
```

### Trailing Context

```
abc/def   { /* matches "abc" only if followed by "def" */ }
```

## Example

```
%token NUMBER  [0-9]+
%token STRING  \"[^\"]*\"
%skip          [ \t\n]+
```
