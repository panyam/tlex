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
const SyntaxHighlighter = ({children}) => {
  const code = children.props.children;
  const language = children.props.className?.replace("language-", "").trim();
  let styles = defaultStyles;
  let theme = defaultTheme;

  return (
    <Highlight {...defaultProps} code={code} language={language} theme={theme}>
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
  );
};

export default SyntaxHighlighter;
