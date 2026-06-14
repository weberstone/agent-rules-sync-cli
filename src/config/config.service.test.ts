import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { ConfigService } from './config.service.js';
import type { Config } from './config.types.js';

let tmpDir: string;
let service: ConfigService;

const validConfig: Config = {
  version: 1,
  projectName: 'my-app',
  architecture: 'frontend',
  frameworks: ['angular-guidelines'],
  packages: ['tailwind', 'typescript'],
  agents: ['claude-code', 'cursor'],
  hasUserprompt: true,
  syncSkills: true,
  skills: ['angular-developer'],
  lastSync: '2026-06-14T12:00:00Z',
};

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-rules-test-'));
  service = new ConfigService(tmpDir);
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('read', () => {
  it('returns null when config file does not exist', async () => {
    const result = await service.read();
    expect(result).toBe(null);
  });

  it('returns Config for a valid config file', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'ai-rules-config.json'),
      JSON.stringify(validConfig, null, 2),
      'utf-8',
    );
    const result = await service.read();
    expect(result).toEqual(validConfig);
  });

  it('returns null for corrupted JSON', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await fs.writeFile(path.join(tmpDir, 'ai-rules-config.json'), '{ broken json', 'utf-8');
    const result = await service.read();
    expect(result).toBe(null);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('returns null when JSON is valid but missing required fields', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await fs.writeFile(
      path.join(tmpDir, 'ai-rules-config.json'),
      JSON.stringify({ version: 1 }),
      'utf-8',
    );
    const result = await service.read();
    expect(result).toBe(null);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('returns null when architecture has invalid value', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await fs.writeFile(
      path.join(tmpDir, 'ai-rules-config.json'),
      JSON.stringify({ ...validConfig, architecture: 'mobile' }),
      'utf-8',
    );
    const result = await service.read();
    expect(result).toBe(null);
    spy.mockRestore();
  });

  it('returns null when version is not a number', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await fs.writeFile(
      path.join(tmpDir, 'ai-rules-config.json'),
      JSON.stringify({ ...validConfig, version: '1' }),
      'utf-8',
    );
    const result = await service.read();
    expect(result).toBe(null);
    spy.mockRestore();
  });

  it('tolerates extra unknown fields', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'ai-rules-config.json'),
      JSON.stringify({ ...validConfig, unknownField: 'should be ignored' }, null, 2),
      'utf-8',
    );
    const result = await service.read();
    // Extra fields are tolerated (not stripped) — all known fields must be present
    expect(result).not.toBe(null);
    expect(result!.version).toBe(validConfig.version);
    expect(result!.projectName).toBe(validConfig.projectName);
    expect(result!.architecture).toBe(validConfig.architecture);
    expect(result!.frameworks).toEqual(validConfig.frameworks);
    expect(result!.packages).toEqual(validConfig.packages);
    expect(result!.agents).toEqual(validConfig.agents);
  });
});

describe('write', () => {
  it('writes formatted JSON to ai-rules-config.json', async () => {
    await service.write(validConfig);
    const raw = await fs.readFile(path.join(tmpDir, 'ai-rules-config.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed).toEqual(validConfig);
    expect(raw).toContain('\n');
  });

  it('overwrites existing config file', async () => {
    await service.write(validConfig);
    await service.write({ ...validConfig, projectName: 'new-name' });
    const result = await service.read();
    expect(result?.projectName).toBe('new-name');
  });
});

describe('backward compatibility', () => {
  it('fills defaults for missing syncSkills and skills', async () => {
    const oldConfig = {
      version: 1,
      projectName: 'old-app',
      architecture: 'backend',
      frameworks: ['only-node'],
      packages: [],
      agents: [],
      hasUserprompt: false,
      lastSync: '2025-01-01T00:00:00Z',
    };
    await fs.writeFile(
      path.join(tmpDir, 'ai-rules-config.json'),
      JSON.stringify(oldConfig, null, 2),
      'utf-8',
    );
    const result = await service.read();
    expect(result).not.toBe(null);
    expect(result!.syncSkills).toBe(false);
    expect(result!.skills).toEqual([]);
  });
});

describe('round-trip', () => {
  it('read returns the same config that was written', async () => {
    await service.write(validConfig);
    const result = await service.read();
    expect(result).toEqual(validConfig);
  });
});
