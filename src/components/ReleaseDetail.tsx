import React, { useState, useEffect } from "react";
import { Trash2, Check, ChevronRight } from "lucide-react";
import { PREDEFINED_STEPS, calculateReleaseStatus, type ReleaseStatus } from "@/lib/constants";
import StatusBadge from "./StatusBadge";

export interface ReleaseDetailData {
  id?: string;
  name: string;
  date: string;
  status?: ReleaseStatus;
  additionalInfo?: string | null;
  completedSteps: string[];
}

interface ReleaseDetailProps {
  initialData?: ReleaseDetailData | null;
  isNew?: boolean;
  onBack: () => void;
  onSave: (data: {
    name: string;
    date: string;
    additionalInfo: string;
    completedSteps: string[];
  }) => Promise<void>;
  onDeleteRequest?: () => void;
  onToggleStep?: (stepId: string, completed: boolean) => Promise<void>;
}

export const ReleaseDetail: React.FC<ReleaseDetailProps> = ({
  initialData,
  isNew = false,
  onBack,
  onSave,
  onDeleteRequest,
  onToggleStep,
}) => {
  const [name, setName] = useState(initialData?.name || "");
  const [date, setDate] = useState(() => {
    if (!initialData?.date) {
      return new Date().toISOString().split("T")[0];
    }
    const d = new Date(initialData.date);
    return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
  });
  const [additionalInfo, setAdditionalInfo] = useState(
    initialData?.additionalInfo || ""
  );
  const [completedSteps, setCompletedSteps] = useState<string[]>(
    initialData?.completedSteps || []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      if (initialData.date) {
        const d = new Date(initialData.date);
        setDate(isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0]);
      }
      setAdditionalInfo(initialData.additionalInfo || "");
      setCompletedSteps(initialData.completedSteps || []);
    }
  }, [initialData]);

  const currentStatus = calculateReleaseStatus(completedSteps);

  const handleCheckboxToggle = async (stepId: string) => {
    const isCompleted = completedSteps.includes(stepId);
    const newSteps = isCompleted
      ? completedSteps.filter((id) => id !== stepId)
      : [...completedSteps, stepId];

    setCompletedSteps(newSteps);

    // If editing an existing release and onToggleStep is provided, toggle on backend immediately
    if (!isNew && initialData?.id && onToggleStep) {
      try {
        await onToggleStep(stepId, !isCompleted);
      } catch (err) {
        console.error("Step toggle error:", err);
        // revert on failure
        setCompletedSteps(completedSteps);
        setErrorMessage("Failed to toggle step. Please try again.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Release name is required.");
      return;
    }

    if (!date) {
      setErrorMessage("Release date is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        name: trimmedName,
        date: new Date(date).toISOString(),
        additionalInfo: additionalInfo.trim(),
        completedSteps,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save release.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      {/* Top Breadcrumb & Action bar */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200 bg-slate-50/50">
        <div className="flex items-center space-x-2 text-sm">
          <button
            type="button"
            onClick={onBack}
            className="text-indigo-600 hover:text-indigo-800 font-semibold transition"
          >
            All releases
          </button>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-500 font-medium truncate max-w-xs">
            {isNew ? "New release" : name || "Release detail"}
          </span>
          {!isNew && (
            <div className="ml-2">
              <StatusBadge status={currentStatus} />
            </div>
          )}
        </div>

        {!isNew && onDeleteRequest && (
          <button
            type="button"
            onClick={onDeleteRequest}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-md hover:bg-rose-600 transition shadow-sm focus:ring-2 focus:ring-rose-500 focus:ring-offset-1"
          >
            <span>Delete</span>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-sm text-rose-700">
            {errorMessage}
          </div>
        )}

        {/* Release & Date row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="release-name"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Release
            </label>
            <input
              id="release-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Version 1.0.1"
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="release-date"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Date
            </label>
            <input
              id="release-date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Checklist Steps */}
        <div className="pt-2">
          <div className="space-y-3">
            {PREDEFINED_STEPS.map((step) => {
              const isChecked = completedSteps.includes(step.id);
              return (
                <label
                  key={step.id}
                  className="flex items-center space-x-3 cursor-pointer group select-none"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleCheckboxToggle(step.id)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
                  />
                  <span
                    className={`text-sm ${
                      isChecked
                        ? "text-slate-900 font-medium"
                        : "text-slate-700 group-hover:text-slate-900"
                    }`}
                  >
                    {step.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Additional remarks / tasks */}
        <div>
          <label
            htmlFor="additional-remarks"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
          >
            Additional remarks / tasks
          </label>
          <textarea
            id="additional-remarks"
            rows={4}
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            placeholder="Please enter any other important notes for the release"
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-6 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition shadow-sm focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:opacity-50"
          >
            <span>{isSubmitting ? "Saving..." : "Save"}</span>
            <Check className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReleaseDetail;
