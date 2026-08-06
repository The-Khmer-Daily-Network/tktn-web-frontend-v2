"use client";

interface UnsavedChangesDialogProps {
  open: boolean;
  onContinueEdit: () => void;
  onDiscard: () => void;
}

export default function UnsavedChangesDialog({
  open,
  onContinueEdit,
  onDiscard,
}: UnsavedChangesDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="unsaved-title"
      >
        <h2
          id="unsaved-title"
          className="text-lg font-semibold text-gray-900"
        >
          Discard changes?
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          You have unsaved changes. Do you want to keep editing or discard and
          go back to the list?
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onContinueEdit}
            className="cursor-pointer rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Keep editing
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="cursor-pointer rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}
