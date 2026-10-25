import React from "react";
import { Plus, Eye, Trash2 } from "lucide-react";
import StatusBadge from "./StatusBadge";
import type { ReleaseStatus } from "@/lib/constants";

export interface ReleaseSummary {
  id: string;
  name: string;
  date: string;
  status: ReleaseStatus;
  additionalInfo?: string | null;
  completedSteps: string[];
}

interface ReleasesListProps {
  releases: ReleaseSummary[];
  loading: boolean;
  onView: (id: string) => void;
  onCreateNew: () => void;
  onDeleteRequest: (release: ReleaseSummary) => void;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export const ReleasesList: React.FC<ReleasesListProps> = ({
  releases,
  loading,
  onView,
  onCreateNew,
  onDeleteRequest,
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      {/* Top action header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200 bg-slate-50/50">
        <h2 className="text-sm font-semibold text-indigo-600 tracking-wide uppercase">
          All releases
        </h2>
        <button
          type="button"
          onClick={onCreateNew}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition shadow-sm focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
        >
          <span>New release</span>
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Table content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
              <th className="py-3 px-6">Release</th>
              <th className="py-3 px-6">Date</th>
              <th className="py-3 px-6">Status</th>
              <th className="py-3 px-4 text-center w-24">View</th>
              <th className="py-3 px-4 text-center w-24">Delete</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-500">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent mb-2"></div>
                  <p>Loading releases...</p>
                </td>
              </tr>
            ) : releases.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-500">
                  <p className="text-base font-medium text-slate-700">No releases found</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Click &ldquo;New release&rdquo; to create your first release checklist.
                  </p>
                </td>
              </tr>
            ) : (
              releases.map((release) => (
                <tr
                  key={release.id}
                  className="hover:bg-slate-50/80 transition-colors group"
                >
                  <td className="py-3.5 px-6 font-medium text-slate-900">
                    {release.name}
                  </td>
                  <td className="py-3.5 px-6 text-slate-600">
                    {formatDate(release.date)}
                  </td>
                  <td className="py-3.5 px-6">
                    <StatusBadge status={release.status} />
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => onView(release.id)}
                      className="inline-flex items-center gap-1 text-slate-600 hover:text-indigo-600 font-medium text-xs px-2.5 py-1 rounded hover:bg-indigo-50 transition"
                      title={`View ${release.name}`}
                    >
                      <span>View</span>
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => onDeleteRequest(release)}
                      className="inline-flex items-center gap-1 text-slate-600 hover:text-rose-600 font-medium text-xs px-2.5 py-1 rounded hover:bg-rose-50 transition"
                      title={`Delete ${release.name}`}
                    >
                      <span>Delete</span>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReleasesList;
