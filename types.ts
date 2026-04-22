export interface JobConfig {
  includes?: string;
  excludes?: string;
}

export type Config = Record<string, JobConfig>;

export interface RelevanceResult {
  relevant: boolean;
  trigger: string | null;
}
