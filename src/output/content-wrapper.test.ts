import { describe, it, expect } from 'vitest';
import { wrapRules, updateRules, hasSyncMarkers } from './content-wrapper.js';

const sampleContent = '# CLAUDE.md\n\nSome generated rules here.\n';

describe('wrapRules', () => {
  it('wraps content with RULES markers', () => {
    const result = wrapRules(sampleContent);
    expect(result).toContain('<!-- AGENT-CONTEXT-SYNC-CLI:RULES:START -->');
    expect(result).toContain('<!-- AGENT-CONTEXT-SYNC-CLI:RULES:END -->');
    expect(result).toContain('Some generated rules here.');
    // Content is between markers
    const startIdx = result.indexOf('START -->');
    const endIdx = result.indexOf('<!-- AGENT-CONTEXT-SYNC-CLI:RULES:END');
    expect(startIdx).toBeLessThan(endIdx);
  });
});

describe('hasSyncMarkers', () => {
  it('returns true when RULES markers are present', () => {
    const wrapped = wrapRules(sampleContent);
    expect(hasSyncMarkers(wrapped)).toBe(true);
  });

  it('returns false for plain content without markers', () => {
    expect(hasSyncMarkers(sampleContent)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(hasSyncMarkers('')).toBe(false);
  });
});

describe('updateRules', () => {
  it('replaces content between existing markers', () => {
    const wrapped = wrapRules('old rules');
    const updated = updateRules(wrapped, 'new rules');

    expect(updated).toContain('new rules');
    expect(updated).not.toContain('old rules');
    expect(updated).toContain('<!-- AGENT-CONTEXT-SYNC-CLI:RULES:START -->');
    expect(updated).toContain('<!-- AGENT-CONTEXT-SYNC-CLI:RULES:END -->');
  });

  it('preserves content outside markers', () => {
    const file =
      'Existing user notes at top.\n\n' +
      wrapRules('old rules') +
      '\n\nMore user notes at bottom.\n';

    const updated = updateRules(file, 'new rules');

    expect(updated).toContain('Existing user notes at top.');
    expect(updated).toContain('More user notes at bottom.');
    expect(updated).toContain('new rules');
    expect(updated).not.toContain('old rules');
  });

  it('prepends wrapped content when no markers found', () => {
    const file = 'User content without markers.';
    const updated = updateRules(file, 'new rules');

    expect(updated).toContain('<!-- AGENT-CONTEXT-SYNC-CLI:RULES:START -->');
    expect(updated).toContain('new rules');
    expect(updated).toContain('<!-- AGENT-CONTEXT-SYNC-CLI:RULES:END -->');
    expect(updated).toContain('User content without markers.');
    // Wrapper should come before user content
    const wrapperIdx = updated.indexOf('START -->');
    const userIdx = updated.indexOf('User content');
    expect(wrapperIdx).toBeLessThan(userIdx);
  });

  it('preserves YAML frontmatter at the top', () => {
    const file = '---\ndescription: "test"\n---\n\nUser content without markers.';
    const updated = updateRules(file, 'new rules');

    // Frontmatter should remain at the very top
    expect(updated.indexOf('---')).toBe(0);
    // Wrapper should come after frontmatter, before user content
    const wrapperIdx = updated.indexOf('AGENT-CONTEXT-SYNC-CLI');
    const userIdx = updated.indexOf('User content');
    expect(wrapperIdx).toBeLessThan(userIdx);
  });

  it('handles empty new content', () => {
    const wrapped = wrapRules('old rules');
    const updated = updateRules(wrapped, '');

    expect(updated).toContain('<!-- AGENT-CONTEXT-SYNC-CLI:RULES:START -->');
    expect(updated).toContain('<!-- AGENT-CONTEXT-SYNC-CLI:RULES:END -->');
    expect(updated).not.toContain('old rules');
  });

  it('preserves SKILLS markers when updating RULES', () => {
    const file =
      '<!-- AGENT-CONTEXT-SYNC-CLI:RULES:START -->\nold\n<!-- AGENT-CONTEXT-SYNC-CLI:RULES:END -->\n\n' +
      '<!-- AGENT-CONTEXT-SYNC-CLI:SKILLS:START -->\nskills content\n<!-- AGENT-CONTEXT-SYNC-CLI:SKILLS:END -->';

    const updated = updateRules(file, 'new rules');

    expect(updated).toContain('new rules');
    expect(updated).toContain('skills content');
    expect(updated).toContain('SKILLS:START');
    expect(updated).toContain('SKILLS:END');
  });
});
