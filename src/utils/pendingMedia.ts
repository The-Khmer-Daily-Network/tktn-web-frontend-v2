/** Local file preview URLs — revoke when removed or after save. */

export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

export function isBlobUrl(url: string | null | undefined): boolean {
  return typeof url === "string" && url.startsWith("blob:");
}

export function revokePreviewUrl(url: string | null | undefined): void {
  if (isBlobUrl(url)) {
    URL.revokeObjectURL(url as string);
  }
}
