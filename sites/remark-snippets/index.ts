import jsx from 'acorn-jsx';
import { Parser } from 'acorn';
import { createChannel, createClient, Client } from 'nice-grpc';
import { BaseNode, Program } from 'estree';
import { Content, Code, Parent, Root } from 'mdast';
import { MdxJsxFlowElement, MdxFlowExpression } from 'mdast-util-mdx';
import { Plugin, Transformer } from 'unified';
import { visit } from 'unist-util-visit';
import util from 'util';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { execFile, execFileSync, ChildProcess } from 'child_process';

const logTree = false;

function createTransformer(options: any): Transformer<Root> {
  return async (ast, file) => {
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
    const foundSnippets = new Map<string, Snippet>();
    const allSnippets = [] as Snippet[];
    let count = 0;
    visit(
      ast,
      'mdxJsxFlowElement',
      (
        node: MdxJsxFlowElement,
        index: number | null,
        parent: Parent | null,
      ) => {
        if (index == null || parent == null || node.name != 'SnipCode') {
          return;
        }
        const code = getAttrib(node, 'children') || '';
        const setupCode = getAttrib(node, 'setup') || '';
        const idAttrib = (getAttrib(node, 'id') || '').trim();
        const env = getAttrib(node, 'env');
        const prevSnipId = (getAttrib(node, 'prev') || '').trim();
        if (idAttrib == '' || foundSnippets.has(idAttrib)) {
          throw Error(
            'SnipCode elements *must* have a unique ID within the page',
          );
        }
        const newSnippet = new Snippet(idAttrib, node, parent, code);
        newSnippet.setupCode = setupCode;
        newSnippet.hidden = getAttrib(node, 'hidden') || false;
        newSnippet.hideOutput = getAttrib(node, 'hideOutput') || false;
        newSnippet.index = allSnippets.length - 1;
        newSnippet.promise = newSnippet.execute('/tmp/enva');
        if (prevSnipId != '') {
          if (!foundSnippets.has(prevSnipId)) {
            throw new Error('Previous snippet not found: ' + prevSnipId);
          }
          newSnippet.prev = foundSnippets.get(prevSnipId)!;
        }

        allSnippets.push(newSnippet);
        foundSnippets.set(idAttrib, newSnippet);
        // Add a place holder to be populated
        parent.children.splice(index + 1, 0, {} as Content);
      },
    );

    // We run each snippet in its own execution instead of maintaining states etc
    // This has a couple of benefits:
    // * We dont need to keep an interpreter/kernel hanging on the
    //   executor node wherever it is.  Each execution is its own thing and no dependencies
    //   mess can ensue.
    // * Our kernel may not even be multi threaded.  For a "serial" notebook style page
    //   the list of snippets may just be a stick but depending on how prev is used we could
    //   end up having a tree (dags are not possible - and even if they are since we are not
    //   capturing any contexts of the VM forking and joining threads and all their data
    //   becomes a pain).
    //
    // So each snippet as a single block with its "real" code beign its provided code +
    // the real code of all its prev nodes is good enough.  Also no topological sort
    // needed
    // Build a dag of all the promises and execute them in a topologically sorted way
    const allPromises = allSnippets.map((sn: any) => sn.promise);
    const promiseValues = await Promise.all(allPromises);
    allSnippets.sort((a: any, b: any) => b.index - a.index);
    console.log(
      'SN: ',
      allSnippets,
      'PromiseValues: ',
      promiseValues,
      /*
      util.inspect(promiseValues, {
        showHidden: false,
        depth: null,
        colors: true,
      }),
     */
    );

    allSnippets.forEach((sncode: Snippet, ind: number) => {
      const parent = sncode.parent as Parent;
      const index = sncode.index as number;
      parent.children.splice(index, 1, ...promiseValues[ind]);
    });
  };
}

/**
 * A markdown plugin for transforming code metadata.
 *
 * @returns A unified transformer.
 */
const remarkMdxCodeMeta: Plugin<[any], Root> = createTransformer;

export default remarkMdxCodeMeta;

function getAttrib(node: any, attribName: string): any {
  const attrib = node.attributes.filter(
    (attr: any) => attr.type == 'mdxJsxAttribute' && attr.name == attribName,
  );
  if (attrib.length == 0 || !attrib[0].value || attrib[0].value == null) {
    return null;
  }
  if (typeof attrib[0].value === 'string') {
    return attrib[0].value;
  } else {
    return attrib[0].value.value;
  }
}

function parseMarkup(value: string): any {
  const estree = parser.parse(value, { ecmaVersion: 'latest' });
  return {
    type: 'mdxFlowExpression',
    value,
    data: { estree },
  };
}

const parser = Parser.extend(jsx());
export class TSInterpreter {
  public static DEFAULT_BOUNDARY =
    '>>>>>>>><<<<<<<<<>>>>>>>>><<<<<<<<<>>>>>>>><<<<<<<<<>>>>>>>>><<<<<<<<<';
  exited = false;
  closed = false;
  childProcess: ChildProcess;
  procOut = '';
  procErr: Error | null = null;
  // Pick a string that can never occur in the output
  currBoundary = TSInterpreter.DEFAULT_BOUNDARY;
  currResolve: any = null;
  currReject: any = null;
  constructor(public readonly envdir: string) {
    this.childProcess = execFile('ts-node');
    this.childProcess.on('close', (code, signal) => {
      this.closed = true;
      this.currReject(new Error('Interpreter closed unexpectedly'));
    });
    this.childProcess.on('exit', (code, signal) => {
      this.closed = true;
      if (!this.exited) {
        this.currReject(new Error('Interpreter exited unexpectedly'));
      }
      this.exited = true;
    });
    this.childProcess.on('error', (err) => {
      console.log('Found err: ', err);
      this.currReject(err);
    });
    this.childProcess.on('data', (data) => {
      console.log('Found data: ', data);
      let foundBoundary = false;
      if (data == this.currBoundary) {
        data = data.substring(0, data.length - this.currBoundary.length);
        foundBoundary = true;
      } else if (data.endsWith('\n' + this.currBoundary)) {
        data = data.substring(0, data.length - (this.currBoundary.length + 1));
        foundBoundary = true;
      }
      this.procOut += data;
      if (foundBoundary) {
        this.currResolve(this.procOut);
      }
    });
  }

  async execute(code: string, boundary = ''): Promise<string> {
    if (code.trim() == '') {
      return Promise.resolve('');
    }
    if (boundary == '') {
      boundary = TSInterpreter.DEFAULT_BOUNDARY;
    }
    this.currBoundary = boundary;
    this.procOut = '';

    // now pump our code into it and wait for the boundary to be seen
    if (
      this.closed ||
      this.childProcess == null ||
      this.childProcess.stdin == null
    ) {
      return Promise.reject('Interpreter not open');
    }

    const out = new Promise<string>((resolve, reject) => {
      this.currResolve = resolve;
      this.currReject = reject;
    });
    this.childProcess.stdin.write(code + `\n$console.log(${boundary})`);
    return out;
  }

  exit(): void {
    this.exited = true;
    this.childProcess.stdin?.end();
  }
}

export class Snippet {
  prev: Snippet | null = null;
  setupCode: string = '';
  hidden = false;
  hideOutput = false;
  index = 0;
  promise: null | Promise<any> = null;
  constructor(
    public readonly id: string,
    public readonly node: Content,
    public readonly parent: Parent,
    public code = '',
  ) {}

  get codeBlocks(): string[] {
    let out = this.prev != null ? this.prev.codeBlocks : [];
    if (this.setupCode[0] == '`') {
      this.setupCode = eval(this.setupCode);
    }
    if (this.code[0] == '`') {
      this.code = eval(this.code);
    }
    out.push(this.setupCode);
    out.push(this.code);
    return out;
  }

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
  async execute(envdir: string): Promise<any[]> {
    const snippet = this;
    const codeBlocks = snippet.codeBlocks;
    const fullCode = codeBlocks.join('\n');
    const snippetDir = envdir + '/snippets/' + snippet.id;
    const snippetInfile = snippetDir + '/input.ts';
    const snippetOutfile = snippetDir + '/output.txt';
    const metadataFile = snippetDir + '/meta.json';

    console.log('EnvDir: ', envdir);
    console.log('SnippetDir: ', snippetDir);
    console.log('SnippetFile: ', snippetInfile);
    console.log('Execting code: ', codeBlocks);

    envdir = path.resolve(envdir);
    fs.mkdirSync(snippetDir, { recursive: true });

    let metadata = {} as any;

    if (fs.existsSync(metadataFile)) {
      const metadataContents = fs.readFileSync(metadataFile, {
        encoding: 'utf8',
        flag: 'r',
      });
      if (metadataContents.trim() != '') {
        metadata = JSON.parse(metadataContents);
      }
    }

    const fullCodeHash = crypto
      .createHash('sha1')
      .update(fullCode)
      .digest('hex');

    let out = [] as any[];
    if (
      metadata.fullCodeHash == fullCodeHash &&
      fs.existsSync(snippetOutfile)
    ) {
      // check if contents also match if they do then return cached copy
      const oldFullCode = fs.readFileSync(snippetInfile, {
        encoding: 'utf8',
        flag: 'r',
      });
      if (oldFullCode == fullCode) {
        // cached so return it
        const cachedOutput = fs.readFileSync(snippetOutfile, {
          encoding: 'utf8',
          flag: 'r',
        });
        return Promise.resolve(JSON.parse(cachedOutput));
      }
    }

    metadata.fullCodeHash = fullCodeHash;

    // Update input file and kick off the whole thing
    fs.writeFileSync(snippetInfile, fullCode);

    // Update metadata with latest status
    fs.writeFileSync(metadataFile, JSON.stringify(metadata));

    // Now kick off the ts-node invocation
    const tsInt = new TSInterpreter(envdir);

    let processError = '';
    let processOutput = '';
    for (const block of codeBlocks) {
      try {
        // we are only interested in the last successful output
        processOutput = await tsInt.execute(block);
      } catch (err: any) {
        processOutput = '';
        processError = err.toString();
        break;
      }
    }
    tsInt.exit();

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

    // Write the output back
    fs.writeFileSync(snippetOutfile, JSON.stringify(out));
    return Promise.resolve(out);
  }
}

function parseMarkup(value: string): any {
  const estree = parser.parse(value, { ecmaVersion: 'latest' });
  return {
    type: 'mdxFlowExpression',
    value,
    data: { estree },
  };
}
