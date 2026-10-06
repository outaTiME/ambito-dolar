// ceiling for the remote cadence, and the longest a client waits to see it lifted
const MAX_INTERVAL = 60 * 60 * 1000;

// the payload can slow the polling without a release, never speed it up
export const getPollInterval = (cadence, isOpen, minimum) => {
  const remote = Number.isFinite(cadence) ? cadence : 0;
  const base = Math.max(remote, minimum);
  // five times slower with the market closed
  return Math.min(isOpen === false ? base * 5 : base, MAX_INTERVAL);
};
