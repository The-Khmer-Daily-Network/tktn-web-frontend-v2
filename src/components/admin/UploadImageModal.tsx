"use client";

import { useState, useRef } from "react";
import { X, Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import { uploadMultipleContentImages } from "@/services/contentImage";
import type { ContentImage } from "@/types/contentImage";

interface UploadImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: (image: ContentImage) => void;
}

export default function UploadImageModal({
  isOpen,
  onClose,
  onUploadSuccess,
}: UploadImageModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<{ file: File; preview: string }[]>(
    [],
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const totalFiles = selectedFiles.length + files.length;
    if (totalFiles > 4) {
      setError(
        `You can only upload up to 4 images at a time. You currently have ${selectedFiles.length} selected.`,
      );
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    const validFiles: File[] = [];
    let validationError: string | null = null;

    for (const file of files) {
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
      if (!allowedTypes.includes(file.type)) {
        validationError = `${file.name}: Only JPG, PNG, and JPEG files are allowed`;
        continue;
      }

      validFiles.push(file);
    }

    if (validationError && validFiles.length === 0) {
      setError(validationError);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    if (validFiles.length > 0) {
      setError(validationError);
      setSelectedFiles([...selectedFiles, ...validFiles]);

      const newPreviews: { file: File; preview: string }[] = [];
      let loadedCount = 0;

      validFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews.push({
            file,
            preview: reader.result as string,
          });
          loadedCount++;

          if (loadedCount === validFiles.length) {
            setPreviews([...previews, ...newPreviews]);
          }
        };
        reader.readAsDataURL(file);
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError("Please select at least one image file");
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const response = await uploadMultipleContentImages({
        images: selectedFiles,
        title: title.trim() || undefined,
      });

      if (response.success) {
        const uploadedImage = Array.isArray(response.data)
          ? response.data[0]
          : response.data;

        if (onUploadSuccess) {
          onUploadSuccess(uploadedImage);
        }

        resetForm();
        onClose();
      } else {
        setError(response.message || "Upload failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload images");
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedFiles([]);
    setTitle("");
    setPreviews([]);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    setPreviews(newPreviews);
    setError(null);
  };

  const handleClose = () => {
    if (!uploading) {
      resetForm();
      onClose();
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-200"
        onClick={handleClose}
      />
      <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-lg shadow-xl w-full max-w-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900">
              Upload Content Image
            </h2>
            <button
              onClick={handleClose}
              disabled={uploading}
              className="cursor-pointer p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image Files <span className="text-red-500">*</span>
                <span className="text-gray-400 text-xs ml-2">
                  (Up to 4 images)
                </span>
              </label>
              <div className="mt-1">
                {previews.length > 0 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-4 gap-2">
                      {previews.map((item, index) => (
                        <div key={index} className="relative">
                          <div className="relative aspect-square">
                            <img
                              src={item.preview}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover rounded-md border border-gray-200"
                            />
                            <button
                              onClick={() => removeFile(index)}
                              className="absolute top-0.5 right-0.5 p-0.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                              aria-label="Remove image"
                            >
                              <X size={12} />
                            </button>
                          </div>
                          <p className="mt-0.5 text-[9px] text-gray-600 truncate px-0.5">
                            {item.file.name}
                          </p>
                        </div>
                      ))}
                    </div>
                    {selectedFiles.length < 4 && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-gray-300 rounded-md p-2 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        <ImageIcon className="mx-auto h-5 w-5 text-gray-400" />
                        <p className="mt-1 text-[10px] text-gray-600">
                          Add more ({selectedFiles.length}/4)
                        </p>
                      </button>
                    )}
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <span className="text-blue-600 font-medium">
                        Click to upload
                      </span>
                      <span className="text-gray-500"> or drag and drop</span>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      JPG, PNG, JPEG (Max 2MB each, up to 4 images)
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleFileSelect}
                  multiple
                  className="hidden"
                  disabled={uploading}
                />
              </div>
              {selectedFiles.length > 0 && (
                <p className="mt-2 text-sm text-gray-600">
                  Selected: {selectedFiles.length} image(s) (Total:{" "}
                  {(
                    selectedFiles.reduce((sum, file) => sum + file.size, 0) /
                    1024 /
                    1024
                  ).toFixed(2)}{" "}
                  MB)
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title <span className="text-gray-400 text-xs">(Optional)</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Leave empty for auto-generated title"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={uploading}
              />
              <p className="mt-1 text-xs text-gray-500">
                If left empty, the backend will automatically generate a title
              </p>
            </div>
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> You can upload up to 4 images at a time.
                The original filename will be automatically detected from each
                uploaded file.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            <button
              onClick={handleClose}
              disabled={uploading}
              className="cursor-pointer px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || uploading}
              className="cursor-pointer flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {uploading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={18} />
                  Upload
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
