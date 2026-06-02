/**
 * A frozen manifest that declares a tool's identity and capability boundaries.
 */
export type ToolManifest = Readonly<{
  /** Foundation name (always "Manya"). */
  foundation: string;
  /** Unique identifier for the tool. */
  id: string;
  /** Human-readable tool name. */
  name: string;
  /** What the tool does. */
  purpose: string;
  /** Capabilities this tool owns exclusively. */
  owns: string[];
  /** Capabilities this tool must not touch. */
  handsOff: string[];
  /** Channels the tool uses for cross-tool synchronization. */
  syncChannels: string[];
}>;

/**
 * Describes a capability claimed by more than one tool.
 */
export type CapabilityOverlap = {
  /** The capability that overlaps. */
  capability: string;
  /** The tool IDs that both claim ownership. */
  owners: string[];
};

/** Foundation identity for the Manya tool ecosystem. */
export declare const MANYA_FOUNDATION: {
  name: "Manya";
  principle: string;
};

/** Maps each capability to the tool that owns it. */
export declare const capabilityOwners: Record<string, string>;

/**
 * Creates a frozen tool manifest.
 * @param input - Manifest fields (id, name, and purpose are required).
 */
export declare function createToolManifest(input: {
  id: string;
  name: string;
  purpose: string;
  owns?: string[];
  handsOff?: string[];
  syncChannels?: string[];
}): ToolManifest;

/**
 * Checks whether manifests have distinct capability ownership.
 * @param manifests - Manifests to validate.
 * @returns Whether ownership is distinct, plus any overlaps found.
 */
export declare function assertDistinctCapabilities(manifests: ToolManifest[]): {
  distinct: boolean;
  overlaps: CapabilityOverlap[];
};

/** Pre-built manifest for uSINGA - API NEXUS. */
export declare const usingaManifest: ToolManifest;

/** Pre-built manifest for HelixFlow. */
export declare const helixFlowManifest: ToolManifest;
