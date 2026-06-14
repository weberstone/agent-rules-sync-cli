import { describe, it, expect } from 'vitest';
import {
  generateClaudeMd,
  generateCursorRules,
  generateGeminiMd,
  generateAgentsMd,
  generateContinueRules,
  GeneratorRegistry,
  generatorRegistry,
} from './generator.service.js';
import type { GeneratorContext } from './generator.types.js';

const fullContext: GeneratorContext = {
  hasUserprompt: true,
  hasWorkflow: true,
  hasSpec: true,
  hasArchitecture: true,
  frameworkFiles: ['angular-guidelines.md'],
  hasPackageRules: true,
};

const minimalContext: GeneratorContext = {
  hasUserprompt: false,
  hasWorkflow: true,
  hasSpec: false,
  hasArchitecture: true,
  frameworkFiles: ['only-node.md'],
  hasPackageRules: false,
};

// ---- Claude Code ----

describe('generateClaudeMd', () => {
  it('returns single CLAUDE.md file', () => {
    const files = generateClaudeMd(fullContext);
    expect(files).toHaveLength(1);
    expect(files[0].filename).toBe('CLAUDE.md');
  });

  it('includes all priority rows when all files present', () => {
    const { content } = generateClaudeMd(fullContext)[0];
    expect(content).toContain('| 1 (CRITICAL)');
    expect(content).toContain('userprompt.md');
    expect(content).toContain('| 2');
    expect(content).toContain('workflow.md');
    expect(content).toContain('| 3');
    expect(content).toContain('spec.md');
    expect(content).toContain('| 4');
    expect(content).toContain('architecture.md');
    expect(content).toContain('| 5');
    expect(content).toContain('angular-guidelines.md');
    expect(content).toContain('| 6 (OPTIONAL)');
    expect(content).toContain('package-rules.md');
  });

  it('skips missing files from priority table', () => {
    const { content } = generateClaudeMd(minimalContext)[0];
    expect(content).not.toMatch(/\| 1.*userprompt/);
    expect(content).not.toMatch(/\| 3.*spec\.md/);
    expect(content).not.toMatch(/\| 6.*package-rules/);
  });

  it('includes multiple framework rows for fullstack', () => {
    const ctx: GeneratorContext = {
      ...fullContext,
      frameworkFiles: ['angular-guidelines.md', 'only-node.md'],
    };
    const { content } = generateClaudeMd(ctx)[0];
    const lines = content.split('\n');
    const fwLines = lines.filter(
      (l: string) => l.includes('angular-guidelines.md') || l.includes('only-node.md'),
    );
    expect(fwLines).toHaveLength(2);
    for (const line of fwLines) {
      expect(line).toContain('| 5');
    }
  });

  it('includes footer', () => {
    expect(generateClaudeMd(fullContext)[0].content).toContain('agent-rules-sync-cli');
  });
});

// ---- Cursor ----

describe('generateCursorRules', () => {
  it('returns single .mdc file in .cursor/rules/', () => {
    const files = generateCursorRules(fullContext);
    expect(files).toHaveLength(1);
    expect(files[0].filename).toBe('.cursor/rules/00-agent-rules.mdc');
  });

  it('has YAML frontmatter with alwaysApply: true', () => {
    const { content } = generateCursorRules(fullContext)[0];
    expect(content).toContain('---');
    expect(content).toContain('alwaysApply: true');
    expect(content).toContain('description:');
  });

  it('references .agents/rules/ directory', () => {
    expect(generateCursorRules(fullContext)[0].content).toContain('.agents/rules/');
  });

  it('excludes userprompt when absent', () => {
    const { content } = generateCursorRules(minimalContext)[0];
    expect(content).not.toContain('userprompt.md');
  });
});

// ---- Gemini CLI ----

describe('generateGeminiMd', () => {
  it('returns single GEMINI.md file', () => {
    const files = generateGeminiMd(fullContext);
    expect(files).toHaveLength(1);
    expect(files[0].filename).toBe('GEMINI.md');
  });

  it('uses @import directives with priority annotations', () => {
    const { content } = generateGeminiMd(fullContext)[0];
    expect(content).toContain(
      '@.agents/rules/userprompt.md  (P1 — AI persona and role definition)',
    );
    expect(content).toContain(
      '@.agents/rules/workflow.md  (P2 — Interaction protocol, TDD rules, commit standards)',
    );
  });

  it('skips missing files', () => {
    const { content } = generateGeminiMd(minimalContext)[0];
    expect(content).not.toContain('userprompt.md');
    expect(content).not.toContain('spec.md');
  });
});

// ---- Codex CLI ----

describe('generateAgentsMd', () => {
  it('returns single AGENTS.md file', () => {
    const files = generateAgentsMd(fullContext);
    expect(files).toHaveLength(1);
    expect(files[0].filename).toBe('AGENTS.md');
  });

  it('includes priority table', () => {
    const { content } = generateAgentsMd(fullContext)[0];
    expect(content).toContain('| 1 (CRITICAL)');
    expect(content).toContain('## Working agreements');
  });

  it('skips missing files', () => {
    const { content } = generateAgentsMd(minimalContext)[0];
    expect(content).not.toMatch(/\| 1.*userprompt/);
    expect(content).not.toMatch(/\| 6.*package-rules/);
  });
});

// ---- Continue ----

describe('generateContinueRules', () => {
  it('returns single .md file in .continue/rules/', () => {
    const files = generateContinueRules(fullContext);
    expect(files).toHaveLength(1);
    expect(files[0].filename).toBe('.continue/rules/00-agent-rules.md');
  });

  it('has YAML frontmatter', () => {
    const { content } = generateContinueRules(fullContext)[0];
    expect(content).toContain('---');
  });

  it('references .agents/rules/', () => {
    expect(generateContinueRules(fullContext)[0].content).toContain('.agents/rules/');
  });
});

// ---- Registry ----

describe('GeneratorRegistry', () => {
  it('returns correct generator for each agent', () => {
    expect(generatorRegistry.get('claude-code')).toBe(generateClaudeMd);
    expect(generatorRegistry.get('cursor')).toBe(generateCursorRules);
    expect(generatorRegistry.get('gemini-cli')).toBe(generateGeminiMd);
    expect(generatorRegistry.get('codex')).toBe(generateAgentsMd);
    expect(generatorRegistry.get('continue')).toBe(generateContinueRules);
  });

  it('returns undefined for unknown key', () => {
    expect(generatorRegistry.get('unknown')).toBeUndefined();
  });

  it('gemini generates GEMINI.md same as gemini-cli', () => {
    const gen = generatorRegistry.get('gemini')!;
    const files = gen(fullContext);
    expect(files).toHaveLength(1);
    expect(files[0].filename).toBe('GEMINI.md');
  });

  it('new instance can be created independently', () => {
    const registry = new GeneratorRegistry();
    expect(registry.get('claude-code')).toBeDefined();
    expect(registry.get('unknown')).toBeUndefined();
  });
});
