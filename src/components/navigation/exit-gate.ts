// Shared gate for header, system-back and navigation-gesture attempts.
export function createExitGate() {
  let running = false;
  return {
    async attempt(save: () => Promise<void>, leave: () => void | Promise<void>): Promise<boolean | null> {
      if (running) return null;
      running = true;
      try { await save(); await leave(); return true; }
      catch { return false; }
      finally { running = false; }
    },
  };
}
