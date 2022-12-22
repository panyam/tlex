export class GroupCounter {
  value = -1;
  next(): number {
    return ++this.value;
  }
  get current(): number {
    return this.value;
  }
}

export function isSpace(ch: string): boolean {
  return ch == " " || ch == "\t" || ch == "\n" || ch == "\r";
}

// function isSpaceChar(ch: string): boolean { return ch == " " || ch == "\t"; }
