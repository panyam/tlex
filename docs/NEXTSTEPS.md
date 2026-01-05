# TLEX Documentation - Next Steps

## Completed

- [x] Project scaffold (main.go, templates, webpack config)
- [x] Template system (BasePage, Header, Sidebar, Content, Footer)
- [x] Webpack bundling with DocsPage and PlaygroundPage entries
- [x] DockView-based playground with panels (Rules, Input, Tokens, Console)
- [x] Theme support (light/dark mode)
- [x] Getting Started documentation
- [x] CSS organization (variables, tokens, playground components)
- [x] s3gen ParseMD fix for HTML files

## In Progress

- [ ] API Reference documentation - Complete Tokenizer, Token, Rule, Tape APIs
- [ ] Examples content - JSON tokenizer, Calculator, C lexer with states

## Pending

- [ ] Concepts documentation
  - [ ] Regex AST - Document all node types
  - [ ] VM Architecture - Thompson NFA, threads, execution model
- [ ] Reference documentation
  - [ ] JS Regex Syntax - Full JavaScript regex support
  - [ ] Flex Syntax - Flex-specific patterns and differences
  - [ ] Rule Configuration - priority, skip, activeStates
  - [ ] Tokenizer States - State machine usage

## Known Issues

- Playground bundle size is large (~843KB) due to Ace editor and DockView
- Consider lazy loading or code splitting for better performance

## Architecture Notes

- Uses s3gen for static site generation
- Templar for template includes (`{{# include "file.html" #}}`)
- Webpack generates script include templates (gen.DocsPage.html, gen.PlaygroundPage.html)
- CSS uses variables for theming (see static/css/components/variables.css)
- Playground uses DockView with custom theme variables
