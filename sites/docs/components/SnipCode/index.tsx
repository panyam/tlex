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
  let indent = 0;
  let language = "";
  let code = "";
  let styles = defaultStyles;
  let title = "Source"
  let outputTitle = "Output";
  let theme = defaultTheme;
  if (typeof(children) === "string") {
  // we are passed as a <SnipCode> node
    indent = props.indent || 1;
    language = props.language || "ts";
    code = children;
    styles = props.styles || defaultStyles;
    title = props.title || title;
    outputTitle = props.outputTitle || outputTitle;
    theme = props.theme || defaultTheme;
  } else {
    // passed as a code node in MDX
    const cprops = children.props;
    code = cprops.children;
    language = cprops.className?.replace("language-", "").trim();
    console.log("CP: ", cprops);
  }
  let lines = stripLinePrefixSpaces(code.split("\n"))
  if (indent) {
    console.log("Indent: ", indent);
    lines = lines.map((l) => "  " + l);
  }
  const cleanedCode = lines.join("\n").trim() + "\n";

  // console.log("Code: ", code);
  // console.log("Cleaned Code: ", cleanedCode);
  console.log("Props: ", props);

  return (
    <>
      <h3 className={styles.sourceTitleSpan}>{title}</h3>
      <Highlight
        {...defaultProps}
        code={cleanedCode}
        language={language}
        theme={theme}>
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
      <h3 className={styles.outputTitleSpan}>{outputTitle}</h3>
      <div>output goes here</div>
    </>
  );
};

export default SyntaxHighlighter;

/**
 * Compiles a code snippet to gets its output by doing the following:
 *
 * 1. First checks if the snippet and its outputs have been cached, if so then returns
 *    the output as is.
 * 2. If not cached then compilation begins as follows
 * 3. Identifies the folder in the file system where this snippet (and its metadata)
 *    do (or should) reside.
 * 4. A basic way of identifying a snippet is either by using the snippet's page + name
 *    as its key or page + index as its key.  Typically it is expected snippets are fixed
 *    in a page so even though we could move things around, they eventually get fixed.
 *    Without loss of generality we can enforce each snippet to have a key provided by
 *    the user that is unique within the page.
 * 5. If the local dir for the snippet doesnt exist (eg <snippetsdir>/<pageslug>/<snippetid>
 *    it is created.  If the dir exists and the snippet hash has not changed we return
 *    last results.
 * 6. Here the snippet is copied to an "input" file and stored in the snippets dir as
 *    the source and ts-node on the file is run.  All output captured from this run
 *    is saved as the output (with other metadata perhaps like last compiled etc).
 * 7. The saved output is returned to be rendered.
 * 8. We could even make this compilation/check/cache step part of another service
 *    that runs outside the mdx processor if need be.
 *
 * How do we handle package dependencies?
 *
 * A snippet can be passed a "dependencies" object which is all packages that need to be
 * installed for running that snippet.  Instead of passing dependencies to each snippet
 * this could be a named list somewhere so that same named dependency list can be shared
 * by multiple snippets.
 *
 * Having to pass dependencies can be a pain so we need a way to declarative apply to
 * all snippets by default, overrideable at per snippet level, per page (all snippets
 * in page) level.
 *
 * When the compiler backend sees a dependency list for a snippet, it sees if another
 * "environment" (just a temp folder where dependencies are installed and compiled) exists
 * with the exact same dependencies.  If it does then the source is copied there and
 * compiled otherwise a new env is cfreated with just these dependencies.
 */
function compileSnippet(code: string, index: number) {
}
