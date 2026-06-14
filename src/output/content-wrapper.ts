/**
 * Marker-based content wrapper for safe agent file updates.
 *
 * Generated agent files (CLAUDE.md, GEMINI.md, etc.) are wrapped in
 * valid Markdown comment markers so that the tool can safely update
 * only the generated section on subsequent runs without overwriting
 * user additions.
 *
 * Wrapper format:
 * ```markdown
 * <!-- AGENT-CONTEXT-SYNC-CLI:RULES:START -->
 * ... generated priority table and rules ...
 * <!-- AGENT-CONTEXT-SYNC-CLI:RULES:END -->
 *
 * <!-- AGENT-CONTEXT-SYNC-CLI:SKILLS:START -->
 * ... (future skills content) ...
 * <!-- AGENT-CONTEXT-SYNC-CLI:SKILLS:END -->
 * ```
 *
 * The parser only touches content between RULES markers. SKILLS markers
 * are reserved for future use and are preserved as-is.
 */

const START_MARKER = '<!-- AGENT-CONTEXT-SYNC-CLI:RULES:START -->';
const END_MARKER = '<!-- AGENT-CONTEXT-SYNC-CLI:RULES:END -->';

/** Wrap content in RULES markers (for new files or full overwrites). */
export function wrapRules(content: string): string {
  return `${START_MARKER}\n${content}${END_MARKER}\n`;
}

/** Check whether a file already contains SYNC markers. */
export function hasSyncMarkers(fileContent: string): boolean {
  return fileContent.includes(START_MARKER) && fileContent.includes(END_MARKER);
}

/**
 * Update the generated rules section in an existing file.
 *
 * If both RULES markers are found, replaces only the content between them.
 * Everything outside the markers (user content, SKILLS section) is preserved.
 *
 * If markers are not found, prepends a new wrapped block at the top of the
 * file. If the file has YAML frontmatter (`---\n...\n---`), the wrapped block
 * is placed after it to preserve frontmatter semantics.
 */
export function updateRules(existing: string, newContent: string): string {
  if (hasSyncMarkers(existing)) {
    return replaceBetween(existing, START_MARKER, END_MARKER, newContent);
  }

  return prependWrapped(existing, newContent);
}

/**
 * Replace the content between two markers.
 * Before the start marker and after the end marker are kept intact.
 */
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

/**
 * Prepend a wrapped block to existing content.
 * If the file has YAML frontmatter, the wrapped block goes after it
 * so tools that parse frontmatter (Cursor, Continue) still work.
 */
function prependWrapped(existing: string, newContent: string): string {
  const prefix = extractFrontmatter(existing);
  const rest = prefix ? existing.slice(prefix.length).trimStart() : existing.trimStart();

  if (prefix) {
    return `${prefix}\n\n${wrapRules(newContent)}${rest}`;
  }

  return `${wrapRules(newContent)}${rest}`;
}

/**
 * Extract YAML frontmatter from the beginning of a Markdown file.
 * Frontmatter is delimited by `---` on the first line and a closing `---`.
 * Returns the full frontmatter string (including delimiters), or `''` if none.
 */
function extractFrontmatter(text: string): string {
  const trimmed = text.trimStart();
  if (!trimmed.startsWith('---')) return '';

  const endIdx = trimmed.indexOf('---', 3);
  if (endIdx === -1) return '';

  return text.slice(0, text.indexOf(trimmed) + endIdx + 3);
}
