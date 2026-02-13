// src/components/admin/EmailTemplatesSection.tsx
import React, { useMemo, useState } from "react";
import {
  useEmailTemplatesQuery,
  useUpdateEmailTemplateMutation,
  useCreateEmailTemplateMutation,
  useDeleteEmailTemplateMutation,
} from "../../api/emailTemplates";
import { useAuth } from "../../hooks/useAuth";
import type { EmailTemplate } from "../../api/types";

function getApiMessage(err: any): string {
  return (
    err?.response?.data?.message ||
    err?.message ||
    "Something went wrong. Please try again."
  );
}

const EmailTemplatesSection: React.FC = () => {
  const { user } = useAuth();
  const canUse = user?.role === "ADMIN";

  const { data, isLoading, isError, error } = useEmailTemplatesQuery(canUse);

  const updateMutation = useUpdateEmailTemplateMutation();
  const createMutation = useCreateEmailTemplateMutation();
  const deleteMutation = useDeleteEmailTemplateMutation();

  const templates = data?.templates ?? [];

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selectedTemplate = useMemo(
    () => templates.find((t) => t.key === selectedKey) ?? null,
    [templates, selectedKey]
  );

  // Editor state
  const [localSubject, setLocalSubject] = useState("");
  const [localBody, setLocalBody] = useState("");

  // Create state
  const [isCreating, setIsCreating] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");

  const handleSelect = (template: EmailTemplate) => {
    setIsCreating(false);
    setSelectedKey(template.key);
    setLocalSubject(template.subject);
    setLocalBody(template.body);
  };

  const handleSave = async () => {
    if (!selectedKey) return;
    try {
      await updateMutation.mutateAsync({
        key: selectedKey,
        subject: localSubject,
        body: localBody,
      });
      alert("Template updated");
    } catch (err) {
      console.error(err);
      alert(getApiMessage(err));
    }
  };

  const handleCreate = async () => {
    try {
      const created = await createMutation.mutateAsync({
        key: newKey.trim(),
        subject: newSubject,
        body: newBody,
      });

      // Select the newly created template immediately
      setIsCreating(false);
      setSelectedKey(created.key);
      setLocalSubject(created.subject);
      setLocalBody(created.body);

      // Reset create fields
      setNewKey("");
      setNewSubject("");
      setNewBody("");

      alert("Template created");
    } catch (err) {
      console.error(err);
      alert(getApiMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!selectedKey) return;
    const ok = confirm(
      `Delete template "${selectedKey}"?\n\nThis cannot be undone.`
    );
    if (!ok) return;

    try {
      await deleteMutation.mutateAsync(selectedKey);

      // Clear selection/editor after delete
      setSelectedKey(null);
      setLocalSubject("");
      setLocalBody("");

      alert("Template deleted");
    } catch (err) {
      console.error(err);
      alert(getApiMessage(err));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg text-slate-900">Email Templates</h2>
        <div className="flex items-center gap-2">
          {isLoading && (
            <span className="text-xs text-slate-500">Loading...</span>
          )}
          <button
            type="button"
            onClick={() => {
              setIsCreating((v) => !v);
              setSelectedKey(null);
              setLocalSubject("");
              setLocalBody("");
            }}
            className="px-3 py-1.5 text-xs rounded border hover:bg-slate-50"
          >
            {isCreating ? "Close" : "New template"}
          </button>
        </div>
      </div>

      {isError && (
        <p className="text-sm text-red-600">
          Failed to load email templates: {getApiMessage(error)}
        </p>
      )}

      {!isLoading && templates.length === 0 && !isCreating && (
        <p className="text-sm text-slate-600">
          No email templates found. Create one with “New template”.
        </p>
      )}

      {(templates.length > 0 || isCreating) && (
        <div className="grid md:grid-cols-[200px,1fr] gap-4">
          {/* Template list */}
          <div className="border rounded p-2 space-y-1">
            <p className="text-xs font-semibold text-slate-700 mb-1">
              Templates
            </p>

            {templates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => handleSelect(tpl)}
                className={`w-full text-left text-xs px-2 py-1 rounded ${
                  selectedKey === tpl.key
                    ? "bg-slate-900 text-white"
                    : "hover:bg-slate-100"
                }`}
              >
                {tpl.key}
              </button>
            ))}
          </div>

          {/* Right panel */}
          <div className="space-y-3">
            {isCreating ? (
              <>
                <div className="space-y-1">
                  <label className="block text-sm font-medium">
                    Key (unique, e.g. booking_confirmed)
                  </label>
                  <input
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder="e.g. booking_confirmed"
                  />
                  <p className="text-xs text-slate-500">
                    Allowed: letters/numbers and . _ -
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium">
                    Subject (supports placeholders like {"{{name}}"})
                  </label>
                  <input
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium">
                    Body (supports placeholders like {"{{propertyTitle}}"},{" "}
                    {"{{startDate}}"})
                  </label>
                  <textarea
                    className="w-full border rounded px-2 py-1 text-sm"
                    rows={8}
                    value={newBody}
                    onChange={(e) => setNewBody(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-4 py-1.5 text-sm rounded border hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={createMutation.isPending}
                    className="px-4 py-1.5 text-sm rounded bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {createMutation.isPending ? "Creating..." : "Create template"}
                  </button>
                </div>
              </>
            ) : selectedTemplate ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-600">
                    Editing: <span className="font-semibold">{selectedKey}</span>
                  </p>

                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    className="px-3 py-1.5 text-xs rounded border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    {deleteMutation.isPending ? "Deleting..." : "Delete"}
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium">
                    Subject (supports placeholders like {"{{name}}"})
                  </label>
                  <input
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={localSubject}
                    onChange={(e) => setLocalSubject(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium">
                    Body (supports placeholders like {"{{propertyTitle}}"},{" "}
                    {"{{startDate}}"})
                  </label>
                  <textarea
                    className="w-full border rounded px-2 py-1 text-sm"
                    rows={8}
                    value={localBody}
                    onChange={(e) => setLocalBody(e.target.value)}
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                    className="px-4 py-1.5 text-sm rounded bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {updateMutation.isPending ? "Saving..." : "Save template"}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-600">
                Select a template from the list to edit, or click “New template”.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailTemplatesSection;
