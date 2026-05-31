# HelixFlow and uSINGA Product Boundary

Manya tools should synchronize without copying each other's purpose.

## uSINGA - API NEXUS

uSINGA owns the API provider layer.

- Store and encrypt API keys.
- Identify providers and key fingerprints.
- Check provider health.
- Track credits, usage, spend, and budgets.
- Choose providers through smart routing.
- Explain provider switches and ask for approval when needed.

## HelixFlow

HelixFlow owns the workflow execution layer.

- Build visual directed acyclic graphs.
- Configure trigger, API request, transform, condition, and output nodes.
- Validate graph structure.
- Schedule dependency-aware execution.
- Record workflow runs and node logs.
- Apply retry and failure policies.
- Show workflow-level monitoring.

## Synchronization rule

When a HelixFlow API request node needs credentials or provider selection, it should ask uSINGA for an approved connection reference or route decision. HelixFlow should store the reference in the workflow definition, not the raw key or provider wallet state.

This keeps the tools connected under Manya while preserving their separate identities.
