"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bold,
  Image as ImageIcon,
  Italic,
  Link2,
  Quote,
  X,
} from "lucide-react";
import RichTextEditor, {
  type RichTextEditorHandle,
} from "@/components/admin/RichTextEditor";
import ImageSelectorModal from "@/components/admin/ImageSelectorModal";
import CategorySelect from "@/components/admin/CategorySelect";
import TagInput from "@/components/admin/TagInput";
import UnsavedChangesDialog from "@/components/admin/UnsavedChangesDialog";
import {
  createArticle,
  getArticleById,
  updateArticle,
} from "@/services/article";
import { revalidateArticleAfterSave } from "@/services/articleRevalidate";
import { getStoredUser } from "@/services/auth";
import { getCategories } from "@/services/category";
import {
  uploadContentCover,
} from "@/services/contentCover";
import {
  uploadContentImage,
} from "@/services/contentImage";
import type { ArticleEndImage } from "@/types/article";
import type { Category } from "@/types/category";
import type { ContentImage } from "@/types/contentImage";
import {
  buildContentBlocksFromEditor,
  contentWithoutMiddleMedia,
  extractMiddleMedia,
  joinContentWithMiddleMedia,
} from "@/utils/middleMediaContent";
import {
  createPreviewUrl,
  isBlobUrl,
  revokePreviewUrl,
} from "@/utils/pendingMedia";

const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024;
const TITLE_MAX = 500;

interface ArticleEditorPageProps {
  articleId?: number;
}

export default function ArticleEditorPage({ articleId }: ArticleEditorPageProps) {
  const router = useRouter();
  const isEdit = articleId != null;
  const editorRef = useRef<RichTextEditorHandle>(null);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);
  const middleImageFileInputRef = useRef<HTMLInputElement | null>(null);
  const endImageFileInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const currentUser = getStoredUser();
  const currentUserId = currentUser?.id ?? null;

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [blockSubtitle, setBlockSubtitle] = useState("");
  const [content, setContent] = useState("");
  const [cover, setCover] = useState<string | null>(null);
  const [coverName, setCoverName] = useState<string | null>(null);
  const [pendingCoverFile, setPendingCoverFile] = useState<File | null>(null);
  const [middleImageUrl, setMiddleImageUrl] = useState<string | null>(null);
  const [middleImageName, setMiddleImageName] = useState<string | null>(null);
  const [pendingMidImageFile, setPendingMidImageFile] = useState<File | null>(
    null,
  );
  const [endImages, setEndImages] = useState<ArticleEndImage[]>([
    { url: "", name: null },
    { url: "", name: null },
    { url: "", name: null },
  ]);
  const [tags, setTags] = useState<string[]>([]);
  const [pendingEndFiles, setPendingEndFiles] = useState<
    Array<File | null>
  >([null, null, null]);

  const [loading, setLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMiddleImageModalOpen, setIsMiddleImageModalOpen] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState("");
  const [, setToolbarTick] = useState(0);

  const buildSnapshot = (state: {
    categoryId: number | null;
    title: string;
    blockSubtitle: string;
    content: string;
    cover: string | null;
    endImages: ArticleEndImage[];
    tags: string[];
  }) =>
    JSON.stringify({
      categoryId: state.categoryId,
      title: state.title,
      blockSubtitle: state.blockSubtitle,
      content: state.content,
      cover: state.cover,
      endImages: state.endImages.map((img) => ({
        url: img.url,
        name: img.name,
      })),
      tags: state.tags,
    });

  const midMedia = extractMiddleMedia(content);
  const hasMidImage = midMedia?.kind === "image";

  const isDirty =
    !!initialSnapshot &&
    buildSnapshot({
      categoryId,
      title,
      blockSubtitle,
      content,
      cover,
      endImages,
      tags,
    }) !== initialSnapshot;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setBootLoading(true);
        setError(null);
        const categoriesResponse = await getCategories();
        if (cancelled) return;
        setCategories(categoriesResponse.categories);

        if (articleId != null) {
          const articleResponse = await getArticleById(articleId);
          if (cancelled) return;
          const article = articleResponse.data;
          setCategoryId(article.category_id);
          setTitle(article.title || "");
          const blocks = article.content_blocks || [];
          const nextSubtitle = blocks[0]?.subtitle || "";
          const nextContent = joinContentWithMiddleMedia({
            blocks,
            middleImageUrl: article.middle_image_url,
            middleImageName: article.middle_image_name,
          });
          setBlockSubtitle(nextSubtitle);
          setContent(nextContent);
          setCover(article.cover);
          setCoverName(article.cover_name);
          setMiddleImageUrl(article.middle_image_url);
          setMiddleImageName(article.middle_image_name);
          const ends = [...(article.end_images || [])];
          while (ends.length < 3) ends.push({ url: "", name: null });
          const nextEnds = ends.slice(0, 3);
          setEndImages(nextEnds);
          const nextTags = Array.isArray(article.tags)
            ? article.tags.filter((t): t is string => typeof t === "string")
            : [];
          setTags(nextTags);
          setInitialSnapshot(
            buildSnapshot({
              categoryId: article.category_id,
              title: article.title || "",
              blockSubtitle: nextSubtitle,
              content: nextContent,
              cover: article.cover,
              endImages: nextEnds,
              tags: nextTags,
            }),
          );
        } else {
          setInitialSnapshot(
            buildSnapshot({
              categoryId: null,
              title: "",
              blockSubtitle: "",
              content: "",
              cover: null,
              endImages: [
                { url: "", name: null },
                { url: "", name: null },
                { url: "", name: null },
              ],
              tags: [],
            }),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load editor");
        }
      } finally {
        if (!cancelled) setBootLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  const refreshToolbar = () => setToolbarTick((v) => v + 1);

  const toolBtn = (active: boolean) =>
    `cursor-pointer inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
      active
        ? "border-blue-600 bg-blue-50 text-blue-700"
        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
    } disabled:opacity-50`;

  const revokeLocalPreviews = () => {
    revokePreviewUrl(cover);
    endImages.forEach((img) => revokePreviewUrl(img.url));
    const mid = extractMiddleMedia(content);
    if (mid?.url) revokePreviewUrl(mid.url);
  };

  const leaveToList = () => {
    revokeLocalPreviews();
    router.push("/articleManagement");
  };

  const handleCancel = () => {
    if (isDirty) {
      setShowDiscardDialog(true);
      return;
    }
    leaveToList();
  };

  const handleCoverFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError("Cover image must be 20MB or smaller.");
      event.target.value = "";
      return;
    }
    setError(null);
    revokePreviewUrl(cover);
    setCover(createPreviewUrl(file));
    setCoverName(file.name.replace(/\.[^.]+$/, "") || null);
    setPendingCoverFile(file);
    event.target.value = "";
  };

  const handleRemoveCover = () => {
    revokePreviewUrl(cover);
    setCover(null);
    setCoverName(null);
    setPendingCoverFile(null);
  };

  const handleMiddleImageFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError("Middle image must be 20MB or smaller.");
      event.target.value = "";
      return;
    }
    setError(null);
    const preview = createPreviewUrl(file);
    editorRef.current?.insertMiddleImage({
      src: preview,
      name: file.name.replace(/\.[^.]+$/, "") || null,
    });
    setMiddleImageUrl(preview);
    setMiddleImageName(file.name.replace(/\.[^.]+$/, "") || null);
    setPendingMidImageFile(file);
    setIsMiddleImageModalOpen(false);
    refreshToolbar();
    event.target.value = "";
  };

  const handleSelectMiddleImage = (image: ContentImage) => {
    setPendingMidImageFile(null);
    editorRef.current?.insertMiddleImage({
      src: image.image_url,
      name: image.title || null,
    });
    setMiddleImageUrl(image.image_url);
    setMiddleImageName(image.title || null);
    setIsMiddleImageModalOpen(false);
    refreshToolbar();
  };

  const handleSelectEndImageFile = (
    slotIndex: number,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError("End image must be 20MB or smaller.");
      event.target.value = "";
      return;
    }
    setError(null);
    revokePreviewUrl(endImages[slotIndex]?.url);
    const preview = createPreviewUrl(file);
    const updated = [...endImages];
    updated[slotIndex] = {
      url: preview,
      name: updated[slotIndex]?.name ?? (file.name.replace(/\.[^.]+$/, "") || null),
    };
    setEndImages(updated);
    const pending = [...pendingEndFiles];
    pending[slotIndex] = file;
    setPendingEndFiles(pending);
    event.target.value = "";
  };

  const handleRemoveEndImage = (index: number) => {
    revokePreviewUrl(endImages[index]?.url);
    const updated = [...endImages];
    updated[index] = { url: "", name: null };
    setEndImages(updated);
    const pending = [...pendingEndFiles];
    pending[index] = null;
    setPendingEndFiles(pending);
  };

  const handleEndImageNameChange = (index: number, name: string) => {
    const updated = [...endImages];
    if (!updated[index]?.url) return;
    updated[index] = {
      ...updated[index],
      name: name.trim() ? name : null,
    };
    setEndImages(updated);
  };

  const uploadPendingMedia = async () => {
    let saveCover = cover;
    let saveCoverName = coverName;

    if (pendingCoverFile) {
      const response = await uploadContentCover({
        image: pendingCoverFile,
        title: coverName || undefined,
      });
      const data = Array.isArray(response.data)
        ? response.data[0]
        : response.data;
      saveCover = data.image_url;
      saveCoverName = data.title || null;
      revokePreviewUrl(cover);
    }

    const saveEndImages = [...endImages];
    for (let i = 0; i < saveEndImages.length; i++) {
      const pendingFile = pendingEndFiles[i];
      if (!pendingFile) continue;
      const response = await uploadContentImage({
        image: pendingFile,
        title: saveEndImages[i]?.name || undefined,
      });
      const data = Array.isArray(response.data)
        ? response.data[0]
        : response.data;
      revokePreviewUrl(saveEndImages[i]?.url);
      saveEndImages[i] = {
        url: data.image_url,
        name: saveEndImages[i]?.name ?? data.title ?? null,
      };
    }

    const built = buildContentBlocksFromEditor({
      content,
      blockSubtitle,
    });

    if (
      pendingMidImageFile &&
      built.middle_image_url &&
      isBlobUrl(built.middle_image_url)
    ) {
      const response = await uploadContentImage({
        image: pendingMidImageFile,
        title: built.middle_image_name || undefined,
      });
      const data = Array.isArray(response.data)
        ? response.data[0]
        : response.data;
      revokePreviewUrl(built.middle_image_url);
      built.middle_image_url = data.image_url;
      built.middle_image_name = data.title || built.middle_image_name;
    }

    return { saveCover, saveCoverName, saveEndImages, built };
  };

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    return () => {
      revokeLocalPreviews();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!currentUserId) {
      setError("Unable to detect current user for author.");
      return;
    }
    if (!categoryId) {
      setError("Please select a category");
      return;
    }
    if (!contentWithoutMiddleMedia(content)) {
      setError("Content is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { saveCover, saveCoverName, saveEndImages, built } =
        await uploadPendingMedia();
      const params = {
        category_id: categoryId,
        user_id: currentUserId,
        title: title.trim(),
        cover: saveCover ?? null,
        cover_name: saveCoverName ?? null,
        subtitle: blockSubtitle.trim() || null,
        content_blocks: built.content_blocks,
        end_images: saveEndImages.filter(
          (img) => img.url.trim() && !isBlobUrl(img.url),
        ),
        middle_image_url: built.middle_image_url,
        middle_image_name: built.middle_image_name,
        tags,
      };

      if (isEdit && articleId != null) {
        await updateArticle(articleId, params);
        await revalidateArticleAfterSave(articleId);
      } else {
        const created = await createArticle(params);
        const savedId = created.data?.id;
        if (savedId) await revalidateArticleAfterSave(savedId);
      }

      setPendingCoverFile(null);
      setPendingMidImageFile(null);
      setPendingEndFiles([null, null, null]);
      router.push("/articleManagement");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save article");
    } finally {
      setLoading(false);
    }
  };

  if (bootLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-600">Loading editor...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top toolbar — matches template */}
      <div className="sticky top-0 z-40 border-b border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3">
          <h1 className="text-xl font-semibold text-gray-900">
            {isEdit ? "Edit Article" : "Create Article"}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={toolBtn(hasMidImage)}
              onClick={() => {
                editorRef.current?.saveSelection();
                setIsMiddleImageModalOpen(true);
              }}
              disabled={loading}
              title="Insert middle image at cursor"
            >
              Mid Image
            </button>
            <button
              type="button"
              className={toolBtn(
                editorRef.current?.isActive("heading", { level: 1 }) ?? false,
              )}
              onClick={() => {
                editorRef.current?.toggleHeading(1);
                refreshToolbar();
              }}
              disabled={loading}
              title="Heading 1"
            >
              H1
            </button>
            <button
              type="button"
              className={toolBtn(
                editorRef.current?.isActive("heading", { level: 2 }) ?? false,
              )}
              onClick={() => {
                editorRef.current?.toggleHeading(2);
                refreshToolbar();
              }}
              disabled={loading}
              title="Heading 2"
            >
              H2
            </button>
            <button
              type="button"
              className={toolBtn(
                editorRef.current?.isActive("heading", { level: 3 }) ?? false,
              )}
              onClick={() => {
                editorRef.current?.toggleHeading(3);
                refreshToolbar();
              }}
              disabled={loading}
              title="Heading 3"
            >
              H3
            </button>
            <button
              type="button"
              className={toolBtn(editorRef.current?.isActive("blockquote") ?? false)}
              onClick={() => {
                editorRef.current?.toggleBlockquote();
                refreshToolbar();
              }}
              disabled={loading}
            >
              <Quote size={14} />
              Quote
            </button>
            <button
              type="button"
              className={toolBtn(editorRef.current?.isActive("link") ?? false)}
              onClick={() => {
                editorRef.current?.setLink();
                refreshToolbar();
              }}
              disabled={loading}
            >
              <Link2 size={14} />
              Link
            </button>
            <button
              type="button"
              className={toolBtn(editorRef.current?.isActive("italic") ?? false)}
              onClick={() => {
                editorRef.current?.toggleItalic();
                refreshToolbar();
              }}
              disabled={loading}
              title="Italic"
            >
              <Italic size={14} />
              i
            </button>
            <button
              type="button"
              className={toolBtn(editorRef.current?.isActive("bold") ?? false)}
              onClick={() => {
                editorRef.current?.toggleBold();
                refreshToolbar();
              }}
              disabled={loading}
              title="Bold"
            >
              <Bold size={14} />
              B
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="cursor-pointer rounded-md border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="cursor-pointer rounded-md bg-[#4F46E5] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#4338CA] disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-6 px-6 py-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Thumbnail + Category */}
        <div className="flex flex-wrap items-center gap-4">
          <input
            ref={coverFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCoverFileChange}
          />
          {cover ? (
            <div className="relative">
              <img
                src={cover}
                alt="Thumbnail"
                className="h-20 w-28 rounded-md border border-gray-200 object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveCover}
                className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white"
                disabled={loading}
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => coverFileInputRef.current?.click()}
              disabled={loading}
              className="cursor-pointer inline-flex items-center gap-2 rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 hover:border-blue-400 hover:bg-blue-50/40"
            >
              <ImageIcon size={16} />
              Add thumbnail
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Category:</span>
            <CategorySelect
              categories={categories}
              value={categoryId}
              onChange={setCategoryId}
              disabled={loading}
            />
          </div>
        </div>

        {/* Title */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Title</label>
            <span className="text-xs text-gray-500">
              {title.length}/{TITLE_MAX}
            </span>
          </div>
          <input
            type="text"
            value={title}
            maxLength={TITLE_MAX}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New post"
            disabled={loading}
            className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <TagInput
          value={tags}
          onChange={setTags}
          disabled={loading}
        />

        {/* Content */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Content
          </label>
          <RichTextEditor
            ref={editorRef}
            value={content}
            onChange={(next) => {
              setContent(next);
              const media = extractMiddleMedia(next);
              if (!media || media.kind !== "image") {
                setPendingMidImageFile(null);
              }
              if (media?.kind === "image" && !isBlobUrl(media.url)) {
                setPendingMidImageFile(null);
              }
              setMiddleImageUrl(
                media?.kind === "image" ? media.url : null,
              );
              setMiddleImageName(
                media?.kind === "image" ? media.name : null,
              );
              refreshToolbar();
            }}
            showToolbar={false}
            placeholder="Write your article… Place the cursor where you want the mid image, then click Mid Image."
            disabled={loading}
            minHeightClassName="min-h-64"
          />
        </div>

        {/* End images — keep 3 slots */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Image
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((slot) => {
              const img = endImages[slot];
              const hasImage = !!img?.url;
              return (
                <div key={slot} className="relative">
                  <input
                    ref={(el) => {
                      endImageFileInputRefs.current[slot] = el;
                    }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleSelectEndImageFile(slot, e)}
                  />
                  {hasImage ? (
                    <div className="space-y-2">
                      <div className="relative overflow-hidden rounded-md border border-gray-200">
                        <img
                          src={img.url}
                          alt={img.name || `End ${slot + 1}`}
                          className="h-36 w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveEndImage(slot)}
                          className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white"
                          disabled={loading}
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={img.name || ""}
                        onChange={(e) =>
                          handleEndImageNameChange(slot, e.target.value)
                        }
                        placeholder="Image name / caption"
                        maxLength={250}
                        disabled={loading}
                        className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-center text-xs text-gray-700 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        endImageFileInputRefs.current[slot]?.click()
                      }
                      disabled={loading}
                      className="flex h-36 w-full cursor-pointer items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500 hover:border-blue-400 hover:bg-blue-50/30"
                    >
                      Add End Image
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <input
        ref={middleImageFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleMiddleImageFileChange}
      />

      <ImageSelectorModal
        isOpen={isMiddleImageModalOpen}
        onClose={() => setIsMiddleImageModalOpen(false)}
        onSelect={handleSelectMiddleImage}
      />

      <UnsavedChangesDialog
        open={showDiscardDialog}
        onContinueEdit={() => setShowDiscardDialog(false)}
        onDiscard={() => {
          setShowDiscardDialog(false);
          leaveToList();
        }}
      />
    </div>
  );
}
