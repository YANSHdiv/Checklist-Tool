export interface ChecklistStepDefinition {
  id: string;
  label: string;
}

export type ReleaseStatus = "planned" | "ongoing" | "done";

export const PREDEFINED_STEPS: readonly ChecklistStepDefinition[] = [
  {
    id: "pr_merged",
    label: "All relevant GitHub pull requests have been merged",
  },
  {
    id: "changelog_updated",
    label: "CHANGELOG.md files have been updated",
  },
  {
    id: "tests_passing",
    label: "All tests are passing",
  },
  {
    id: "github_releases_created",
    label: "Releases in Github created",
  },
  {
    id: "deployed_demo",
    label: "Deployed in demo",
  },
  {
    id: "tested_demo",
    label: "Tested thoroughly in demo",
  },
  {
    id: "deployed_production",
    label: "Deployed in production",
  },
] as const;

export const PREDEFINED_STEP_IDS = new Set<string>(
  PREDEFINED_STEPS.map((s) => s.id)
);

export const TOTAL_PREDEFINED_STEPS = PREDEFINED_STEPS.length;

/**
 * Derives the release status strictly from the list of completed step IDs.
 *
 * Rules:
 * - planned: 0 completed valid steps.
 * - ongoing: 1 to 6 completed valid steps.
 * - done: all 7 predefined steps completed.
 */
export function calculateReleaseStatus(completedSteps: readonly string[]): ReleaseStatus {
  if (!completedSteps || !Array.isArray(completedSteps) || completedSteps.length === 0) {
    return "planned";
  }

  // Filter to valid unique predefined step IDs
  const validUniqueCompleted = new Set(
    completedSteps.filter((id) => PREDEFINED_STEP_IDS.has(id))
  );

  const completedCount = validUniqueCompleted.size;

  if (completedCount === 0) {
    return "planned";
  }

  if (completedCount === TOTAL_PREDEFINED_STEPS) {
    return "done";
  }

  return "ongoing";
}

/**
 * Validates a list of completed step IDs, throwing an error or returning invalid IDs if any unknown ID is found.
 */
export function validateStepIds(stepIds: readonly string[]): { valid: boolean; invalidIds: string[] } {
  const invalidIds = stepIds.filter((id) => !PREDEFINED_STEP_IDS.has(id));
  return {
    valid: invalidIds.length === 0,
    invalidIds,
  };
}
