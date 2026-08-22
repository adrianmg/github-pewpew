function create() {
  return { processed: [], failed: [], authError: undefined };
}

// Translates a command summary into the process-level effects owned by the entry point.
function resolveOutcome(summary) {
  return {
    invalidateConfig: Boolean(summary?.authError),
    exitCode: summary?.failed?.length > 0 ? 1 : 0,
  };
}

export default {
  create,
  resolveOutcome,
};
