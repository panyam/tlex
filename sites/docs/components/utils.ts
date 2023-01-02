import path from "path";
import { existsSync } from "fs";
import { readdir, readFile, stat } from "fs/promises";

// Walk down the pages dir and collect all pages that are referenced in the _meta.json
export async function findAllPosts() {
  const dir = path.join(process.cwd(), "pages")
  return await collectFrom(dir)
}

export async function collectFrom(dir: string): Promise<any> {
  dir = path.resolve(dir)
  const metafile = path.join(dir, "_meta.json")
  const out = [] as any[];
  if (!existsSync(metafile)) {
    return out;
  }

  // otherwise go through all items in meta and return those
  const metadata = JSON.parse(await readFile(metafile).toString()) as any[];
  for (const entry of metadata) {
    if (typeof "entry" === "string") {
      const entrypath = path.join(dir, entry)
      const info = await stat(entrypath)
      if (info.isDirectory()) {
        out.push({
          isDir: true,
          children: await collectFrom(entrypath)
        })
      } else if ((await stat(entrypath + ".mdx")).isFile()) {
        out.push({
          "title": entry,
          "isDir": false,
          "link": entrypath + "/" + entry,
        })
      } else if ((await stat(entrypath + ".md")).isFile()) {
        out.push({
          "title": entry,
          "isDir": false,
          "link": entrypath + "/" + entry,
        })
      }
    }
  }
}
