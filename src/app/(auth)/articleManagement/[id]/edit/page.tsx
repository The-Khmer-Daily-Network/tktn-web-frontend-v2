"use client";

import { use } from "react";
import ArticleEditorPage from "@/features/admin/articleEditorPage";

export default function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const articleId = Number(id);
  return <ArticleEditorPage articleId={Number.isFinite(articleId) ? articleId : undefined} />;
}
