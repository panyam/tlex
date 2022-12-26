import { Parser } from 'acorn';
import jsx from 'acorn-jsx';
import { BaseNode, Program } from 'estree';
import { Code, Parent, Root } from 'mdast';
import { MdxJsxFlowElement, MdxFlowExpression } from 'mdast-util-mdx';
import { Plugin, Transformer } from 'unified';
import { visit } from 'unist-util-visit';
import util from 'util';

const parser = Parser.extend(jsx());

const transformer: Transformer<Root> = (ast) => {
  const foundSnipCodes = [] as any;
  const foundCodeBlocks = [] as any;
  console.log(
    'Full AST: ',
    util.inspect(ast, { showHidden: false, depth: null, colors: true }),
  );
  visit(
    ast,
    'mdxJsxFlowElement',
    (node: MdxJsxFlowElement, index: number | null, parent: Parent | null) => {
      if (node.name != 'SnipCode') {
        return;
      }
      foundSnipCodes.push({
        index: index,
        parent: parent,
        node: node,
      });
    },
  );
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

  for (const sncode of foundSnipCodes) {
    const parent = sncode.parent as Parent;
    const index = sncode.index as number;
    parent.children.splice(index + 1, 0, {
      type: 'mdxJsxFlowElement',
      name: 'h3',
      attributes: [],
      children: [{
        type: "paragraph",
        children: [{
          type: 'text',
          value: 'Output',
        }],
      }],
      data: { _mdxExplicitJsx: true }
    });
  }
};

/**
 * A markdown plugin for transforming code metadata.
 *
 * @returns A unified transformer.
 */
const remarkMdxCodeMeta: Plugin<[], Root> = () => transformer;

export default remarkMdxCodeMeta;
