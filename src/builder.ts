import { Rule, Regex, REPatternType } from "./core";
import { RegexParser as JSREParser } from "./jsparser";

export function build(pattern: string | RegExp | Regex, config?: any): Rule {
  if (typeof pattern === "string") {
    return fromRE(pattern, config);
  } else if (pattern.constructor.name == "RegExp") {
    return fromJSRE(pattern as RegExp, config);
  } else {
    return new Rule(pattern as Regex, config);
  }
}

export function fromRE(pattern: string, config?: any): Rule {
  const expr = new JSREParser(pattern, config).parse();
  const rule = new Rule(expr, config);
  rule.pattern = pattern;
  return rule;
}

export function fromJSRE(re: RegExp, config?: any): Rule {
  const pattern = re.source;
  const expr = new JSREParser(pattern, config).parse();
  const rule = new Rule(expr, config);
  rule.pattern = pattern;
  expr.dotAll = re.dotAll;
  expr.ignoreCase = re.ignoreCase;
  expr.multiline = re.multiline;
  return rule;
}

export function fromFlexRE(re: string, config?: any): Rule {
  const pattern = re;
  const parser = new JSREParser(pattern, config);
  const expr = parser.parse();
  const rule = new Rule(expr, config);
  rule.pattern = pattern;
  return rule;
}

export function flatten(re: REPatternType | REPatternType[], index = 0, rules?: Rule[]): Rule[] {
  rules = rules || [];
  if (typeof re === "string") {
    rules.push(fromRE(re, { tag: index }));
  } else if (re.constructor == RegExp) {
    rules.push(fromJSRE(re, { tag: index }));
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
