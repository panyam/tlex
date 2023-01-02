import os
import json

def collectFrom(path, rootdir=None):
    path = os.path.abspath(os.path.expanduser(path))
    if not rootdir: rootdir = path
    metafile = os.path.join(path, "_meta.json")
    out = []
    if not os.path.exists(metafile):
        return out

    def stripped(p):
        if p.startswith(rootdir): return p[len(rootdir):]
        else: return p

    # otherwise go through all items in meta and return those
    metadata = json.loads(open(metafile).read())
    for entry in metadata:
        if type(entry) is str:
            entry = {
                "file": entry
            }

        file = entry["file"]
        title = entry.get("title", file)     ## Read front matter
        link = entry.get("link", None)
        print("Entry: ", entry, link)
        entrypath = os.path.join(path, file)
        if os.path.isdir(entrypath):
            # recurse
            item = {
                isDir: True,
                "title": title,
                children: collectFrom(entrypath, rootdir)
            }
        else:
            print("Link: ", link)
            item = {
                "title": title,
                "isDir": False,
                "link": link if link is not None else stripped(entrypath),
            }
            print("FL: ", link if link is not None else stripped(entrypath), item)
        out.append(item)
    return out

def writeTOC(path, outfile):
    toc = collectFrom(path)
    print("TOC: ", toc)
    contents = f"""export default JSON.parse('{json.dumps(toc)}')"""
    contents2 = f"""export default {json.dumps(toc)}"""
    open (outfile, "w").write(contents2)
