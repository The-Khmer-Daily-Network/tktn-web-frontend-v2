"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, Link2, Quote } from "lucide-react";
import {
  MiddleImage,
  MiddleVideo,
} from "@/components/admin/tiptap/MiddleMediaNodes";
import { normalizeLinkUrl } from "@/utils/inlineFormatting";
import { resolveMediaUrl } from "@/utils/resolveMediaUrl";
import {
  editorHtmlToMarkdown,
  markdownToEditorHtml,
} from "@/utils/richTextFormat";

export type RichTextEditorHandle = {
  toggleBold: () => void;
  toggleItalic: () => void;
  toggleBlockquote: () => void;
  toggleHeading: (level: 1 | 2 | 3) => void;
  setLink: () => void;
  isActive: (name: string, attrs?: Record<string, unknown>) => boolean;
  saveSelection: () => void;
  insertMiddleImage: (attrs: {
    src: string;
    name?: string | null;
  }) => void;
  insertMiddleVideo: (attrs: {
    src: string;
    name?: string | null;
  }) => void;
  hasMiddleImage: () => boolean;
  hasMiddleVideo: () => boolean;
};

interface RichTextEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showToolbar?: boolean;
  minHeightClassName?: string;
}

const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  function RichTextEditor(
    {
      value,
      onChange,
      placeholder = "Write your content...",
      disabled = false,
      className = "",
      showToolbar = true,
      minHeightClassName = "min-h-28 max-h-80",
    },
    ref,
  ) {
    const lastEmittedRef = useRef(value || "");

    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          code: false,
          codeBlock: false,
          horizontalRule: false,
          bulletList: false,
          orderedList: false,
          listItem: false,
        }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: "text-blue-700 underline",
          },
        }),
        Placeholder.configure({
          placeholder,
        }),
        MiddleImage,
        MiddleVideo,
      ] as any,
      content: markdownToEditorHtml(value),
      editable: !disabled,
      editorProps: {
        attributes: {
          class: `tiptap ${minHeightClassName} overflow-y-auto px-3 py-2 text-sm text-gray-900 focus:outline-none [&_p]:my-1 [&_h1]:my-2 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:my-2 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:my-1.5 [&_h3]:text-lg [&_h3]:font-semibold [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_a]:text-blue-700 [&_a]:underline`,
        },
      },
      onUpdate: ({ editor: current }) => {
        const markdown = editorHtmlToMarkdown(current.getHTML());
        lastEmittedRef.current = markdown;
        onChange(markdown);
      },
    });

    useEffect(() => {
      if (!editor) return;
      const nextValue = value || "";
      if (nextValue === lastEmittedRef.current) return;
      lastEmittedRef.current = nextValue;
      editor.commands.setContent(markdownToEditorHtml(nextValue), {
        emitUpdate: false,
      });
    }, [value, editor]);

    useEffect(() => {
      if (!editor) return;
      editor.setEditable(!disabled);
    }, [disabled, editor]);

    const chain = () => editor?.chain().focus() as any;

    const setLink = () => {
      if (!editor) return;
      const previous = editor.getAttributes("link").href as string | undefined;
      const raw = window.prompt("Enter URL", previous || "https://");
      if (raw == null) return;
      const href = normalizeLinkUrl(raw);
      if (!href) {
        chain()?.extendMarkRange("link").unsetLink().run();
        return;
      }
      chain()?.extendMarkRange("link").setLink({ href }).run();
    };

    const savedSelectionRef = useRef<number | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        toggleBold: () => chain()?.toggleBold().run(),
        toggleItalic: () => chain()?.toggleItalic().run(),
        toggleBlockquote: () => chain()?.toggleBlockquote().run(),
        toggleHeading: (level) =>
          chain()?.toggleHeading({ level }).run(),
        setLink,
        isActive: (name, attrs) =>
          attrs
            ? (editor?.isActive(name, attrs) ?? false)
            : (editor?.isActive(name) ?? false),
        saveSelection: () => {
          if (!editor) return;
          savedSelectionRef.current = editor.state.selection.from;
        },
        insertMiddleImage: (attrs) => {
          if (!editor) return;
          const at = savedSelectionRef.current;
          savedSelectionRef.current = null;
          (editor.chain().focus() as any).setMiddleImage({
            ...attrs,
            src: resolveMediaUrl(attrs.src),
            at,
          }).run();
        },
        insertMiddleVideo: (attrs) => {
          if (!editor) return;
          const at = savedSelectionRef.current;
          savedSelectionRef.current = null;
          (editor.chain().focus() as any).setMiddleVideo({
            ...attrs,
            src: resolveMediaUrl(attrs.src),
            at,
          }).run();
        },
        hasMiddleImage: () => {
          if (!editor) return false;
          let found = false;
          editor.state.doc.descendants((node) => {
            if (node.type.name === "middleImage") found = true;
          });
          return found;
        },
        hasMiddleVideo: () => {
          if (!editor) return false;
          let found = false;
          editor.state.doc.descendants((node) => {
            if (node.type.name === "middleVideo") found = true;
          });
          return found;
        },
      }),
      [editor],
    );

    if (!editor) return null;

    const btnClass = (active: boolean) =>
      `cursor-pointer inline-flex items-center justify-center rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-blue-600 bg-blue-50 text-blue-700"
          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
      } disabled:opacity-50`;

    return (
      <div
        className={`rounded-md border border-gray-300 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500 ${className}`}
      >
        {showToolbar && (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-gray-200 px-2 py-1.5">
            <button
              type="button"
              className={btnClass(editor.isActive("heading", { level: 1 }))}
              onClick={() => chain()?.toggleHeading({ level: 1 }).run()}
              disabled={disabled}
              title="Heading 1"
            >
              H1
            </button>
            <button
              type="button"
              className={btnClass(editor.isActive("heading", { level: 2 }))}
              onClick={() => chain()?.toggleHeading({ level: 2 }).run()}
              disabled={disabled}
              title="Heading 2"
            >
              H2
            </button>
            <button
              type="button"
              className={btnClass(editor.isActive("heading", { level: 3 }))}
              onClick={() => chain()?.toggleHeading({ level: 3 }).run()}
              disabled={disabled}
              title="Heading 3"
            >
              H3
            </button>
            <button
              type="button"
              className={btnClass(editor.isActive("bold"))}
              onClick={() => chain()?.toggleBold().run()}
              disabled={disabled}
              title="Bold"
            >
              <Bold size={14} />
            </button>
            <button
              type="button"
              className={btnClass(editor.isActive("italic"))}
              onClick={() => chain()?.toggleItalic().run()}
              disabled={disabled}
              title="Italic"
            >
              <Italic size={14} />
            </button>
            <button
              type="button"
              className={btnClass(editor.isActive("link"))}
              onClick={setLink}
              disabled={disabled}
              title="Link"
            >
              <Link2 size={14} />
            </button>
            <button
              type="button"
              className={btnClass(editor.isActive("blockquote"))}
              onClick={() => chain()?.toggleBlockquote().run()}
              disabled={disabled}
              title="Quote"
            >
              <Quote size={14} />
            </button>
          </div>
        )}
        <EditorContent editor={editor} />
      </div>
    );
  },
);

export default RichTextEditor;
