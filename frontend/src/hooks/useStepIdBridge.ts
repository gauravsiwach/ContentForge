import { useEffect } from 'react';

/**
 * Bridges a step's DB id to StepNavigator (which owns the generate/retry/enhance bar)
 * via a window global — mirrors the pattern introduced in PlaceholderStep (Phase 2).
 */
export default function useStepIdBridge(stepId: string | undefined | null) {
  useEffect(() => {
    const setter = (window as Record<string, unknown>).__setStepId as ((id: string | null) => void) | undefined;
    if (setter) setter(stepId || null);
    return () => {
      const cleanup = (window as Record<string, unknown>).__setStepId as ((id: string | null) => void) | undefined;
      if (cleanup) cleanup(null);
    };
  }, [stepId]);
}
