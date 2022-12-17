export function timeIt<T>(prefix: string, block: () => T): T {
  const startTime = Date.now();
  const value = block();
  const endTime = Date.now();
  console.log(prefix, endTime - startTime, "ms");
  return value;
}

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
