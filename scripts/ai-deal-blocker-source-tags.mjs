export const AI_DEAL_BLOCKER_ENTRY_SOURCES = [
  "homepage-hero",
  "homepage-job-one-answer",
  "free-tools-ai-deal-blocker",
  "start-here-ai-deal-blocker",
  "pricing-ai-route-one-answer",
  "pricing-ai-deal-blocker",
  "blog-index-ai-deal-blocker",
  "ai-procurement-hub-deal-blocker"
];

export const AI_DEAL_BLOCKER_BRANCHES = [
  { suffix: "builder", label: "answer builder" },
  { suffix: "answer-bank", label: "answer bank" },
  { suffix: "evidence-map", label: "evidence map" },
  { suffix: "agent-workspace", label: "AI agent workspace" },
  { suffix: "teardown", label: "free teardown" }
];

export const AI_DEAL_BLOCKER_REQUEST_TYPES = [
  { suffix: "teardown", label: "inline teardown" },
  { suffix: "audit", label: "inline audit" }
];

export function buildAiDealBlockerBranchSourceTags() {
  return AI_DEAL_BLOCKER_ENTRY_SOURCES.flatMap((entrySource) =>
    AI_DEAL_BLOCKER_BRANCHES.map(({ suffix, label }) => ({
      tag: `${entrySource}-${suffix}`,
      label: `${entrySource} -> ${label}`,
      entrySource,
      suffix
    }))
  );
}

export function buildAiDealBlockerRequestSourceTags() {
  return AI_DEAL_BLOCKER_ENTRY_SOURCES.flatMap((entrySource) =>
    AI_DEAL_BLOCKER_REQUEST_TYPES.map(({ suffix, label }) => ({
      tag: `${entrySource}-${suffix}`,
      label: `${entrySource} -> ${label}`,
      entrySource,
      suffix
    }))
  );
}
