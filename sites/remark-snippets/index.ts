import { Parser } from 'acorn';
import jsx from 'acorn-jsx';
import { createChannel, createClient, Client } from 'nice-grpc';
import { BaseNode, Program } from 'estree';
import { Code, Parent, Root } from 'mdast';
import { MdxJsxFlowElement, MdxFlowExpression } from 'mdast-util-mdx';
import { Plugin, Transformer } from 'unified';
import { visit } from 'unist-util-visit';
import util from 'util';
import { execFile, execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const parser = Parser.extend(jsx());
const logTree = false;

function parseMarkup(value: string): any {
  const estree = parser.parse(value, { ecmaVersion: 'latest' });
  return {
    type: 'mdxFlowExpression',
    value,
    data: { estree },
  };
}

const transformer: Transformer<Root> = async (ast, file) => {
  const foundSnipCodes = [] as any;
  if (logTree) {
    console.log(
      'Full AST: ',
      util.inspect(ast, { showHidden: false, depth: null, colors: true }),
    );
    console.log(
      'Full File: ',
      util.inspect(file, { showHidden: false, depth: null, colors: true }),
    );
  }
  visit(
    ast,
    'mdxJsxFlowElement',
    (node: MdxJsxFlowElement, index: number | null, parent: Parent | null) => {
      if (node.name != 'SnipCode') {
        return;
      }
      const codeAttrib = node.attributes.filter(
        (attr) => attr.type == 'mdxJsxAttribute' && attr.name == 'children',
      );
      if (
        codeAttrib.length == 0 ||
        !codeAttrib[0].value ||
        codeAttrib[0].value == null
      ) {
        return;
      }
      let code = '';
      if (typeof codeAttrib[0].value === 'string') {
        code = codeAttrib[0].value;
      } else {
        code = codeAttrib[0].value.value;
      }
      foundSnipCodes.push({
        index: index,
        parent: parent,
        node: node,
        promise: executeSnippet(code, '/tmp/enva', foundSnipCodes.length),
      });
    },
  );
  /*
  const foundCodeBlocks = [] as any;
  visit(
    ast,
    'code',
    (node: Code, index: number | null, parent: Parent | null) => {
      if (node.lang != 'ts' && node.lang != 'tsx') {
        return;
      }
      // if (!node.meta) { return; }
      console.log('Code: ', node.value);
      const code = JSON.stringify(`${node.value}\n`);
      const codeProps = `className="language-${node.lang}"`;
      const value = `<pre ${
        node.meta || {}
      }><code ${codeProps}>{${code}}</code></pre>`;
      // here we want to
      foundCodeBlocks.push({
        index: index,
        code: code,
        parent: parent,
        node: node,
      });
    },
  );
  foundCodeBlocks.sort((a: any, b: any) => b.index - a.index);
  */
  foundSnipCodes.sort((a: any, b: any) => b.index - a.index);
  if (true) {
    console.log('SN: ', foundSnipCodes);
  } else {
    console.log(
      'Found SnipCodes: ',
      util.inspect(foundSnipCodes, {
        showHidden: false,
        depth: 1,
        colors: true,
      }),
    );
  }

  const allPromises = foundSnipCodes.map((c: any) => c.promise);
  const promiseValues = await Promise.all(allPromises);

  foundSnipCodes.forEach((sncode: any, ind: number) => {
    const parent = sncode.parent as Parent;
    const index = sncode.index as number;
    parent.children.splice(index + 1, 0, ...promiseValues[ind]);
  });
};

/**
 * A snippet is executed in a secure sandbox and its output is returned back
 * to the caller.
 *
 * @param code  Code string to be executed
 * @param envdir  Name of the directory where the environment exists and has all
 *                the necessary packages installed.
 * @param snippetid ID of the snippet being executed.  This is used to compute Name
 *                  of the directory where the environment exists and has all
 *                  the necessary packages installed.
 */
async function executeSnippet(
  code: string,
  envdir: string,
  snippetid: string,
): Promise<any[]> {
  envdir = path.resolve(envdir);
  const snippetDir = envdir + '/snippets/' + snippetid;
  const snippetFile = snippetDir + '/input.ts';
  fs.mkdirSync(snippetDir, { recursive: true });
  if (code[0] == '`') {
    code = eval(code);
  }
  fs.writeFileSync(snippetFile, code);
  console.log('EnvDir: ', envdir);
  console.log('SnippetDir: ', snippetDir);
  console.log('SnippetFile: ', snippetFile);
  console.log('Execting code: ', code);
  /*
  const childProc = execFile('ts-node', ['-O', '{"module": "commonjs"}'], {
    cwd: envdir,
  });
  if (childProc == null) {
    const value = `<pre><code>Could not execute command</code></pre>`;
    return Promise.resolve([parseMarkup(value)]);
  }
  if (childProc.stdout == null) {
    const value = `<pre><code>stdout is null</code></pre>`;
    return Promise.resolve([parseMarkup(value)]);
  }
  if (childProc.stderr == null) {
    const value = `<pre><code>stderr is null</code></pre>`;
    return Promise.resolve([parseMarkup(value)]);
  }
  if (childProc.stdin == null) {
    const value = `<pre><code>stdin is null</code></pre>`;
    return Promise.resolve([parseMarkup(value)]);
  }
  */

  let processError = '';
  let processOutput = '';
  try {
    processOutput = execFileSync('ts-node', [snippetFile], {
      cwd: envdir,
    }).toString();
    console.log('FileSync Result: ', processOutput);
  } catch (err: any) {
    processError = err.toString();
    console.log('FileSync Error: ', processError);
  }

  let out = [] as any[];
  out.push({
    type: 'mdxJsxFlowElement',
    name: 'h3',
    attributes: [],
    children: [
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            value: 'Output',
          },
        ],
      },
    ],
    data: { _mdxExplicitJsx: true },
  });
  const value = `<pre><code>{\`${processOutput}\`}</code></pre>`;
  console.log('Value: ', value);
  out.push(parseMarkup(value));

  if (processError.length > 0) {
    out.push({
      type: 'mdxJsxFlowElement',
      name: 'h3',
      attributes: [],
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value: 'Error',
            },
          ],
        },
      ],
      data: { _mdxExplicitJsx: true },
    });
    const value = `<pre><code>{\`${processError}\`}</code></pre>`;
    out.push(parseMarkup(value));
  }
  return Promise.resolve(out);
}

/**
 * A markdown plugin for transforming code metadata.
 *
 * @returns A unified transformer.
 */
const remarkMdxCodeMeta: Plugin<[], Root> = () => transformer;

export default remarkMdxCodeMeta;
