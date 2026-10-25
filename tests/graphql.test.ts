import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolvers } from "@/graphql/resolvers";
import { prisma } from "@/lib/prisma";
import { GraphQLError } from "graphql";

vi.mock("@/lib/prisma", () => {
  return {
    prisma: {
      release: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    },
  };
});

describe("GraphQL Resolvers", () => {
  const mockNow = new Date("2026-10-25T10:00:00.000Z");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Query.predefinedSteps", () => {
    it("returns all 7 predefined checklist steps", () => {
      const steps = resolvers.Query.predefinedSteps();
      expect(steps).toHaveLength(7);
      expect(steps[0].id).toBe("pr_merged");
      expect(steps[6].id).toBe("deployed_production");
    });
  });

  describe("Query.releases", () => {
    it("returns releases with computed status", async () => {
      const mockReleases = [
        {
          id: "r1",
          name: "Release 1",
          date: new Date("2026-10-20T00:00:00.000Z"),
          additionalInfo: "First",
          completedSteps: [],
          createdAt: mockNow,
          updatedAt: mockNow,
        },
        {
          id: "r2",
          name: "Release 2",
          date: new Date("2026-10-21T00:00:00.000Z"),
          additionalInfo: null,
          completedSteps: ["pr_merged", "changelog_updated"],
          createdAt: mockNow,
          updatedAt: mockNow,
        },
        {
          id: "r3",
          name: "Release 3",
          date: new Date("2026-10-22T00:00:00.000Z"),
          additionalInfo: null,
          completedSteps: [
            "pr_merged",
            "changelog_updated",
            "tests_passing",
            "github_releases_created",
            "deployed_demo",
            "tested_demo",
            "deployed_production",
          ],
          createdAt: mockNow,
          updatedAt: mockNow,
        },
      ];

      vi.mocked(prisma.release.findMany).mockResolvedValueOnce(mockReleases);

      const result = await resolvers.Query.releases();
      expect(result).toHaveLength(3);
      expect(result[0].status).toBe("planned");
      expect(result[1].status).toBe("ongoing");
      expect(result[2].status).toBe("done");
    });
  });

  describe("Query.release", () => {
    it("returns null if release not found", async () => {
      vi.mocked(prisma.release.findUnique).mockResolvedValueOnce(null);
      const result = await resolvers.Query.release(null, { id: "non-existent" });
      expect(result).toBeNull();
    });

    it("throws GraphQLError if id is empty", async () => {
      await expect(resolvers.Query.release(null, { id: "" })).rejects.toThrow(
        GraphQLError
      );
    });
  });

  describe("Mutation.createRelease", () => {
    it("creates a release successfully", async () => {
      const mockCreated = {
        id: "new-id",
        name: "v1.0.0",
        date: new Date("2026-11-01T00:00:00.000Z"),
        additionalInfo: "Info",
        completedSteps: ["pr_merged"],
        createdAt: mockNow,
        updatedAt: mockNow,
      };

      vi.mocked(prisma.release.create).mockResolvedValueOnce(mockCreated);

      const result = await resolvers.Mutation.createRelease(null, {
        input: {
          name: "v1.0.0",
          date: "2026-11-01T00:00:00.000Z",
          additionalInfo: "Info",
          completedSteps: ["pr_merged"],
        },
      });

      expect(result.id).toBe("new-id");
      expect(result.name).toBe("v1.0.0");
      expect(result.status).toBe("ongoing");
      expect(result.completedSteps).toEqual(["pr_merged"]);
    });

    it("rejects creation when name is whitespace", async () => {
      await expect(
        resolvers.Mutation.createRelease(null, {
          input: { name: "   ", date: "2026-11-01" },
        })
      ).rejects.toThrow("Release name is required and cannot be empty.");
    });

    it("rejects creation with invalid date", async () => {
      await expect(
        resolvers.Mutation.createRelease(null, {
          input: { name: "v1", date: "not-a-date" },
        })
      ).rejects.toThrow("Invalid date provided.");
    });

    it("rejects creation with invalid step ID", async () => {
      await expect(
        resolvers.Mutation.createRelease(null, {
          input: {
            name: "v1",
            date: "2026-11-01",
            completedSteps: ["unrecognized_step"],
          },
        })
      ).rejects.toThrow("Invalid checklist step ID");
    });
  });

  describe("Mutation.toggleReleaseStep", () => {
    it("adds a step when completed is true", async () => {
      const existing = {
        id: "rel-1",
        name: "Release 1",
        date: mockNow,
        additionalInfo: null,
        completedSteps: [],
        createdAt: mockNow,
        updatedAt: mockNow,
      };

      const updated = {
        ...existing,
        completedSteps: ["pr_merged"],
      };

      vi.mocked(prisma.release.findUnique).mockResolvedValueOnce(existing);
      vi.mocked(prisma.release.update).mockResolvedValueOnce(updated);

      const res = await resolvers.Mutation.toggleReleaseStep(null, {
        id: "rel-1",
        stepId: "pr_merged",
        completed: true,
      });

      expect(res.completedSteps).toContain("pr_merged");
      expect(res.status).toBe("ongoing");
    });

    it("removes a step when completed is false", async () => {
      const existing = {
        id: "rel-1",
        name: "Release 1",
        date: mockNow,
        additionalInfo: null,
        completedSteps: ["pr_merged"],
        createdAt: mockNow,
        updatedAt: mockNow,
      };

      const updated = {
        ...existing,
        completedSteps: [],
      };

      vi.mocked(prisma.release.findUnique).mockResolvedValueOnce(existing);
      vi.mocked(prisma.release.update).mockResolvedValueOnce(updated);

      const res = await resolvers.Mutation.toggleReleaseStep(null, {
        id: "rel-1",
        stepId: "pr_merged",
        completed: false,
      });

      expect(res.completedSteps).toEqual([]);
      expect(res.status).toBe("planned");
    });

    it("rejects toggling with invalid step ID", async () => {
      await expect(
        resolvers.Mutation.toggleReleaseStep(null, {
          id: "rel-1",
          stepId: "invalid_id",
          completed: true,
        })
      ).rejects.toThrow("Invalid checklist step ID: invalid_id");
    });
  });

  describe("Mutation.deleteRelease", () => {
    it("deletes a release successfully", async () => {
      vi.mocked(prisma.release.delete).mockResolvedValueOnce({
        id: "rel-1",
        name: "Release 1",
        date: mockNow,
        additionalInfo: null,
        completedSteps: [],
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      const res = await resolvers.Mutation.deleteRelease(null, { id: "rel-1" });
      expect(res).toBe(true);
    });
  });
});
