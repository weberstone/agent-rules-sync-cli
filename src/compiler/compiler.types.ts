/**
 * A virtual file produced by the compiler before any disk writes happen.
 * The OutputService writes these to `.agents/rules/<filename>`.
 */
export interface CompiledFile {
  filename: string;
  content: string;
}
