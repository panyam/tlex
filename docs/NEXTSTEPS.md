# TLEX Documentation - Next Steps

## Completed

- [x] Project scaffold (main.go, templates, webpack config)
- [x] Template system (BasePage, Header, Sidebar, Content, Footer)
- [x] Webpack bundling with DocsPage and PlaygroundPage entries
- [x] DockView-based playground with panels (Rules, Input, Tokens, Console)
- [x] Theme support (light/dark mode)
- [x] Getting Started documentation with interactive example
- [x] CSS organization (variables, tokens, playground components)
- [x] s3gen ParseMD fix for HTML files
- [x] API Reference documentation - Tokenizer, Token, TokenBuffer, Tape, Rule, RuleConfig
- [x] JS Regex Syntax documentation - Full JavaScript regex feature reference
- [x] ExampleRunner component - Interactive code examples (like Galore's)
- [x] Incremental Tokenizer API reference - Full IncrementalTokenizer documentation
- [x] Editor Integration guide - Monaco, CodeMirror, Ace integration patterns
- [x] Playground comparison view - Two-column full vs incremental tokenizer comparison
- [x] Real-time tokenization modes - On-click and real-time (as you type) modes
- [x] Concepts documentation - Regex AST and VM Architecture
- [x] C Lexer example - State-based comments, preprocessor, operators

## Pending

(No pending tasks - documentation complete!)

## Completed (Reference)

- [x] Flex Syntax documentation - Comprehensive Flex regex features
- [x] Rule Configuration documentation - priority, skip, activeStates, callbacks
- [x] Tokenizer States documentation - State management patterns
- [x] Examples overview - Quick start patterns and common use cases
- [x] JSON Tokenizer example - Complete with interactive demo
- [x] Calculator example - Operators, functions, constants
- [x] Guides section - New section for integration tutorials

## Known Issues

- Playground bundle size is large (~864KB) due to Ace editor and DockView
- ExampleRunner bundle is 648KB (shares Ace editor chunk)
- Consider lazy loading or code splitting for better performance

## Architecture Notes

- Uses s3gen for static site generation
- Templar for template includes (`{{# include "file.html" #}}`)
- Webpack generates script include templates (gen.DocsPage.html, gen.PlaygroundPage.html, gen.ExampleRunner.html)
- CSS uses variables for theming (see static/css/components/variables.css)
- Playground uses DockView with custom theme variables
- ExampleRunner uses DSL syntax (`%token`, `%skip`, `%define`) for rule definitions
- Pages with `useExamples: true` frontmatter load ExampleRunner scripts
