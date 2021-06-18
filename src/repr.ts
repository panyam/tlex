import {
  RegexType,
  Quant,
  Regex,
  Cat,
  Char,
  LeafChar,
  CharGroup,
  CharType,
  Var,
  BackNumRef,
  BackNamedRef,
  LookAhead,
  LookBack,
  Union,
} from "./core";
import { Instr, OpCode, Prog } from "./vm";

export function reprInstr(instr: Instr): string {
  let out = "";
  if (instr.char) {
    out = `new Instr(OpCode.${OpCode[instr.opcode]}, ${reprRegex(instr.char)})`;
  } else {
    out = `new Instr(OpCode.${OpCode[instr.opcode]})`;
  }
  if (instr.args.length > 0) {
    out += ".add(" + instr.args.join(", ") + ")";
  }
  return out;
}

export function reprProg(prog: Prog): string {
  let out = "";
  prog.instrs.forEach((instr) => {
    let irs = "";
    if (instr.char) {
      irs = `OpCode.${OpCode[instr.opcode]}, ${reprRegex(instr.char)}`;
    } else {
      irs = `OpCode.${OpCode[instr.opcode]}, null`;
    }
    if (instr.args.length > 0) {
      irs += ", " + instr.args.join(", ");
    }
    out += `p.add(${irs});`;
  });
  return `Prog.with((p) => { ${out} })`;
}

export function reprRegex(ex: Regex): string {
  const repr = reprRegex;
  let out = "";
  switch (ex.tag) {
    case RegexType.START_OF_INPUT:
      out = "new StartOfInput()";
      break;
    case RegexType.END_OF_INPUT:
      out = "new EndOfInput()";
      break;
    case RegexType.START_OF_WORD:
      out = "new StartOfWord()";
      break;
    case RegexType.END_OF_WORD:
      out = "new EndOfWord()";
      break;
    case RegexType.LOOK_AHEAD:
      out = `new LookAhead(${repr((ex as LookAhead).expr)}, ${repr((ex as LookAhead).cond)}, ${
        (ex as LookAhead).negate
      })`;
      break;
    case RegexType.LOOK_BACK:
      out = `new LookBack(${repr((ex as LookBack).expr)}, ${repr((ex as LookBack).cond)}, ${(ex as LookBack).negate})`;
      break;
    case RegexType.QUANT:
      out = `new Quant(${repr((ex as Quant).expr)}, ${(ex as Quant).minCount}, ${(ex as Quant).maxCount}, ${
        (ex as Quant).greedy
      })`;
      break;
    case RegexType.CAT:
      out = `new Cat(${(ex as Cat).children.map(reprRegex)})`;
      break;
    case RegexType.UNION:
      out = `new Union(${(ex as Union).options.map(reprRegex)})`;
      break;
    case RegexType.CHAR:
      const char = ex as Char;
      switch (char.op) {
        case CharType.AnyChar:
          out = `LeafChar.Any(${char.neg})`;
          break;
        case CharType.SingleChar:
          out = `LeafChar.Single(${(char as LeafChar).args[0]}, ${(char as LeafChar).neg})`;
          break;
        case CharType.CharClass:
          out = `LeafChar.Class(${(char as LeafChar).args[0]}, ${(char as LeafChar).neg})`;
          break;
        case CharType.PropertyEscape:
          out = `LeafChar.PropertyEscape(${(char as LeafChar).args[0]}, ${(char as LeafChar).args[1]}, ${
            (char as LeafChar).neg
          })`;
          break;
        case CharType.CharRange:
          out = `CharGroup.Range(${repr((char as CharGroup).chars[0])},
                                  ${repr((char as CharGroup).chars[1])}, ${(char as CharGroup).neg})`;
          break;
        case CharType.Union:
          out = `CharGroup.Union(${(char as CharGroup).neg}, [${(char as CharGroup).chars.map(repr).join(", ")}])`;
          break;
        case CharType.Intersection:
          out = `CharGroup.Intersection(${(char as CharGroup).neg}, ${(char as CharGroup).chars.map(repr).join(", ")})`;
          break;
        default:
          throw new Error("Custom Char Group - TBD i: " + char.op);
          break;
      }
      break;
    case RegexType.VAR:
      out = `new Var(${(ex as Var).name}, ${(ex as Var).reversed})`;
      break;
    case RegexType.BACK_NUM_REF:
      out = `new BackNumRef(${(ex as BackNumRef).num}, ${(ex as BackNumRef).reversed})`;
      break;
    case RegexType.BACK_NAMED_REF:
      out = `new BackNamedRef(${(ex as BackNamedRef).name}, ${(ex as BackNamedRef).reversed})`;
      break;
    default:
      throw new Error("TBD Custom Expr, Tag: " + ex.tag);
  }
  const options = {} as any;
  let n = 0;
  if (ex.dotAll != null) {
    n++;
    options.dotAll = ex.dotAll;
  }
  if (ex.multiline != null) {
    n++;
    options.multiline = ex.multiline;
  }
  if (ex.ignoreCase != null) {
    n++;
    options.dotAll = ex.dotAll;
  }
  if (ex.groupIndex >= 0) {
    n++;
    options.groupIndex = ex.groupIndex;
  }
  return n > 0 ? out + `.setOptions(JSON.stringify(options)})` : out;
}
