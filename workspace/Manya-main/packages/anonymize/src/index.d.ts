export function redactDataset(
  records: Array<Record<string, unknown>>,
  options?: object
): { records: Array<Record<string, unknown>>; totalRedactions: number; findings: Array<object> };

export function classifyDataset(records: Array<Record<string, unknown>>): {
  level: string;
  score: number;
  confidence: number;
  matchedRules: Array<object>;
  recommendations: string[];
};

export function prepareForPublication(
  records: Array<Record<string, unknown>>,
  manifestInput: { experimentId: string; software: { name: string; version: string }; [key: string]: unknown },
  fairArtifact: { doi?: string; persistentId?: string; repository?: string; format?: string; metadataStandard?: string; license?: string; provenance?: unknown },
  redactOptions?: object
): {
  records: Array<Record<string, unknown>>;
  redaction: { totalRedactions: number; findings: Array<object> };
  sensitivity: object;
  manifest: object;
  fair: { fair: boolean; principles: object; score: number };
  readyToPublish: boolean;
};

export const anonymize: {
  redactDataset: typeof redactDataset;
  classifyDataset: typeof classifyDataset;
  prepareForPublication: typeof prepareForPublication;
};

export default anonymize;
