"use client";

import EmojiPicker from "@emoji-mart/react";
import data from "@emoji-mart/data/sets/15/apple.json";
import { useTheme } from "next-themes";

export default function ThemedEmojiPicker(props: any) {
  const { resolvedTheme } = useTheme();

  return (
    <EmojiPicker
      {...props}
      data={data}
      set="apple"
      theme={resolvedTheme === "dark" ? "dark" : "light"}
    />
  );
}
