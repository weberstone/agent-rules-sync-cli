export type Architecture = 'frontend' | 'backend' | 'fullstack';

export interface Config {
  version: number;
  projectName: string;
  architecture: Architecture;
  frameworks: string[];
  packages: string[];
  agents: string[];
  hasUserprompt: boolean;
  lastSync: string;
}