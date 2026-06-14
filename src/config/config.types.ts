export type Architecture = 'frontend' | 'backend' | 'fullstack';

export interface Config {
  version: number;
  projectName: string;
  architecture: Architecture;
  framework: string;
  packages: string[];
  agents: string[];
  lastSync: string;
}