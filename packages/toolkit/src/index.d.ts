export type ToolManifest = Readonly<{
  foundation: string;
  id: string;
  name: string;
  purpose: string;
  owns: string[];
  handsOff: string[];
  syncChannels: string[];
}>;

export type CapabilityOverlap = {
  capability: string;
  owners: string[];
};

export declare const MANYA_FOUNDATION: {
  name: "Manya";
  principle: string;
};

export declare const capabilityOwners: Record<string, string>;

export declare function createToolManifest(input: {
  id: string;
  name: string;
  purpose: string;
  owns?: string[];
  handsOff?: string[];
  syncChannels?: string[];
}): ToolManifest;

export declare function assertDistinctCapabilities(manifests: ToolManifest[]): {
  distinct: boolean;
  overlaps: CapabilityOverlap[];
};

export declare const usingaManifest: ToolManifest;
export declare const helixFlowManifest: ToolManifest;
