import {
  editorDocSchema,
  type Block,
  type EditorDoc,
  type Inline,
} from "../contracts/domain";

export { editorDocSchema };
export type { EditorDoc };

const germanSegmenter = new Intl.Segmenter("de", { granularity: "word" });

function inlineText(inlines: Inline[]): string {
  return inlines.map((inline) => (inline.type === "text" ? inline.text : "\n")).join("");
}

function blockText(block: Block): string {
  switch (block.type) {
    case "paragraph":
      return inlineText(block.content);
    case "heading":
      return inlineText(block.content);
    case "bulletList":
    case "orderedList":
      return block.items.map(inlineText).join("\n");
    case "sceneBreak":
      return "* * *";
  }
}

/**
 * Deterministic flattened text used by the editor preview, server validation,
 * quota calculation and export report. Headings generated from the outline are
 * excluded from word counts but retained in the serialized manuscript.
 */
export function flattenEditorDoc(
  doc: EditorDoc,
  options: { excludeHeadings: boolean } = { excludeHeadings: true },
): string {
  const parts: string[] = [];
  for (const block of doc.content) {
    if (block.type === "heading" && options.excludeHeadings) continue;
    const text = blockText(block);
    if (text.length > 0) parts.push(text);
  }
  return parts.join("\n\n");
}

export function serializeEditorDoc(doc: EditorDoc): string {
  return flattenEditorDoc(doc, { excludeHeadings: false });
}

/**
 * The single German word-count rule for D2 §8.5/§16.5. Numbers and hyphenated
 * expressions follow Intl.Segmenter's word-like segments.
 */
export function countWords(input: string | EditorDoc): number {
  const plain = typeof input === "string" ? input : flattenEditorDoc(input);
  let count = 0;
  for (const segment of germanSegmenter.segment(plain)) {
    if (segment.isWordLike) count += 1;
  }
  return count;
}

export function isEmptyEditorDoc(doc: EditorDoc): boolean {
  return doc.content.every((block) => blockText(block).trim().length === 0);
}
