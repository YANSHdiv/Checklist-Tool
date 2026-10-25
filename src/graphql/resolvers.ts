import { GraphQLError } from "graphql";
import { prisma } from "@/lib/prisma";
import {
  PREDEFINED_STEPS,
  PREDEFINED_STEP_IDS,
  calculateReleaseStatus,
  validateStepIds,
} from "@/lib/constants";
import type { Release as PrismaRelease } from "@prisma/client";

function formatRelease(release: PrismaRelease) {
  const completedSteps = release.completedSteps || [];
  return {
    id: release.id,
    name: release.name,
    date: release.date.toISOString(),
    status: calculateReleaseStatus(completedSteps),
    additionalInfo: release.additionalInfo,
    completedSteps,
    checklist: PREDEFINED_STEPS.map((step) => ({
      id: step.id,
      label: step.label,
      completed: completedSteps.includes(step.id),
    })),
    createdAt: release.createdAt.toISOString(),
    updatedAt: release.updatedAt.toISOString(),
  };
}

export const resolvers = {
  Query: {
    releases: async () => {
      try {
        const releases = await prisma.release.findMany({
          orderBy: { date: "desc" },
        });
        return releases.map(formatRelease);
      } catch (error) {
        console.error("Error fetching releases:", error);
        throw new GraphQLError("Failed to fetch releases.");
      }
    },

    release: async (_: unknown, { id }: { id: string }) => {
      if (!id) {
        throw new GraphQLError("Release ID is required.");
      }
      try {
        const release = await prisma.release.findUnique({
          where: { id },
        });
        if (!release) {
          return null;
        }
        return formatRelease(release);
      } catch (error) {
        console.error("Error fetching release:", error);
        throw new GraphQLError("Failed to fetch release.");
      }
    },

    predefinedSteps: () => PREDEFINED_STEPS,
  },

  Mutation: {
    createRelease: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          name: string;
          date: string;
          additionalInfo?: string | null;
          completedSteps?: string[] | null;
        };
      }
    ) => {
      const trimmedName = input.name?.trim();
      if (!trimmedName) {
        throw new GraphQLError("Release name is required and cannot be empty.");
      }

      const parsedDate = new Date(input.date);
      if (isNaN(parsedDate.getTime())) {
        throw new GraphQLError("Invalid date provided.");
      }

      const steps = input.completedSteps || [];
      const validation = validateStepIds(steps);
      if (!validation.valid) {
        throw new GraphQLError(
          `Invalid checklist step ID(s): ${validation.invalidIds.join(", ")}`
        );
      }

      const uniqueSteps = Array.from(new Set(steps));

      try {
        const created = await prisma.release.create({
          data: {
            name: trimmedName,
            date: parsedDate,
            additionalInfo: input.additionalInfo?.trim() || null,
            completedSteps: uniqueSteps,
          },
        });
        return formatRelease(created);
      } catch (error) {
        console.error("Error creating release:", error);
        throw new GraphQLError("Failed to create release.");
      }
    },

    updateRelease: async (
      _: unknown,
      {
        id,
        input,
      }: {
        id: string;
        input: {
          name?: string;
          date?: string;
          additionalInfo?: string | null;
          completedSteps?: string[] | null;
        };
      }
    ) => {
      if (!id) {
        throw new GraphQLError("Release ID is required.");
      }

      const dataToUpdate: {
        name?: string;
        date?: Date;
        additionalInfo?: string | null;
        completedSteps?: string[];
      } = {};

      if (input.name !== undefined) {
        const trimmedName = input.name.trim();
        if (!trimmedName) {
          throw new GraphQLError("Release name cannot be empty.");
        }
        dataToUpdate.name = trimmedName;
      }

      if (input.date !== undefined) {
        const parsedDate = new Date(input.date);
        if (isNaN(parsedDate.getTime())) {
          throw new GraphQLError("Invalid date provided.");
        }
        dataToUpdate.date = parsedDate;
      }

      if (input.additionalInfo !== undefined) {
        dataToUpdate.additionalInfo = input.additionalInfo?.trim() || null;
      }

      if (input.completedSteps !== undefined && input.completedSteps !== null) {
        const validation = validateStepIds(input.completedSteps);
        if (!validation.valid) {
          throw new GraphQLError(
            `Invalid checklist step ID(s): ${validation.invalidIds.join(", ")}`
          );
        }
        dataToUpdate.completedSteps = Array.from(new Set(input.completedSteps));
      }

      try {
        const updated = await prisma.release.update({
          where: { id },
          data: dataToUpdate,
        });
        return formatRelease(updated);
      } catch (error) {
        console.error("Error updating release:", error);
        throw new GraphQLError("Failed to update release.");
      }
    },

    toggleReleaseStep: async (
      _: unknown,
      {
        id,
        stepId,
        completed,
      }: {
        id: string;
        stepId: string;
        completed: boolean;
      }
    ) => {
      if (!id) {
        throw new GraphQLError("Release ID is required.");
      }
      if (!PREDEFINED_STEP_IDS.has(stepId)) {
        throw new GraphQLError(`Invalid checklist step ID: ${stepId}`);
      }

      try {
        const existing = await prisma.release.findUnique({
          where: { id },
        });

        if (!existing) {
          throw new GraphQLError("Release not found.");
        }

        const currentSteps = new Set(existing.completedSteps || []);
        if (completed) {
          currentSteps.add(stepId);
        } else {
          currentSteps.delete(stepId);
        }

        const updated = await prisma.release.update({
          where: { id },
          data: {
            completedSteps: Array.from(currentSteps),
          },
        });

        return formatRelease(updated);
      } catch (error) {
        if (error instanceof GraphQLError) throw error;
        console.error("Error toggling release step:", error);
        throw new GraphQLError("Failed to update checklist step.");
      }
    },

    deleteRelease: async (_: unknown, { id }: { id: string }) => {
      if (!id) {
        throw new GraphQLError("Release ID is required.");
      }
      try {
        await prisma.release.delete({
          where: { id },
        });
        return true;
      } catch (error) {
        console.error("Error deleting release:", error);
        throw new GraphQLError("Failed to delete release.");
      }
    },
  },
};
