import {
  intro,
  outro,
  cancel,
  isCancel,
  confirm,
  select,
  multiselect,
  spinner,
} from '../rules/prompts/clack-adapter.js';
import { logPlain, logError } from '../utils/log.js';
import type { Terminal } from './terminal.interface.js';

export class ClackTerminal implements Terminal {
  intro(message: string): void {
    intro(message);
  }

  outro(message: string): void {
    outro(message);
  }

  cancel(message: string): void {
    cancel(message);
  }

  isCancel(value: unknown): value is symbol {
    return isCancel(value);
  }

  confirm(message: string | { message: string }): Promise<boolean | symbol> {
    return confirm(message);
  }

  select(message: string, options?: { value: string; label: string }[]): Promise<string | symbol>;
  select(params: {
    message: string;
    options: { value: string; label: string }[];
  }): Promise<string | symbol>;
  select(
    arg: string | { message: string; options: { value: string; label: string }[] },
    opts?: { value: string; label: string }[],
  ): Promise<string | symbol> {
    if (typeof arg === 'string') {
      return select(arg, opts);
    }
    return select(arg, arg.options);
  }

  multiselect(params: {
    message: string;
    options: { value: string; label: string }[];
    required?: boolean;
  }): Promise<string[] | symbol> {
    return multiselect(params);
  }

  spinner() {
    return spinner();
  }

  logPlain(message: string): void {
    logPlain(message);
  }

  logError(message: string): void {
    logError(message);
  }
}
