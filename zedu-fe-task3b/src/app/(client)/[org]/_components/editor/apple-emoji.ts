import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import {
  appleEmojiImageUrl,
  EMOJI_PATTERN,
  lookupAppleEmoji,
} from "~/lib/apple-emoji";

export const AppleEmoji = Extension.create({
  name: "appleEmoji",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("appleEmoji"),
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];

            state.doc.descendants((node, pos) => {
              if (node.type.name === "codeBlock") return false;
              if (!node.isText || !node.text) return;
              if (node.marks.some((mark) => mark.type.name === "code")) return;

              EMOJI_PATTERN.lastIndex = 0;
              let match: RegExpExecArray | null;

              while ((match = EMOJI_PATTERN.exec(node.text))) {
                const unified = lookupAppleEmoji(match[0]);
                if (!unified) continue;

                const imageUrl = appleEmojiImageUrl(unified);
                if (!imageUrl) continue;

                const from = pos + match.index;
                const to = from + match[0].length;

                decorations.push(
                  Decoration.inline(from, to, {
                    class: "apple-emoji",
                    style: `--apple-emoji-image: url("${imageUrl}")`,
                  })
                );
              }
            });

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
