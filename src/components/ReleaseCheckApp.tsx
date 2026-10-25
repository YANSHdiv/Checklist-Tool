"use client";

import React, { useState, useEffect, useCallback } from "react";
import ReleasesList, { type ReleaseSummary } from "./ReleasesList";
import ReleaseDetail, { type ReleaseDetailData } from "./ReleaseDetail";
import ConfirmModal from "./ConfirmModal";

async function fetchGraphQL<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch("/api/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();
  if (result.errors && result.errors.length > 0) {
    throw new Error(result.errors[0].message || "GraphQL request failed");
  }
  return result.data as T;
}

export const ReleaseCheckApp: React.FC = () => {
  const [view, setView] = useState<"list" | "detail" | "create">("list");
  const [releases, setReleases] = useState<ReleaseSummary[]>([]);
  const [selectedReleaseId, setSelectedReleaseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Deletion modal state
  const [deleteTarget, setDeleteTarget] = useState<ReleaseSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadReleases = useCallback(async () => {
    try {
      setLoading(true);
      setErrorBanner(null);
      const data = await fetchGraphQL<{ releases: ReleaseSummary[] }>(`
        query GetReleases {
          releases {
            id
            name
            date
            status
            additionalInfo
            completedSteps
          }
        }
      `);
      setReleases(data.releases);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load releases.";
      setErrorBanner(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReleases();
  }, [loadReleases]);

  const selectedRelease = releases.find((r) => r.id === selectedReleaseId) || null;

  const handleCreate = async (data: {
    name: string;
    date: string;
    additionalInfo: string;
    completedSteps: string[];
  }) => {
    setErrorBanner(null);
    const result = await fetchGraphQL<{ createRelease: ReleaseSummary }>(
      `
      mutation CreateRelease($input: CreateReleaseInput!) {
        createRelease(input: $input) {
          id
          name
          date
          status
          additionalInfo
          completedSteps
        }
      }
    `,
      { input: data }
    );

    // Refresh list and return to list view
    await loadReleases();
    setView("list");
    setSelectedReleaseId(null);
  };

  const handleUpdate = async (data: {
    name: string;
    date: string;
    additionalInfo: string;
    completedSteps: string[];
  }) => {
    if (!selectedReleaseId) return;
    setErrorBanner(null);
    await fetchGraphQL<{ updateRelease: ReleaseSummary }>(
      `
      mutation UpdateRelease($id: ID!, $input: UpdateReleaseInput!) {
        updateRelease(id: $id, input: $input) {
          id
          name
          date
          status
          additionalInfo
          completedSteps
        }
      }
    `,
      { id: selectedReleaseId, input: data }
    );

    await loadReleases();
    setView("list");
    setSelectedReleaseId(null);
  };

  const handleToggleStep = async (stepId: string, completed: boolean) => {
    if (!selectedReleaseId) return;
    const result = await fetchGraphQL<{ toggleReleaseStep: ReleaseSummary }>(
      `
      mutation ToggleStep($id: ID!, $stepId: String!, $completed: Boolean!) {
        toggleReleaseStep(id: $id, stepId: $stepId, completed: $completed) {
          id
          name
          date
          status
          additionalInfo
          completedSteps
        }
      }
    `,
      { id: selectedReleaseId, stepId, completed }
    );

    // Update in-memory releases state immediately
    setReleases((prev) =>
      prev.map((r) => (r.id === selectedReleaseId ? { ...r, ...result.toggleReleaseStep } : r))
    );
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await fetchGraphQL<{ deleteRelease: boolean }>(
        `
        mutation DeleteRelease($id: ID!) {
          deleteRelease(id: $id)
        }
      `,
        { id: deleteTarget.id }
      );

      setDeleteTarget(null);
      if (selectedReleaseId === deleteTarget.id) {
        setSelectedReleaseId(null);
        setView("list");
      }
      await loadReleases();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete release.";
      setErrorBanner(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      {/* Centered App Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          ReleaseCheck
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Your all-in-one release checklist tool
        </p>
      </div>

      {/* Global Error Banner */}
      {errorBanner && (
        <div className="max-w-4xl mx-auto mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700 flex justify-between items-center">
          <span>{errorBanner}</span>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            className="text-rose-500 hover:text-rose-700 font-semibold text-xs ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main View Container */}
      <main>
        {view === "list" && (
          <ReleasesList
            releases={releases}
            loading={loading}
            onView={(id) => {
              setSelectedReleaseId(id);
              setView("detail");
            }}
            onCreateNew={() => {
              setSelectedReleaseId(null);
              setView("create");
            }}
            onDeleteRequest={(release) => setDeleteTarget(release)}
          />
        )}

        {view === "create" && (
          <ReleaseDetail
            isNew
            onBack={() => setView("list")}
            onSave={handleCreate}
          />
        )}

        {view === "detail" && selectedRelease && (
          <ReleaseDetail
            initialData={selectedRelease}
            onBack={() => {
              setSelectedReleaseId(null);
              setView("list");
            }}
            onSave={handleUpdate}
            onToggleStep={handleToggleStep}
            onDeleteRequest={() => setDeleteTarget(selectedRelease)}
          />
        )}
      </main>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Delete Release"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        isProcessing={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default ReleaseCheckApp;
