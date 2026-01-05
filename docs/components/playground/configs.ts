/**
 * configs.ts - Built-in lexer configurations for the playground
 */

export interface BuiltinLexer {
  name: string;
  label: string;
  rules: string;
  sampleInput: string;
  selected?: boolean;
}

export const builtinLexers: BuiltinLexer[] = [
  {
    name: "json",
    label: "JSON",
    selected: true,
    rules: `%token OPEN_BRACE   "{"
%token CLOSE_BRACE  "}"
%token OPEN_SQ      "["
%token CLOSE_SQ     "]"
%token COMMA        ","
%token COLON        ":"
%token NULL         "null"
%token TRUE         "true"
%token FALSE        "false"
%token NUMBER /-?\\d+(\\.\\d+)?([eE][+-]?\\d+)?/
%token STRING /"(?:[^"\\\\]|\\\\.)*"/
%skip /[ \\t\\n\\f\\r]+/`,
    sampleInput: `{
  "name": "Milky Way",
  "age": 4600000000,
  "star": "sun",
  "planets": ["Mercury", "Venus", "Earth"],
  "hot": true,
  "empty": null
}`,
  },
  {
    name: "c11",
    label: "C11",
    rules: `// C11 Lexer Rules
%token AUTO "auto"
%token BREAK "break"
%token CASE "case"
%token CHAR "char"
%token CONST "const"
%token CONTINUE "continue"
%token DEFAULT "default"
%token DO "do"
%token DOUBLE "double"
%token ELSE "else"
%token ENUM "enum"
%token EXTERN "extern"
%token FLOAT "float"
%token FOR "for"
%token GOTO "goto"
%token IF "if"
%token INT "int"
%token LONG "long"
%token REGISTER "register"
%token RETURN "return"
%token SHORT "short"
%token SIGNED "signed"
%token SIZEOF "sizeof"
%token STATIC "static"
%token STRUCT "struct"
%token SWITCH "switch"
%token TYPEDEF "typedef"
%token UNION "union"
%token UNSIGNED "unsigned"
%token VOID "void"
%token VOLATILE "volatile"
%token WHILE "while"

// Operators
%token ARROW "->"
%token INC "++"
%token DEC "--"
%token LSHIFT "<<"
%token RSHIFT ">>"
%token LE "<="
%token GE ">="
%token EQ "=="
%token NE "!="
%token AND "&&"
%token OR "||"
%token PLUS_ASSIGN "+="
%token MINUS_ASSIGN "-="
%token STAR_ASSIGN "*="
%token DIV_ASSIGN "/="
%token MOD_ASSIGN "%="

// Single character operators/punctuation
%token PLUS "+"
%token MINUS "-"
%token STAR "*"
%token DIV "/"
%token MOD "%"
%token LT "<"
%token GT ">"
%token ASSIGN "="
%token NOT "!"
%token BITAND "&"
%token BITOR "|"
%token XOR "^"
%token TILDE "~"
%token QUESTION "?"
%token COLON ":"
%token SEMI ";"
%token COMMA ","
%token DOT "."
%token LPAREN "("
%token RPAREN ")"
%token LBRACE "{"
%token RBRACE "}"
%token LBRACKET "["
%token RBRACKET "]"

// Literals
%token HEX_LITERAL /0[xX][0-9a-fA-F]+/
%token OCT_LITERAL /0[0-7]+/
%token DEC_LITERAL /[1-9][0-9]*/
%token ZERO /0/
%token FLOAT_LITERAL /[0-9]+\\.[0-9]+([eE][+-]?[0-9]+)?[fFlL]?/
%token CHAR_LITERAL /'([^'\\\\]|\\\\.)'/
%token STRING_LITERAL /"([^"\\\\]|\\\\.)*"/

// Identifier
%token IDENTIFIER /[a-zA-Z_][a-zA-Z0-9_]*/

// Skip whitespace and comments
%skip /[ \\t\\n\\r]+/
%skip /\\/\\/[^\\n]*/
%skip /\\/\\*[\\s\\S]*?\\*\\//`,
    sampleInput: `int main(int argc, char *argv[]) {
    printf("Hello, World!\\n");
    return 0;
}`,
  },
  {
    name: "calculator",
    label: "Calculator",
    rules: `// Simple calculator tokenizer
%token NUMBER /[0-9]+(\\.[0-9]+)?/
%token PLUS "+"
%token MINUS "-"
%token STAR "*"
%token SLASH "/"
%token CARET "^"
%token LPAREN "("
%token RPAREN ")"
%token IDENT /[a-zA-Z_][a-zA-Z0-9_]*/
%skip /[ \\t\\n]+/`,
    sampleInput: `2 + 3 * (4 - 1) ^ 2
sin(x) + cos(y)
a * b / c`,
  },
];
