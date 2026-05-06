const MAX_FIELD_LENGTH = 2000;

function clean(value) {
  return String(value || "").trim().slice(0, MAX_FIELD_LENGTH);
}

function cleanList(values, limit) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.map((value) => clean(value)).filter(Boolean).slice(0, limit);
}

function buildForwardedRecord(payload, receivedAt = new Date().toISOString()) {
  return {
    referenceId: clean(payload.referenceId) || `WH-${receivedAt.replace(/[-:]/g, "").slice(0, 15)}`,
    receivedAt,
    forwardedAt: clean(payload.storedAt || payload.submittedAt || receivedAt),
    storedAt: clean(payload.storedAt),
    submittedAt: clean(payload.submittedAt),
    company: clean(payload.company),
    email: clean(payload.email),
    type: clean(payload.type),
    ownershipSignal: clean(payload.ownershipSignal),
    sourceTag: clean(payload.sourceTag),
    submissionChannel: clean(payload.submissionChannel),
    subprocessorUrl: clean(payload.subprocessorUrl),
    vendorChange: clean(payload.vendorChange),
    deadline: clean(payload.deadline),
    reviewNeed: clean(payload.reviewNeed),
    partnerRole: clean(payload.partnerRole),
    clientProfile: clean(payload.clientProfile),
    partnerGoal: clean(payload.partnerGoal),
    partnerVolume: clean(payload.partnerVolume),
    scoreLabel: clean(payload.scoreLabel),
    scoreBand: clean(payload.scoreBand),
    summary: clean(payload.summary),
    score: Number.isFinite(payload.score) ? payload.score : null,
    scoreDisplay: clean(payload.scoreDisplay),
    topGaps: cleanList(payload.topGaps, 4),
    selectedChecks: cleanList(payload.selectedChecks, 10),
    storagePath: clean(payload.storagePath),
    storageUrl: clean(payload.storageUrl),
    userAgent: clean(payload.userAgent),
    source: "contact-webhook"
  };
}

module.exports = {
  buildForwardedRecord
};
