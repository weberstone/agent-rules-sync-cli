/**
 * Terminal interface — abstracts away the UI (clack) from the core logic.
 *
 * This follows Clean Architecture: the Orchestrator depends on this interface,
 * not on a specific terminal implementation.
 */

export interface Terminal {
  intro(message: string): void;
  outro(message: string): void;
  cancel(message: string): void;
  isCancel(value: unknown): value is symbol;

  confirm(message: string | { message: string }): Promise<boolean | symbol>;

  select(message: string, options?: { value: string; label: string }[]): Promise<string | symbol>;
  select(params: {
    message: string;
    options: { value: string; label: string }[];
  }): Promise<string | symbol>;

  multiselect(params: {
    message: string;
    options: { value: string; label: string }[];
    required?: boolean;
  }): Promise<string[] | symbol>;

  spinner(): {
    start(message: string): void;
    stop(message: string): void;
  };

  logPlain(message: string): void;
  logError(message: string): void;
}
