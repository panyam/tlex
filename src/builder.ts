import { Rule, Regex, REPatternType } from "./core";
import { RegexParser as JSREParser } from "./jsparser";
import { RegexParser as FlexREParser } from "./flexparser";
import { Tape } from "./tape";

export function build(pattern: string | RegExp | Regex, config?: any): Rule {
  if (typeof pattern === "string") {
    const rule = new Rule(exprFromJSRE(pattern, config), config);
    rule.pattern = pattern;
    return rule;
  } else if (pattern.constructor.name == "RegExp") {
    const rule = new Rule(exprFromJSRE(pattern as RegExp, config), config);
    rule.pattern = (pattern as RegExp).source;
    return rule;
  } else {
    // Already compiled expression
    return new Rule(pattern as Regex, config);
  }
}

/*
export function fromRE(pattern: string, config?: any): Rule {
  const expr = new JSREParser(pattern, config).parse();
  const rule = new Rule(expr, config);
  rule.pattern = pattern;
  return rule;
}

export function fromJSRE(re: RegExp, config?: any): Rule {
  const expr = exprFromJSRE(re);
  const rule = new Rule(expr, config);
  rule.pattern = re.source;
  return rule;
}

export function fromFlexRE(re: string, config?: any): Rule {
  const expr = exprFromFlexRE(re);
  const rule = new Rule(expr, config);
  rule.pattern = re;
  return rule;
}
*/

export function flatten(re: REPatternType | REPatternType[], index = 0, rules?: Rule[]): Rule[] {
  rules = rules || [];
  if (typeof re === "string") {
    rules.push(build(re, { tag: index }));
  } else if (re.constructor == RegExp) {
    rules.push(build(re, { tag: index }));
  } else if (re.constructor == Rule) {
    rules.push(re as Rule);
  } else if (re.constructor == Regex) {
    rules.push(new Rule(re as Regex));
  } else {
    const res = re as (RegExp | Rule | string)[];
    for (let i = 0; i < res.length; i++) {
      flatten(res[i], i, rules);
    }
  }
  return rules;
}

export function exprFromFlexRE(pattern: string): Regex {
  const parser = new FlexREParser();
  const expr = parser.parse(new Tape(pattern));
  // if not specified default to false
  if (expr.dotAll == null) expr.dotAll = false;
  if (expr.multiline == null) expr.multiline = false;
  return expr;
}

export function exprFromJSRE(re: string | RegExp, config?: any): Regex {
  config = config || {};
  const isRegExp = typeof re !== "string";
  const pattern = typeof re === "string" ? re : re.source;
  if (isRegExp) config.unicode = (re as RegExp).unicode;
  const expr = new JSREParser(pattern, config).parse();
  if (typeof re !== "string") {
    expr.dotAll = re.dotAll;
    expr.ignoreCase = re.ignoreCase;
    expr.multiline = re.multiline;
  }
  return expr;
}

export function jsRE(strings: TemplateStringsArray, ...keys: any[]): Regex {
  // what we have is the raw value of this template and this can be parsed by our parser
  const merged = String.raw(strings, ...keys);
  return exprFromJSRE(merged);
}

export function flexRE(strings: TemplateStringsArray, ...keys: any[]): Regex {
  const merged = String.raw(strings, ...keys);
  return exprFromFlexRE(merged);
}
