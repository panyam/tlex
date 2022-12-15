export const LEXER = String.raw`
  %resyntax   flex

  %define   O             [0-7]
  %define   D             [0-9]
  %define   NZ            [1-9]
  %define   L             [a-zA-Z_]
  %define   A             [a-zA-Z_0-9]
  %define   H             [a-fA-F0-9]
  %define   HP            (0[xX])
  %define   E             ([Ee][+-]?{D}+)
  %define   P             ([Pp][+-]?{D}+)
  %define   FS            (f|F|l|L)
  %define   IS            (((u|U)(l|L|ll|LL)?)|((l|L|ll|LL)(u|U)?))
  %define   CP            (u|U|L)
  %define   SP            (u8|u|U|L)
  %define   ES            (\\(['"\?\\abfnrtv]|[0-7]{1,3}|x[a-fA-F0-9]+))
  %define   WS            [ \t\v\n\f\r]

  // comments
  %skip                   "/*"[.\n]*?"*/"
  %skip                   "//".*$
  %skip                   {WS}+

  %token AUTO                 "auto"
  %token BREAK                "break"
  %token CASE                 "case"
  %token CHAR                 "char"
  %token CONST                "const"
  %token CONTINUE             "continue"
  %token DEFAULT              "default"
  %token DO                   "do"
  %token DOUBLE               "double"
  %token ELSE                 "else"
  %token ENUM                 "enum"
  %token EXTERN               "extern"
  %token FLOAT                "float"
  %token FOR                  "for"
  %token GOTO                 "goto"
  %token IF                   "if"
  %token INLINE               "inline"
  %token INT                  "int"
  %token LONG                 "long"
  %token REGISTER             "register"
  %token RESTRICT             "restrict"
  %token RETURN               "return"
  %token SHORT                "short"
  %token SIGNED               "signed"
  %token SIZEOF               "sizeof"
  %token STATIC               "static"
  %token STRUCT               "struct"
  %token SWITCH               "switch"
  %token TYPEDEF              "typedef"
  %token UNION                "union"
  %token UNSIGNED             "unsigned"
  %token VOID                 "void"
  %token VOLATILE             "volatile"
  %token WHILE                "while"

  %token ALIGNAS              "_Alignas"
  %token ALIGNOF              "_Alignof"
  %token ATOMIC               "_Atomic"
  %token BOOL                 "_Bool"
  %token COMPLEX              "_Complex"
  %token GENERIC              "_Generic"
  %token IMAGINARY            "_Imaginary"
  %token NORETURN             "_Noreturn"
  %token STATIC_ASSERT        "_Static_assert"
  %token THREAD_LOCAL         "_Thread_local"
  %token FUNC_NAME            "__func__"

  %token IDENTIFIER           {L}{A}*

  %token I_CONSTANT           {HP}{H}+{IS}?
  %token I_CONSTANT           {NZ}{D}*{IS}?
  %token I_CONSTANT           "0"{O}*{IS}?
  %token I_CONSTANT           {CP}?"'"([^'\\\n]|{ES})+"'"

  %token F_CONSTANT           {D}+{E}{FS}?
  %token F_CONSTANT           {D}*"."{D}+{E}?{FS}?
  %token F_CONSTANT           {D}+"."{E}?{FS}?
  %token F_CONSTANT           {HP}{H}+{P}{FS}?
  %token F_CONSTANT           {HP}{H}*"."{H}+{P}{FS}?
  %token F_CONSTANT           {HP}{H}+"."{P}{FS}?

  %token STRING_LITERAL       ({SP}?\"([^"\\\n]|{ES})*\"{WS}*)+

  %token ELLIPSIS           "..."
  %token RIGHT_ASSIGN       ">>="
  %token LEFT_ASSIGN        "<<="
  %token ADD_ASSIGN         "+="
  %token SUB_ASSIGN         "-="
  %token MUL_ASSIGN         "*="
  %token DIV_ASSIGN         "/="
  %token MOD_ASSIGN         "%="
  %token AND_ASSIGN         "&="
  %token XOR_ASSIGN         "^="
  %token OR_ASSIGN          "|="
  %token RIGHT_OP           ">>"
  %token LEFT_OP            "<<"
  %token INC_OP             "++"
  %token DEC_OP             "--"
  %token PTR_OP             "->"
  %token AND_OP             "&&"
  %token OR_OP              "||"
  %token LE_OP              "<="
  %token GE_OP              ">="
  %token EQ_OP              "=="
  %token NE_OP              "!="
  %token ';'                ";"
  %token '{'                ("{"|"<%")
  %token '}'                ("}"|"%>")
  %token ','                ","
  %token ':'                ":"
  %token '='                "="
  %token '('                "("
  %token ')'                ")"
  %token '['                ("["|"<:")
  %token ']'                ("]"|":>")
  %token '.'                "."
  %token '&'                "&"
  %token '!'                "!"
  %token '~'                "~"
  %token '-'                "-"
  %token '+'                "+"
  %token '*'                "*"
  %token '/'                "/"
  %token '%'                "%"
  %token '<'                "<"
  %token '>'                ">"
  %token '^'                "^"
  %token '|'                "|"
  %token '?'                "?"
`;

