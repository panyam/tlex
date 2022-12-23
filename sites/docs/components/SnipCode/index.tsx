import React from "react";

import Highlight, { defaultProps } from "prism-react-renderer";
import defaultTheme from "prism-react-renderer/themes/dracula";
import defaultStyles from "./view.module.scss";

/**
 * Strips "common" spaces across all lines that are not empty so that
 * they all can start from the start.
 */
export function stripLinePrefixSpaces(lines: string[]): string[] {
  let minSpaces = -1;
  for (const line of lines) {
    if (line.trim().length > 0) {
      const nSpaces = line.length - line.trimStart().length;
      if (minSpaces < 0 || nSpaces < minSpaces) {
        minSpaces = nSpaces;
      }
    }
  }

  // now modify them
  if (minSpaces > 0) {
    lines = lines.map((l: string) => l.substring(minSpaces));
  }
  return lines;
}

// Built with https://www.peterlunch.com/blog/prism-react-render-nextjs
const SyntaxHighlighter = (props) => {
  const children = props.children;
  const code = children;
  let lines = stripLinePrefixSpaces(children.split("\n"))
  if (props.indent) {
    lines = lines.map(l => "  " + l);
  }
  const cleanedCode = lines.join("\n").trim() + "\n";
  const styles = props.styles || defaultStyles;

  console.log("Code: ", code);
  console.log("Cleaned Code: ", cleanedCode);

  return (
    <>
      <h3 className={styles.sourceTitleSpan}>{props.title || "Source"}</h3>
      <Highlight
        {...defaultProps}
        code={cleanedCode}
        language={props.language || "ts"}
        theme={props.theme || defaultTheme}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre className={className} style={{ ...style }}>
            {tokens.slice(0, -1).map((line, i) => (
              <div {...getLineProps({ line, key: i })}>
                {line.map((token, key) => (
                  <span {...getTokenProps({ token, key })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
      <h3 className={styles.outputTitleSpan}>{props.outputTitle || "Output"}</h3>
      <div>output goes here</div>
    </>
  );
};

export default SyntaxHighlighter;

/*
interface PropType {
  language?: string;
  showOutput?: boolean;
  showLineNumbers?: boolean;
  children?: any[];
}

export default class SnipCode extends React.Component<PropType> {
  render() {
    return <>{this.props.children}</>;
  }
}
*/
