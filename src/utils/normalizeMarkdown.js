// utils/normalizeMarkdown.js
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";

export function normalizeMarkdown(md) {
  return String(
    unified()
      .use(remarkParse)
      .use(remarkStringify, {
        bullet: "-",
        listItemIndent: "one", // important for alignment
      })
      .processSync(md)
  );
}
