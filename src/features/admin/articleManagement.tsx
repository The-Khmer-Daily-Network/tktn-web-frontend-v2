"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Edit2, Trash2, X, Image as ImageIcon, Link2 } from "lucide-react";
import { normalizeLinkUrl } from "@/utils/inlineFormatting";
import {
  getAdminArticles,
  createArticle,
  updateArticle,
  deleteArticle,
} from "@/services/article";
import { getCategories } from "@/services/category";
import { getStoredUser } from "@/services/auth";
import { uploadContentCover, deleteContentCover } from "@/services/contentCover";
import { uploadContentImage, deleteContentImage } from "@/services/contentImage";
import type { Article } from "@/types/article";
import type { ArticleContentBlock, ArticleEndImage } from "@/types/article";
import type { Category } from "@/types/category";
import ImageSelectorModal from "@/components/admin/ImageSelectorModal";
import type { ContentImage } from "@/types/contentImage";

interface ArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  article?: Article | null;
  categories: Category[];
}

function ArticleModal({
  isOpen,
  onClose,
  onSuccess,
  article: articleProp,
  categories,
}: ArticleModalProps) {
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [cover, setCover] = useState<string | null>(null);
  const [coverName, setCoverName] = useState<string | null>(null);
  const [coverUrlInput, setCoverUrlInput] = useState("");
  const [coverContentId, setCoverContentId] = useState<number | null>(null);
  const [subtitle, setSubtitle] = useState("");
  const [contentBlocks, setContentBlocks] = useState<ArticleContentBlock[]>([
    { subtitle: null, paragraph: "" },
  ]);
  const [middleImageUrl, setMiddleImageUrl] = useState<string | null>(null);
  const [middleImageName, setMiddleImageName] = useState<string | null>(null);
  const [middleImageUrlInput, setMiddleImageUrlInput] = useState("");
  const [middleImageContentId, setMiddleImageContentId] = useState<number | null>(null);
  const [endImages, setEndImages] = useState<ArticleEndImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [middleImageUploading, setMiddleImageUploading] = useState(false);
  const [endImageUploadingIndex, setEndImageUploadingIndex] = useState<number | null>(null);
  const [endImageContentIds, setEndImageContentIds] = useState<Array<number | null>>([
    null,
    null,
    null,
  ]);

  // Modal states
  const [isMiddleImageModalOpen, setIsMiddleImageModalOpen] = useState(false);

  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);
  const contentBlocksContainerRef = useRef<HTMLDivElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);
  const middleImageFileInputRef = useRef<HTMLInputElement | null>(null);
  const endImageFileInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const paragraphTextareaRefs = useRef<Array<HTMLTextAreaElement | null>>([]);
  const MAX_IMAGE_SIZE_BYTES = 2_000_000; // 2.00 MB strict
  const currentUser = getStoredUser();
  const currentUserId = currentUser?.id ?? null;
  const currentUsername = currentUser?.username ?? "Unknown user";

  const handleClose = async () => {
    // If user closes without saving and we uploaded a new cover in this session,
    // clean it up from content covers so unused images are not kept.
    if (!loading) {
      if (coverContentId != null) {
        try {
          await deleteContentCover(coverContentId);
        } catch {
        } finally {
          setCoverContentId(null);
        }
      }
      if (middleImageContentId != null) {
        try {
          await deleteContentImage(middleImageContentId);
        } catch {
        } finally {
          setMiddleImageContentId(null);
        }
      }

      // Cleanup any uploaded end images that haven't been saved
      for (const id of endImageContentIds) {
        if (id != null) {
          try {
            await deleteContentImage(id);
          } catch {
          }
        }
      }
    }
    onClose();
  };

  useEffect(() => {
    if (articleProp) {
      setCategoryId(articleProp.category_id);
      setUserId(articleProp.user_id ?? currentUserId);
      setTitle(articleProp.title);
      setCover(articleProp.cover);
      setCoverName(articleProp.cover_name);
      setCoverContentId(null);
      setSubtitle(articleProp.subtitle || "");
      setContentBlocks(
        articleProp.content_blocks && articleProp.content_blocks.length > 0
          ? articleProp.content_blocks
          : [{ subtitle: null, paragraph: "" }],
      );
      setMiddleImageUrl(articleProp.middle_image_url);
      setMiddleImageName(articleProp.middle_image_name);
      setMiddleImageContentId(null);
      setEndImages(
        articleProp.end_images && articleProp.end_images.length > 0
          ? articleProp.end_images
          : [],
      );
      setEndImageContentIds([null, null, null]);
    } else {
      setCategoryId(null);
      setUserId(currentUserId);
      setTitle("");
      setCover(null);
      setCoverName(null);
      setCoverUrlInput("");
      setCoverContentId(null);
      setSubtitle("");
      setContentBlocks([{ subtitle: null, paragraph: "" }]);
      setMiddleImageUrl(null);
      setMiddleImageName(null);
      setMiddleImageUrlInput("");
      setMiddleImageContentId(null);
      setEndImages([]);
      setEndImageContentIds([null, null, null]);
    }
    setError(null);
  }, [articleProp, isOpen, currentUserId]);

  const handleCoverFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError("Cover image must be 2MB or smaller.");
      if (event.target) {
        event.target.value = "";
      }
      return;
    }

    try {
      setCoverUploading(true);
      setError(null);

      const response = await uploadContentCover({
        image: file,
        title: coverName || undefined,
      });

      const data = Array.isArray(response.data)
        ? response.data[0]
        : response.data;

      setCover(data.image_url);
      setCoverName(data.title || null);
      setCoverUrlInput("");
      setCoverContentId(data.id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to upload cover image",
      );
    } finally {
      setCoverUploading(false);
      // Reset input so the same file can be selected again if needed
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const handleMiddleImageFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError("Middle image must be 2MB or smaller.");
      if (event.target) {
        event.target.value = "";
      }
      return;
    }

    try {
      setMiddleImageUploading(true);
      setError(null);

      const response = await uploadContentImage({
        image: file,
        title: middleImageName || undefined,
      });

      const data = Array.isArray(response.data)
        ? response.data[0]
        : response.data;

      setMiddleImageUrl(data.image_url);
      setMiddleImageName(data.title || null);
      setMiddleImageUrlInput("");
      setMiddleImageContentId(data.id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to upload middle image",
      );
    } finally {
      setMiddleImageUploading(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const handleRemoveMiddleImage = async () => {
    if (middleImageContentId != null) {
      try {
        await deleteContentImage(middleImageContentId);
      } catch {
        // ignore cleanup errors
      } finally {
        setMiddleImageContentId(null);
      }
    }
    setMiddleImageUrl(null);
    setMiddleImageName(null);
    setMiddleImageUrlInput("");
  };

  const handleRemoveCover = async () => {
    if (coverContentId != null) {
      try {
        await deleteContentCover(coverContentId);
      } catch {
        // Ignore errors when cleaning up from content covers
      }
    }
    setCover(null);
    setCoverName(null);
    setCoverUrlInput("");
    setCoverContentId(null);
  };

  // Auto-resize title textarea to fit content
  useEffect(() => {
    const ta = titleTextareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [title]);

  // Auto-resize content block textareas (subtitle + paragraph)
  useEffect(() => {
    const container = contentBlocksContainerRef.current;
    if (!container) return;
    const runResize = () => {
      const textareas = container.querySelectorAll<HTMLTextAreaElement>("textarea.auto-resize");
      textareas.forEach((ta) => {
        // Reset height so scrollHeight reflects full content (textarea ignores height:auto)
        ta.style.height = "2px";
        const isSubtitle = ta.getAttribute("data-subtitle") === "true";
        const minH = isSubtitle ? 40 : 96; // min-h-10 / min-h-24
        const maxH = isSubtitle ? 150 : 10000; // content can grow with content
        const h = Math.max(minH, Math.min(ta.scrollHeight, maxH));
        ta.style.height = `${h}px`;
      });
    };
    runResize();
    // Run again after paint so we measure with latest content
    const id = requestAnimationFrame(runResize);
    return () => cancelAnimationFrame(id);
  }, [contentBlocks]);

  const handleAddContentBlock = () => {
    setContentBlocks([...contentBlocks, { subtitle: null, paragraph: "" }]);
  };

  const handleRemoveContentBlock = (index: number) => {
    if (contentBlocks.length > 1) {
      setContentBlocks(contentBlocks.filter((_, i) => i !== index));
    }
  };

  const handleUpdateContentBlock = (
    index: number,
    field: "subtitle" | "paragraph",
    value: string | null,
  ) => {
    const updated = [...contentBlocks];
    updated[index] = { ...updated[index], [field]: value };
    setContentBlocks(updated);
  };

  const applyParagraphSelectionFormat = (
    index: number,
    formatter: (selected: string) => string,
  ) => {
    const textarea = paragraphTextareaRefs.current[index];
    if (!textarea) return;

    const selectionStart = textarea.selectionStart ?? 0;
    const selectionEnd = textarea.selectionEnd ?? 0;
    const selectedText = textarea.value.slice(selectionStart, selectionEnd);

    if (!selectedText.trim()) {
      return;
    }

    const replacement = formatter(selectedText);
    const nextValue =
      textarea.value.slice(0, selectionStart) +
      replacement +
      textarea.value.slice(selectionEnd);

    handleUpdateContentBlock(index, "paragraph", nextValue);

    requestAnimationFrame(() => {
      const target = paragraphTextareaRefs.current[index];
      if (!target) return;
      target.focus();
      target.setSelectionRange(
        selectionStart,
        selectionStart + replacement.length,
      );
    });
  };

  const handleParagraphBoldShortcut = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    index: number,
  ) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      applyParagraphSelectionFormat(index, (selected) => `**${selected}**`);
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "u") {
      e.preventDefault();
      handleParagraphLinkInsert(index);
    }
  };

  const handleParagraphLinkInsert = (index: number) => {
    const textarea = paragraphTextareaRefs.current[index];
    if (!textarea) return;

    const selectionStart = textarea.selectionStart ?? 0;
    const selectionEnd = textarea.selectionEnd ?? 0;
    const selectedText = textarea.value.slice(selectionStart, selectionEnd).trim();

    if (!selectedText) {
      setError("Select text first, then click Link.");
      return;
    }

    const looksLikeUrl = /^(https?:\/\/|www\.)/i.test(selectedText);
    const defaultUrl = looksLikeUrl ? normalizeLinkUrl(selectedText) : "https://";
    const rawUrl = window.prompt("Enter URL for this link", defaultUrl);
    if (rawUrl == null) return;

    const href = normalizeLinkUrl(rawUrl);
    if (!href) return;

    applyParagraphSelectionFormat(index, (selected) => `[${selected}](${href})`);
  };

  const handleSelectMiddleImage = (image: ContentImage) => {
    setMiddleImageUrl(image.image_url);
    setMiddleImageName(null);
    setMiddleImageUrlInput("");
  };

  const handleSelectEndImageFile = async (
    slotIndex: number,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError("End image must be 2MB or smaller.");
      if (event.target) {
        event.target.value = "";
      }
      return;
    }

    try {
      setEndImageUploadingIndex(slotIndex);
      setError(null);

      const response = await uploadContentImage({
        image: file,
        title: endImages[slotIndex]?.name || undefined,
      });

      const data = Array.isArray(response.data)
        ? response.data[0]
        : response.data;

      const updated = [...endImages];
      updated[slotIndex] = {
        url: data.image_url,
        name: updated[slotIndex]?.name ?? null,
      };
      setEndImages(updated);

      const idUpdated = [...endImageContentIds];
      idUpdated[slotIndex] = data.id;
      setEndImageContentIds(idUpdated);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to upload end image",
      );
    } finally {
      setEndImageUploadingIndex(null);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const handleRemoveEndImage = async (index: number) => {
    const id = endImageContentIds[index];
    if (id != null) {
      try {
        await deleteContentImage(id);
      } catch {
        // ignore cleanup errors
      }
    }
    setEndImages(endImages.filter((_, i) => i !== index));
    setEndImageContentIds(
      endImageContentIds.map((v, i) => (i === index ? null : v)),
    );
  };

  const handleCoverUrlChange = (url: string) => {
    setCoverUrlInput(url);
    if (url.trim()) {
      setCover(url.trim());
    }
  };

  const handleMiddleImageUrlChange = (url: string) => {
    setMiddleImageUrlInput(url);
    if (url.trim()) {
      setMiddleImageUrl(url.trim());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!userId) {
      setError("Unable to detect current user for author.");
      return;
    }
    if (!categoryId) {
      setError("Please select a category");
      return;
    }
    if (title.length > 100) {
      setError("Your title is too long. Please use 100 characters or less.");
      return;
    }

    // Validate content blocks
    const validBlocks = contentBlocks.filter((block) => block.paragraph.trim());
    if (validBlocks.length === 0) {
      setError("At least one content block with paragraph is required");
      return;
    }
    const subtitleOverLimit = contentBlocks.find(
      (b) => b.subtitle != null && b.subtitle.length > 250,
    );
    if (subtitleOverLimit) {
      setError("Subtitle in a content block must be 250 characters or less.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = {
        category_id: categoryId ?? null,
        user_id: userId,
        title: title.trim(),
        cover: cover ?? null,
        cover_name: coverName ?? null,
        subtitle: null,
        content_blocks: validBlocks,
        end_images: endImages.length > 0 ? endImages : undefined,
        middle_image_url: middleImageUrl ?? null,
        middle_image_name: middleImageName ?? null,
      };

      if (articleProp) {
        await updateArticle(articleProp.id, params);
      } else {
        await createArticle(params);
      }

      // Once saved, keep the uploaded cover in content covers
      setCoverContentId(null);
      // Once saved, keep uploaded middle and end images in content images
      setMiddleImageContentId(null);
      setEndImageContentIds([null, null, null]);
      onSuccess();
      onClose();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save article";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Flatten categories for dropdown (main categories and subcategories)
  const allCategories: Array<{ id: number; name: string; isSub: boolean }> = [];
  categories.forEach((cat) => {
    allCategories.push({ id: cat.id, name: cat.name, isSub: false });
    cat.subcategories.forEach((sub) => {
      allCategories.push({ id: sub.id, name: `  └ ${sub.name}`, isSub: true });
    });
  });

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
        onClick={handleClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto scrollbar-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
            <h2 className="text-xl font-semibold text-gray-900">
              {articleProp ? "Edit" : "Create"} Article
            </h2>
            <button
              onClick={handleClose}
              disabled={loading}
              className="cursor-pointer p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 flex flex-col">
            {/* Two-column layout: 70% Details (left), 30% Images & Media (right) */}
            <div className="flex gap-6 min-h-0 flex-1 max-h-[calc(90vh-14rem)] overflow-hidden">
              {/* Left column — Details (~70%) */}
              <div className="flex-1 min-w-0 space-y-6 overflow-y-auto scrollbar-hidden">
                {/* Basic Information Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b-2 border-gray-200">
                    <div className="w-1 h-6 bg-blue-600 rounded"></div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Details
                    </h3>
                  </div>

                  <div
                    className={`relative rounded-lg border bg-white p-4 ${title.length > 100
                        ? "border-2 border-[#B00020]"
                        : "border border-gray-300"
                      }`}
                  >
                    <label className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-700">
                      Article Title{" "}
                      <span className="text-gray-500">(required)</span>
                    </label>
                    <textarea
                      ref={titleTextareaRef}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter a compelling article title..."
                      rows={1}
                      className="w-full min-h-[2.5rem] resize-none overflow-hidden border-0 bg-transparent py-0 text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0"
                      disabled={loading}
                      required
                    />
                    <div className="mt-2 flex justify-end text-[12px]">
                      <span
                        className={
                          title.length > 100
                            ? "font-medium text-[#B00020]"
                            : "text-gray-500"
                        }
                      >
                        {title.length}
                      </span>
                      <span className="text-gray-500">/100</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[#6B7280]">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={categoryId || ""}
                        onChange={(e) =>
                          setCategoryId(
                            e.target.value ? parseInt(e.target.value) : null,
                          )
                        }
                        className="w-full appearance-none rounded-lg border border-[#D1D5DB] bg-white px-4 py-3 text-[15px] text-gray-900 shadow-sm transition-all focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23000'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                          backgroundSize: "1.25rem",
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 0.75rem center",
                          paddingRight: "2.25rem",
                        }}
                        disabled={loading}
                      >
                        <option value="">Select</option>
                        {allCategories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[#6B7280]">
                        Author <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={currentUsername}
                        readOnly
                        className="w-full rounded-lg border border-[#D1D5DB] bg-gray-50 px-4 py-3 text-[15px] text-gray-700 shadow-sm"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Author is set automatically from your logged-in account.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Content Blocks Section — left column */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b-2 border-gray-200">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-6 bg-blue-600 rounded"></div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Content Blocks <span className="text-red-500">*</span>
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddContentBlock}
                      className="cursor-pointer px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1.5 font-medium"
                      disabled={loading}
                    >
                      <Plus size={14} />
                      Add Block
                    </button>
                  </div>
                  <div
                    className="space-y-3"
                    ref={contentBlocksContainerRef}
                  >
                    {contentBlocks.map((block, index) => {
                      const subtitleLen = (block.subtitle || "").length;
                      const subtitleOverLimit = subtitleLen > 250;
                      return (
                        <div
                          key={index}
                          className="p-4 border border-gray-300 rounded-lg bg-white hover:border-blue-400 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                                <span className="text-xs font-semibold text-blue-600">
                                  {index + 1}
                                </span>
                              </div>
                              <span className="text-sm font-medium text-gray-700">
                                Block {index + 1}
                              </span>
                            </div>
                            {contentBlocks.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveContentBlock(index)}
                                className="cursor-pointer px-2 py-1 text-xs text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors font-medium"
                                disabled={loading}
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <div className="space-y-2.5">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Subtitle{" "}
                                <span className="text-gray-400 font-normal">
                                  (Optional, max 250)
                                </span>
                              </label>
                              <textarea
                                data-subtitle="true"
                                className={`auto-resize w-full min-h-10 resize-none overflow-hidden px-3 py-2 rounded-md text-sm text-gray-900 placeholder:text-gray-400 bg-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${subtitleOverLimit
                                    ? "border-2 border-[#B00020]"
                                    : "border border-gray-300"
                                  }`}
                                value={block.subtitle || ""}
                                onChange={(e) =>
                                  handleUpdateContentBlock(
                                    index,
                                    "subtitle",
                                    e.target.value || null,
                                  )
                                }
                                placeholder="Enter a subtitle for this block (optional)..."
                                rows={1}
                                maxLength={250}
                                disabled={loading}
                              />
                              <div className="mt-1 flex justify-end text-[12px]">
                                <span
                                  className={
                                    subtitleOverLimit
                                      ? "font-medium text-[#B00020]"
                                      : "text-gray-500"
                                  }
                                >
                                  {subtitleLen}
                                </span>
                                <span className="text-gray-500">/250</span>
                              </div>
                              {subtitleOverLimit && (
                                <p className="mt-1 text-xs text-[#B00020]">
                                  Subtitle must be 250 characters or less.
                                </p>
                              )}
                            </div>
                            <div>
                              <div className="mb-1 flex items-center justify-between">
                                <label className="block text-xs font-medium text-gray-600">
                                  Content <span className="text-red-500">*</span>
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleParagraphLinkInsert(index)}
                                  className="cursor-pointer inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50"
                                  disabled={loading}
                                  title="Select text and add a link"
                                >
                                  <Link2 size={12} />
                                  Link
                                </button>
                              </div>
                              <textarea
                                ref={(el) => {
                                  paragraphTextareaRefs.current[index] = el;
                                }}
                                className="auto-resize w-full min-h-24 resize-none overflow-hidden px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm text-gray-900 placeholder:text-gray-400 bg-white"
                                value={block.paragraph}
                                onChange={(e) =>
                                  handleUpdateContentBlock(
                                    index,
                                    "paragraph",
                                    e.target.value,
                                  )
                                }
                                onKeyDown={(e) => handleParagraphBoldShortcut(e, index)}
                                placeholder="Enter the main content for this block..."
                                rows={3}
                                disabled={loading}
                                required
                              />
                              <p className="mt-1 text-[11px] text-gray-500">
                                Shortcuts: Cmd+U (Mac) / Ctrl+U (Windows) for link
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right column — Images & Media only (~30%) */}
              <div className="flex flex-col gap-4 overflow-y-auto border-l border-gray-200 pl-6 min-w-[18rem] w-[30%] shrink-0 scrollbar-hidden">
                <div className="flex items-center gap-2 pb-2 border-b-2 border-gray-200 shrink-0">
                  <div className="w-1 h-6 bg-blue-600 rounded"></div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Images & Media
                  </h3>
                </div>

                <div className="space-y-4">
                  {/* Cover Image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cover Image
                    </label>
                    {cover ? (
                      <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="relative flex-shrink-0">
                          <img
                            src={cover}
                            alt="Cover"
                            className="w-32 h-32 object-cover rounded-lg border border-gray-300 shadow-sm"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveCover}
                            className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                            disabled={loading || coverUploading}
                          >
                            <X size={12} />
                          </button>
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Image Name{" "}
                              <span className="text-gray-400 font-normal">
                                (Optional)
                              </span>
                            </label>
                            <input
                              type="text"
                              value={coverName || ""}
                              onChange={(e) =>
                                setCoverName(e.target.value || null)
                              }
                              placeholder="Enter image name (optional)..."
                              className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder:text-gray-400 bg-white"
                              disabled={loading}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => coverFileInputRef.current?.click()}
                            className="cursor-pointer px-3 py-1.5 text-xs bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
                            disabled={loading || coverUploading}
                          >
                            {coverUploading ? "Uploading..." : "Change Image"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => coverFileInputRef.current?.click()}
                          className="cursor-pointer w-full border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/30 transition-colors text-center group"
                          disabled={loading || coverUploading}
                        >
                          <div className="flex flex-col items-center">
                            <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center mb-2 group-hover:bg-blue-100 transition-colors">
                              <ImageIcon className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                            </div>
                            <p className="text-sm font-medium text-gray-700 mb-1">
                              Select Cover Image
                            </p>
                            <p className="text-xs text-gray-500">
                              Click to upload from your computer
                            </p>
                          </div>
                        </button>
                        <input
                          ref={coverFileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleCoverFileChange}
                        />
                        <div className="flex items-center gap-2">
                          <div className="flex-1 border-t border-gray-300"></div>
                          <span className="text-xs text-gray-500">OR</span>
                          <div className="flex-1 border-t border-gray-300"></div>
                        </div>
                        <input
                          type="url"
                          value={coverUrlInput}
                          onChange={(e) => handleCoverUrlChange(e.target.value)}
                          placeholder="Enter image URL..."
                          className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder:text-gray-400 bg-white"
                          disabled={loading}
                        />
                      </div>
                    )}
                  </div>

                  {/* Middle Image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Middle Image
                    </label>
                  {middleImageUrl ? (
                      <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="relative flex-shrink-0">
                          <img
                            src={middleImageUrl}
                            alt="Middle"
                            className="w-32 h-32 object-cover rounded-lg border border-gray-300 shadow-sm"
                          />
                          <button
                            type="button"
                          onClick={handleRemoveMiddleImage}
                            className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                          disabled={loading || middleImageUploading}
                          >
                            <X size={12} />
                          </button>
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Image Name{" "}
                              <span className="text-gray-400 font-normal">
                                (Optional)
                              </span>
                            </label>
                            <input
                              type="text"
                              value={middleImageName || ""}
                              onChange={(e) =>
                                setMiddleImageName(e.target.value || null)
                              }
                              placeholder="Enter image name (optional)..."
                              className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder:text-gray-400 bg-white"
                              disabled={loading}
                            />
                          </div>
                          <button
                            type="button"
                          onClick={() => middleImageFileInputRef.current?.click()}
                            className="cursor-pointer px-3 py-1.5 text-xs bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
                          disabled={loading || middleImageUploading}
                          >
                          {middleImageUploading ? "Uploading..." : "Change Image"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <button
                          type="button"
                        onClick={() => middleImageFileInputRef.current?.click()}
                          className="cursor-pointer w-full border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/30 transition-colors text-center group"
                        disabled={loading || middleImageUploading}
                        >
                          <div className="flex flex-col items-center">
                            <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center mb-2 group-hover:bg-blue-100 transition-colors">
                              <ImageIcon className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                            </div>
                            <p className="text-sm font-medium text-gray-700 mb-1">
                              Select Middle Image
                            </p>
                            <p className="text-xs text-gray-500">
                            Click to upload from your computer
                            </p>
                          </div>
                        </button>
                      <input
                        ref={middleImageFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleMiddleImageFileChange}
                      />
                        <div className="flex items-center gap-2">
                          <div className="flex-1 border-t border-gray-300"></div>
                          <span className="text-xs text-gray-500">OR</span>
                          <div className="flex-1 border-t border-gray-300"></div>
                        </div>
                        <input
                          type="url"
                          value={middleImageUrlInput}
                          onChange={(e) =>
                            handleMiddleImageUrlChange(e.target.value)
                          }
                          placeholder="Enter image URL..."
                          className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder:text-gray-400 bg-white"
                          disabled={loading}
                        />
                      </div>
                    )}
                  </div>

                  {/* End Images */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        End Images{" "}
                        <span className="text-xs font-normal text-gray-500">
                          (Max 3)
                        </span>
                      </label>
                    </div>
                    <div className="space-y-3">
                      {[0, 1, 2].map((slotIndex) => {
                        const img = endImages[slotIndex];
                        const isUploading = endImageUploadingIndex === slotIndex;
                        return (
                          <div key={slotIndex} className="space-y-2">
                            {img ? (
                              <>
                                <div className="relative group">
                                  <div className="relative aspect-square rounded-lg border border-gray-300 overflow-hidden bg-gray-100">
                                    <img
                                      src={img.url}
                                      alt={img.name || `End ${slotIndex + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRemoveEndImage(slotIndex)
                                      }
                                      className="absolute top-1.5 right-1.5 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 shadow-md"
                                      disabled={loading || isUploading}
                                    >
                                      <X size={10} />
                                    </button>
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Name{" "}
                                    <span className="text-gray-400 font-normal">
                                      (Optional)
                                    </span>
                                  </label>
                                  <input
                                    type="text"
                                    value={img.name || ""}
                                    onChange={(e) => {
                                      const updated = [...endImages];
                                      updated[slotIndex] = {
                                        ...updated[slotIndex],
                                        name: e.target.value || null,
                                      };
                                      setEndImages(updated);
                                    }}
                                    placeholder="Enter name (optional)..."
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder:text-gray-400 bg-white"
                                    disabled={loading || isUploading}
                                  />
                                </div>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    endImageFileInputRefs.current[slotIndex]?.click()
                                  }
                                  className="cursor-pointer w-full border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/30 transition-colors text-center group"
                                  disabled={loading || isUploading}
                                >
                                  <div className="flex flex-col items-center">
                                    <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center mb-2 group-hover:bg-blue-100 transition-colors">
                                      <ImageIcon className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                                    </div>
                                    <p className="text-xs font-medium text-gray-700 mb-0.5">
                                      {isUploading
                                        ? "Uploading..."
                                        : `Select End Image ${slotIndex + 1}`}
                                    </p>
                                    {!isUploading && (
                                      <p className="text-[11px] text-gray-500">
                                        Click to upload from your computer
                                      </p>
                                    )}
                                  </div>
                                </button>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  ref={(el) => {
                                    endImageFileInputRefs.current[slotIndex] = el;
                                  }}
                                  onChange={(e) =>
                                    handleSelectEndImageFile(slotIndex, e)
                                  }
                                />
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg shrink-0">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-gray-200 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="cursor-pointer px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  loading ||
                  !title.trim() ||
                  !userId ||
                  !categoryId ||
                  title.length > 100 ||
                  contentBlocks.some(
                    (b) => (b.subtitle || "").length > 250,
                  )
                }
                className="cursor-pointer px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
              >
                {loading
                  ? "Saving..."
                  : articleProp
                    ? "Update Article"
                    : "Create Article"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modals */}
      <ImageSelectorModal
        isOpen={isMiddleImageModalOpen}
        onClose={() => setIsMiddleImageModalOpen(false)}
        onSelect={handleSelectMiddleImage}
      />

    </>
  );
}

const PER_PAGE = 30;

export default function ArticleManagement() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [meta, setMeta] = useState<{
    current_page: number;
    last_page: number;
    total: number;
  }>({ current_page: 1, last_page: 1, total: 0 });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const currentUser = getStoredUser();
  const isSMEUser = currentUser?.role === "SME";

  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchData(1);
  }, []);

  const fetchData = async (page: number) => {
    try {
      setLoading(true);
      setError(null);
      const [articlesResponse, categoriesResponse] =
        await Promise.all([
          getAdminArticles(undefined, { page, per_page: PER_PAGE }),
          getCategories(),
        ]);

      setArticles(articlesResponse.data);
      setCategories(categoriesResponse.categories);
      setCurrentPage(articlesResponse.meta.current_page);
      setMeta({
        current_page: articlesResponse.meta.current_page,
        last_page: articlesResponse.meta.last_page,
        total: articlesResponse.meta.total,
      });
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > meta.last_page) return;
    fetchData(page);
  };

  const handleCreateArticle = () => {
    setSelectedArticle(null);
    setIsCreateModalOpen(true);
  };

  const handleEditArticle = (article: Article) => {
    const canManage = isSMEUser || (!!currentUser?.id && article.user_id === currentUser.id);
    if (!canManage) return;
    setSelectedArticle(article);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    const target = articles.find((a) => a.id === id);
    const canManage =
      !!target && (isSMEUser || (!!currentUser?.id && target.user_id === currentUser.id));
    if (!canManage) return;

    if (!confirm("Are you sure you want to delete this article?")) {
      return;
    }

    try {
      setDeletingId(id);
      await deleteArticle(id);
      await fetchData(currentPage);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete article";
      alert(errorMessage);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Loading articles...</p>
      </div>
    );
  }

  if (error && articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-red-600 mb-4">Error: {error}</p>
        <button
          onClick={() => fetchData(1)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-screen flex flex-col">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Article Management
          </h2>
          <button
            onClick={handleCreateArticle}
            className="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm text-sm"
          >
            <Plus size={16} />
            Add Article
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">{error}</p>
          </div>
        )}

        {articles.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-500 mb-4">No articles found.</p>
              <button
                onClick={handleCreateArticle}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Your First Article
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Table Header */}
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
              <div className="grid grid-cols-[1fr_2fr_2fr_1.5fr_1.5fr_2fr_2fr] gap-4 items-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                <div className="text-center">#</div>
                <div>Cover Image</div>
                <div>Title</div>
                <div>Category</div>
                <div>Author</div>
                <div>Upload Date</div>
                <div className="text-center">Actions</div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-200">
              {articles.map((article, index) => (
                <div
                  key={article.id}
                  className="px-6 py-2 hover:bg-gray-50 transition-colors"
                >
                  <div className="grid grid-cols-[1fr_2fr_2fr_1.5fr_1.5fr_2fr_2fr] gap-4 items-center">
                    {/* Number */}
                    <div className="text-center">
                      <span className="text-sm font-medium text-gray-900">
                        {(meta.current_page - 1) * PER_PAGE + index + 1}
                      </span>
                    </div>

                    {/* Cover Image */}
                    <div>
                      {article.cover ? (
                        <div className="relative w-30 h-20 rounded-md overflow-hidden border border-gray-200 bg-gray-100">
                          <img
                            src={article.cover}
                            alt="Cover"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-md border border-gray-200 bg-gray-100 flex items-center justify-center">
                          <span className="text-xs text-gray-400">
                            No Cover
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Title */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">
                        {article.title}
                      </h3>
                      {article.subtitle && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                          {article.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Category */}
                    <div>
                      {article.category ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {article.category.name}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">
                          No category
                        </span>
                      )}
                    </div>

                    {/* Author */}
                    <div>
                      <p className="text-sm text-gray-900">{article.author}</p>
                    </div>

                    {/* Upload Date */}
                    <div>
                      <p className="text-xs text-gray-600">
                        {formatDate(article.created_at)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div>
                      <div className="flex items-center justify-center gap-2">
                        {(() => {
                          const canManage =
                            isSMEUser ||
                            (!!currentUser?.id && article.user_id === currentUser.id);
                          return (
                            <>
                        <button
                          onClick={() => handleEditArticle(article)}
                          disabled={!canManage}
                          className={`p-2 rounded-lg transition-colors ${
                            canManage
                              ? "cursor-pointer text-blue-600 hover:bg-blue-50"
                              : "cursor-not-allowed text-gray-400 opacity-60"
                          }`}
                          title={canManage ? "Edit" : "Only owner or SME can edit"}
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(article.id)}
                          disabled={deletingId === article.id || !canManage}
                          className={`p-2 rounded-lg transition-colors ${
                            canManage
                              ? "cursor-pointer text-red-600 hover:bg-red-50"
                              : "cursor-not-allowed text-gray-400 opacity-60"
                          } disabled:opacity-50`}
                          title={canManage ? "Delete" : "Only owner or SME can delete"}
                        >
                          <Trash2 size={18} />
                        </button>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {meta.last_page > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-600">
                  Page {meta.current_page} of {meta.last_page}
                  <span className="ml-2 text-gray-500">
                    ({meta.total} total)
                  </span>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => goToPage(meta.current_page - 1)}
                    disabled={meta.current_page <= 1 || loading}
                    className="cursor-pointer px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: meta.last_page }, (_, i) => i + 1).map(
                      (p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => goToPage(p)}
                          disabled={loading}
                          className={`cursor-pointer min-w-[2.25rem] py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${p === meta.current_page
                              ? "bg-blue-600 text-white"
                              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                            }`}
                        >
                          {p}
                        </button>
                      ),
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => goToPage(meta.current_page + 1)}
                    disabled={meta.current_page >= meta.last_page || loading}
                    className="cursor-pointer px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ArticleModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => fetchData(currentPage)}
        categories={categories}
      />

      <ArticleModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedArticle(null);
        }}
        onSuccess={() => fetchData(currentPage)}
        article={selectedArticle}
        categories={categories}
      />
    </div>
  );
}
