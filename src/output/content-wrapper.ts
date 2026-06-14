const START_MARKER = '<!-- AGENT-CONTEXT-SYNC-CLI:RULES:START -->';
const END_MARKER = '<!-- AGENT-CONTEXT-SYNC-CLI:RULES:END -->';

export function wrapRules(content: string): string {
  return `${START_MARKER}\n${content}${END_MARKER}\n`;
}

export function hasSyncMarkers(fileContent: string): boolean {
  return fileContent.includes(START_MARKER) && fileContent.includes(END_MARKER);
}

export function updateRules(existing: string, newContent: string): string {
  if (hasSyncMarkers(existing)) {
    return replaceBetween(existing, START_MARKER, END_MARKER, newContent);
  }

  return prependWrapped(existing, newContent);
}

function replaceBetween(
  text: string,
  startMarker: string,
  endMarker: string,
  newContent: string,
): string {
  const startIdx = text.indexOf(startMarker);
  const endIdx = text.indexOf(endMarker);

  if (startIdx === -1 || endIdx === -1) return text;

  const before = text.slice(0, startIdx + startMarker.length);
  const after = text.slice(endIdx);

  return `${before}\n${newContent}${after}`;
}

function prependWrapped(existing: string, newContent: string): string {
  const prefix = extractFrontmatter(existing);
  const rest = prefix ? existing.slice(prefix.length).trimStart() : existing.trimStart();

  if (prefix) {
    return `${prefix}\n\n${wrapRules(newContent)}${rest}`;
  }

  return `${wrapRules(newContent)}${rest}`;
}

function extractFrontmatter(text: string): string {
  const trimmed = text.trimStart();
  if (!trimmed.startsWith('---')) return '';

  const endIdx = trimmed.indexOf('---', 3);
  if (endIdx === -1) return '';

  return text.slice(0, text.indexOf(trimmed) + endIdx + 3);
}
