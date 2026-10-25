import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ALL_STEPS = [
  "pr_merged",
  "changelog_updated",
  "tests_passing",
  "github_releases_created",
  "deployed_demo",
  "tested_demo",
  "deployed_production",
];

async function main() {
  console.log("Seeding releases database...");

  // Clear existing records if re-seeding
  await prisma.release.deleteMany({});

  await prisma.release.createMany({
    data: [
      {
        name: "Version 1.0.1",
        date: new Date("2022-09-20T00:00:00.000Z"),
        additionalInfo: "Initial production launch release.",
        completedSteps: ALL_STEPS,
      },
      {
        name: "Version 1.0.2",
        date: new Date("2022-09-28T00:00:00.000Z"),
        additionalInfo: "Bug fix release for user interface layout.",
        completedSteps: ALL_STEPS,
      },
      {
        name: "Version 1.1.0",
        date: new Date("2022-10-10T00:00:00.000Z"),
        additionalInfo: "Feature release currently in demo testing.",
        completedSteps: ALL_STEPS.slice(0, 4),
      },
      {
        name: "Version 2 (beta)",
        date: new Date("2022-11-01T00:00:00.000Z"),
        additionalInfo: "Upcoming major redesign and performance enhancements.",
        completedSteps: [],
      },
    ],
  });

  console.log("Seeding complete. 4 releases created matching the mockup.");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
