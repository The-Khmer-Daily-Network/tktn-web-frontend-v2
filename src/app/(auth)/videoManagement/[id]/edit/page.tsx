"use client";

import { use } from "react";
import VideoEditorPage from "@/features/admin/videoEditorPage";

export default function EditVideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const videoId = Number(id);
  return (
    <VideoEditorPage videoId={Number.isFinite(videoId) ? videoId : undefined} />
  );
}
