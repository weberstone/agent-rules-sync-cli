import { describe, it, expect, vi } from 'vitest';
import { logWarning, logError, logPlain } from './log.js';

describe('logWarning', () => {
  it('prints a yellow warning message', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logWarning('careful');
    expect(spy).toHaveBeenCalledTimes(1);
    const output = spy.mock.calls[0][0];
    expect(output).toContain('careful');
    spy.mockRestore();
  });
});

describe('logError', () => {
  it('prints a red error message', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logError('fail');
    expect(spy).toHaveBeenCalledTimes(1);
    const output = spy.mock.calls[0][0];
    expect(output).toContain('fail');
    spy.mockRestore();
  });
});

describe('logPlain', () => {
  it('prints a plain message without prefix', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logPlain('hello');
    expect(spy).toHaveBeenCalledTimes(1);
    const output = spy.mock.calls[0][0];
    expect(output).toBe('hello');
    spy.mockRestore();
  });
});
