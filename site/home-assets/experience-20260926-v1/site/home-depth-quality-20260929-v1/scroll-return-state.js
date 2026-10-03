export function wheelPixels(event, viewportHeight = 800) {
  const unit = event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? viewportHeight : 1;
  return Math.max(-180, Math.min(180, event.deltaY * unit));
}

// Only input can add charge. Time can only discharge it.
export function createReturnCharge({ revealDistance = 420, chargeDistance = 1250, decayPerSecond = .035, idleDelay = 800 } = {}) {
  let reveal = 0, charge = 0, lastInput = -Infinity, lastTick = null, complete = false;
  const snapshot = () => ({ reveal: reveal / revealDistance, charge, complete });
  return {
    reset() { reveal = 0; charge = 0; lastInput = -Infinity; lastTick = null; complete = false; return snapshot(); },
    input(delta, now) {
      if (!Number.isFinite(delta) || complete) return snapshot();
      lastInput = now; lastTick = now;
      if (delta > 0) {
        const spent = Math.min(delta, revealDistance - reveal);
        reveal += spent;
        charge = Math.min(1, charge + (delta - spent) / chargeDistance);
      } else {
        const spent = Math.min(-delta, charge * chargeDistance);
        charge = Math.max(0, charge - spent / chargeDistance);
        reveal = Math.max(0, reveal - (-delta - spent));
      }
      complete = charge >= 1;
      return snapshot();
    },
    tick(now, visible = true) {
      if (lastTick === null || !visible) { lastTick = now; return snapshot(); }
      const from = Math.max(lastTick, lastInput + idleDelay);
      if (!complete) charge = Math.max(0, charge - Math.max(0, now - from) / 1000 * decayPerSecond);
      lastTick = now;
      return snapshot();
    },
    snapshot
  };
}
