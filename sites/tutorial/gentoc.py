import os
import json

def collectFrom(path, rootdir=None, base_path="/"):
    path = os.path.abspath(os.path.expanduser(path))
    if not rootdir: rootdir = path
    metafile = os.path.join(path, "_meta.json")
    out = []
    if not os.path.exists(metafile):
        print("Are were here?", metafile)
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
                children: collectFrom(entrypath, rootdir, base_path)
            }
        else:
            final_link = base_path + (link if link is not None else stripped(entrypath))
            print("Link: ", final_link)
            item = {
                "title": title,
                "isDir": False,
                "link": final_link,
            }
            print("FL: ", final_link, item)
        out.append(item)
    return out

if __name__ == "__main__":
    import sys
    path, outfile = sys.argv[1], sys.argv[2]
    base_path = "" if len(sys.argv) <= 3 else sys.argv[3]
    print("Argv: ", sys.argv, len(sys.argv), path, outfile, base_path)
    toc = collectFrom(path, None, base_path)
    print("TOC: ", toc)
    contents = f"""export default {json.dumps(toc)}"""
    open (outfile, "w").write(contents)
