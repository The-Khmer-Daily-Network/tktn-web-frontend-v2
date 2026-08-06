import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { X } from "lucide-react";
import { resolveMediaUrl } from "@/utils/resolveMediaUrl";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    middleImage: {
      setMiddleImage: (attrs: {
        src: string;
        name?: string | null;
        at?: number | null;
      }) => ReturnType;
      unsetMiddleImage: () => ReturnType;
    };
    middleVideo: {
      setMiddleVideo: (attrs: {
        src: string;
        name?: string | null;
        at?: number | null;
      }) => ReturnType;
      unsetMiddleVideo: () => ReturnType;
    };
  }
}

function MiddleImageView({
  node,
  deleteNode,
  selected,
  updateAttributes,
}: NodeViewProps) {
  const src = resolveMediaUrl(String(node.attrs.src || ""));
  const name = (node.attrs.name as string | null) || "";

  return (
    <NodeViewWrapper
      as="div"
      className={`my-3 rounded-md border bg-gray-50 p-2 ${
        selected ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200"
      }`}
      data-middle-image=""
      data-src={src}
      data-name={name}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-gray-500">Middle image</span>
        <button
          type="button"
          onClick={deleteNode}
          className="cursor-pointer rounded-full bg-red-500 p-0.5 text-white hover:bg-red-600"
          title="Remove"
        >
          <X size={12} />
        </button>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={name || "Middle image"}
        className="max-h-56 w-full rounded object-contain"
        draggable={false}
      />
      <input
        type="text"
        value={name}
        placeholder="Image name / caption"
        maxLength={250}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          updateAttributes({ name: e.target.value || null });
        }}
        className="mt-2 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-center text-xs text-gray-700 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </NodeViewWrapper>
  );
}

function MiddleVideoView({
  node,
  deleteNode,
  selected,
  updateAttributes,
}: NodeViewProps) {
  const src = resolveMediaUrl(String(node.attrs.src || ""));
  const name = (node.attrs.name as string | null) || "";

  return (
    <NodeViewWrapper
      as="div"
      className={`my-3 rounded-md border bg-gray-50 p-3 ${
        selected ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200"
      }`}
      data-middle-video=""
      data-src={src}
      data-name={name}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-gray-500">Middle video</span>
        <button
          type="button"
          onClick={deleteNode}
          className="cursor-pointer rounded-full bg-red-500 p-0.5 text-white hover:bg-red-600"
          title="Remove"
        >
          <X size={12} />
        </button>
      </div>
      <p className="truncate text-sm text-blue-700">{src}</p>
      <input
        type="text"
        value={name}
        placeholder="Video name / caption"
        maxLength={250}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          updateAttributes({ name: e.target.value || null });
        }}
        className="mt-2 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-700 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </NodeViewWrapper>
  );
}

const MEDIA_NAMES = ["middleImage", "middleVideo"];

function deleteExistingMediaInTr(
  tr: {
    doc: {
      descendants: (
        fn: (
          node: { type: { name: string }; nodeSize: number },
          pos: number,
        ) => void | boolean,
      ) => void;
    };
    delete: (from: number, to: number) => unknown;
  },
  names: string[] = MEDIA_NAMES,
) {
  const ranges: Array<{ from: number; to: number }> = [];
  tr.doc.descendants((node, pos) => {
    if (names.includes(node.type.name)) {
      ranges.push({ from: pos, to: pos + node.nodeSize });
    }
  });
  ranges
    .sort((a, b) => b.from - a.from)
    .forEach((range) => {
      tr.delete(range.from, range.to);
    });
}

export const MiddleImage = Node.create({
  name: "middleImage",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      name: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-middle-image]",
        getAttrs: (el) => {
          const element = el as HTMLElement;
          return {
            src: element.getAttribute("data-src"),
            name: element.getAttribute("data-name") || null,
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes({
        "data-middle-image": "",
        "data-src": HTMLAttributes.src,
        "data-name": HTMLAttributes.name || "",
        class: "middle-image-node",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MiddleImageView);
  },

  addCommands() {
    return {
      setMiddleImage:
        (attrs) =>
        ({ chain }) => {
          const at = attrs.at;
          let runner = chain().focus();
          if (typeof at === "number" && at >= 0) {
            runner = runner.setTextSelection(at);
          }
          return runner
            .command(({ tr }) => {
              deleteExistingMediaInTr(tr as any);
              return true;
            })
            .insertContent({
              type: this.name,
              attrs: {
                src: attrs.src,
                name: attrs.name ?? null,
              },
            })
            .run();
        },
      unsetMiddleImage:
        () =>
        ({ chain }) =>
          chain()
            .command(({ tr }) => {
              deleteExistingMediaInTr(tr as any, ["middleImage"]);
              return true;
            })
            .run(),
    };
  },
});

export const MiddleVideo = Node.create({
  name: "middleVideo",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      name: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-middle-video]",
        getAttrs: (el) => {
          const element = el as HTMLElement;
          return {
            src: element.getAttribute("data-src"),
            name: element.getAttribute("data-name") || null,
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes({
        "data-middle-video": "",
        "data-src": HTMLAttributes.src,
        "data-name": HTMLAttributes.name || "",
        class: "middle-video-node",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MiddleVideoView);
  },

  addCommands() {
    return {
      setMiddleVideo:
        (attrs) =>
        ({ chain }) => {
          const at = attrs.at;
          let runner = chain().focus();
          if (typeof at === "number" && at >= 0) {
            runner = runner.setTextSelection(at);
          }
          return runner
            .command(({ tr }) => {
              deleteExistingMediaInTr(tr as any);
              return true;
            })
            .insertContent({
              type: this.name,
              attrs: {
                src: attrs.src,
                name: attrs.name ?? null,
              },
            })
            .run();
        },
      unsetMiddleVideo:
        () =>
        ({ chain }) =>
          chain()
            .command(({ tr }) => {
              deleteExistingMediaInTr(tr as any, ["middleVideo"]);
              return true;
            })
            .run(),
    };
  },
});
