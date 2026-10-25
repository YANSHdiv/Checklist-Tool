import { describe, it, expect } from "vitest";
import {
  calculateReleaseStatus,
  validateStepIds,
  PREDEFINED_STEPS,
  TOTAL_PREDEFINED_STEPS,
} from "@/lib/constants";

describe("Release Status Calculation", () => {
  it("returns 'planned' for an empty completed steps list", () => {
    expect(calculateReleaseStatus([])).toBe("planned");
  });

  it("returns 'planned' for null or undefined input", () => {
    // @ts-expect-error testing invalid runtime input
    expect(calculateReleaseStatus(null)).toBe("planned");
    // @ts-expect-error testing invalid runtime input
    expect(calculateReleaseStatus(undefined)).toBe("planned");
  });

  it("returns 'planned' if completed steps only contain unknown IDs", () => {
    expect(calculateReleaseStatus(["random_id_1", "invalid_id_2"])).toBe("planned");
  });

  it("returns 'ongoing' when 1 step is completed", () => {
    expect(calculateReleaseStatus(["pr_merged"])).toBe("ongoing");
  });

  it("returns 'ongoing' when some (e.g. 3) steps are completed", () => {
    expect(
      calculateReleaseStatus(["pr_merged", "changelog_updated", "tests_passing"])
    ).toBe("ongoing");
  });

  it("returns 'ongoing' when 6 of 7 steps are completed", () => {
    const sixSteps = PREDEFINED_STEPS.slice(0, 6).map((s) => s.id);
    expect(calculateReleaseStatus(sixSteps)).toBe("ongoing");
  });

  it("returns 'done' when all 7 predefined steps are completed", () => {
    const allSteps = PREDEFINED_STEPS.map((s) => s.id);
    expect(allSteps.length).toBe(TOTAL_PREDEFINED_STEPS);
    expect(calculateReleaseStatus(allSteps)).toBe("done");
  });

  it("ignores duplicate steps when determining status", () => {
    expect(calculateReleaseStatus(["pr_merged", "pr_merged"])).toBe("ongoing");
    const allStepsWithDupes = [
      ...PREDEFINED_STEPS.map((s) => s.id),
      "pr_merged",
      "tests_passing",
    ];
    expect(calculateReleaseStatus(allStepsWithDupes)).toBe("done");
  });
});

describe("Checklist Step ID Validation", () => {
  it("validates legitimate predefined step IDs", () => {
    const valid = validateStepIds(["pr_merged", "deployed_production"]);
    expect(valid.valid).toBe(true);
    expect(valid.invalidIds).toHaveLength(0);
  });

  it("detects invalid step IDs", () => {
    const check = validateStepIds(["pr_merged", "fake_step", "another_unknown"]);
    expect(check.valid).toBe(false);
    expect(check.invalidIds).toEqual(["fake_step", "another_unknown"]);
  });
});
