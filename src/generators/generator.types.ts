export interface GeneratorContext {
  hasUserprompt: boolean;
  hasWorkflow: boolean;
  hasSpec: boolean;
  hasArchitecture: boolean;
  frameworkFiles: string[];
  hasPackageRules: boolean;
}

export interface AgentFile {
  filename: string;
  content: string;
}

export type AgentGenerator = (ctx: GeneratorContext) => AgentFile[];

export type AgentKey =
  | 'claude-code'
  | 'cursor'
  | 'gemini-cli'
  | 'codex'
  | 'continue';