"use client";

export default function GuidelinesPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-[#1D2229]">Editorial Guidelines</h1>
          <p className="mt-2 text-sm text-gray-600">
            This page explains current admin behavior and permission rules for The Khmer Today CMS.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#1D2229]">How Author Works Now</h2>
          <ul className="mt-3 list-disc pl-5 space-y-2 text-sm text-gray-700">
            <li>Author is no longer selected manually in article/video create form.</li>
            <li>Author is set automatically from your logged-in account username.</li>
            <li>This keeps author data consistent and prevents wrong author assignment.</li>
          </ul>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#1D2229]">Why Some Edit/Delete Buttons Are Disabled</h2>
          <ul className="mt-3 list-disc pl-5 space-y-2 text-sm text-gray-700">
            <li>Admin users can only edit/delete items they created themselves.</li>
            <li>
              If you see a disabled button, the item belongs to another admin account and your role does not
              have permission to modify it.
            </li>
          </ul>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#1D2229]">Profile & Password</h2>
          <ul className="mt-3 list-disc pl-5 space-y-2 text-sm text-gray-700">
            <li>Use the bottom Profile menu and click <strong>Edit Profile</strong>.</li>
            <li>You can change password only from this popup.</li>
            <li>Required fields: Old Password, New Password, Confirm Password.</li>
            <li>Password updates only when old password is correct and new/confirm match.</li>
          </ul>
        </div>

      </div>
    </div>
  );
}

