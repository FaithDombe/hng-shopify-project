"use client";

import { replaceEmojiWithImages } from "~/lib/apple-emoji";

export function AppleEmojiText({ text }: { text?: string | null }) {
  const value = text || "";
  const html = replaceEmojiWithImages(value);

  if (html === value) return <>{value}</>;

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
