import { describe, expect, it } from "vitest";

import {
  canonSchema,
  editorDocSchema,
  factDeltaSchema,
  idSchema,
  modelReplySchema,
  timeSchema,
  usdSchema,
} from "../../src/contracts/domain";
import {
  decodeCommand,
  internalCommandSchema,
  jobPayloadSchema,
  publicCommandSchema,
  stepMutationSchema,
} from "../../src/contracts/operations";
import {
  faultCodeList,
  httpStatusForFault,
  makeFault,
  toFault,
} from "../../src/contracts/errors";
import { countWords, serializeEditorDoc } from "../../src/formats/editor";
import { de } from "../../src/i18n/de";

const requestId = "8f2f5a1e-6c58-4c0e-a0a5-3f0f0f0f0f0f";

const paragraphDoc = {
  type: "doc" as const,
  content: [
    {
      type: "heading" as const,
      level: 1 as const,
      content: [{ type: "text" as const, text: "Kapitel Eins", marks: [] }],
    },
    {
      type: "paragraph" as const,
      content: [
        { type: "text" as const, text: "Der Regen fiel.", marks: ["italic" as const] },
      ],
    },
  ],
};

describe("closed editor document", () => {
  it("accepts the restricted paragraph, heading, list and scene-break schema", () => {
    const doc = {
      type: "doc",
      content: [
        ...paragraphDoc.content,
        {
          type: "bulletList",
          items: [[{ type: "text", text: "Erster Punkt", marks: [] }]],
        },
        {
          type: "orderedList",
          items: [[{ type: "text", text: "Zweiter Punkt", marks: ["bold"] }]],
        },
        { type: "sceneBreak" },
      ],
    };
    expect(editorDocSchema.safeParse(doc).success).toBe(true);
  });

  it("rejects raw HTML nodes and unsupported marks", () => {
    expect(
      editorDocSchema.safeParse({
        type: "doc",
        content: [{ type: "html", html: "<script>alert(1)</script>" }],
      }).success,
    ).toBe(false);
    expect(
      editorDocSchema.safeParse({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Klick", marks: ["link"] }],
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("rejects unknown top-level keys", () => {
    expect(
      editorDocSchema.safeParse({ ...paragraphDoc, remoteImage: "https://example.com/x.png" })
        .success,
    ).toBe(false);
  });
});

describe("German word counting and serialization", () => {
  it("counts word-like segments with the German segmenter", () => {
    expect(countWords("Über die Brücke gehen wir.")).toBe(5);
    expect(countWords("Straße 5")).toBe(2);
    expect(countWords("E-Book")).toBe(2);
  });

  it("excludes outline-generated headings from manuscript word counts", () => {
    expect(countWords(paragraphDoc)).toBe(3);
  });

  it("serializes blocks deterministically", () => {
    expect(serializeEditorDoc(paragraphDoc)).toBe("Kapitel Eins\n\nDer Regen fiel.");
    expect(
      serializeEditorDoc({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Zeile eins", marks: [] },
              { type: "hardBreak" },
              { type: "text", text: "Zeile zwei", marks: [] },
            ],
          },
          { type: "sceneBreak" },
        ],
      }),
    ).toBe("Zeile eins\nZeile zwei\n\n* * *");
  });
});

describe("primitive boundaries", () => {
  it("encodes USD as nonnegative integer micro-units in strings", () => {
    expect(usdSchema.safeParse("0").success).toBe(true);
    expect(usdSchema.safeParse("1000000").success).toBe(true);
    expect(usdSchema.safeParse("1.5").success).toBe(false);
    expect(usdSchema.safeParse(-1).success).toBe(false);
    expect(usdSchema.safeParse("1e6").success).toBe(false);
  });

  it("rejects non-UUID identities and non-UTC instants", () => {
    expect(idSchema.safeParse("not-an-id").success).toBe(false);
    expect(timeSchema.safeParse("2026-11-03T18:00:00+01:00").success).toBe(false);
    expect(timeSchema.safeParse("2026-11-03T17:00:00Z").success).toBe(true);
  });

  it("rejects unknown fields in model replies and facts", () => {
    expect(
      modelReplySchema.safeParse({ kind: "draft", prose: "Text", extra: "x" }).success,
    ).toBe(false);
    expect(
      modelReplySchema.safeParse({ kind: "unknown", prose: "Text" }).success,
    ).toBe(false);
    expect(
      factDeltaSchema.safeParse({ add: [], retire: [], motifUpdates: [], closeDecisions: [], extra: [] })
        .success,
    ).toBe(false);
    expect(
      canonSchema.safeParse({ revision: 0, facts: [], ledger: [], extra: true }).success,
    ).toBe(false);
  });
});

describe("command boundary", () => {
  it("accepts a valid public command", () => {
    const result = publicCommandSchema.safeParse({
      op: "projects.create",
      input: { title: "Die Prüfung", mode: "fic", genre: "litrpg" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects undeclared owner fields and unknown operations", () => {
    expect(
      publicCommandSchema.safeParse({
        op: "projects.create",
        input: { title: "Die Prüfung", mode: "fic", genre: "litrpg", ownerId: requestId },
      }).success,
    ).toBe(false);
    expect(
      publicCommandSchema.safeParse({ op: "projects.destroyEverything", input: {} }).success,
    ).toBe(false);
  });

  it("keeps internal commands out of public decoding", () => {
    const internal = { op: "identity.bootstrapOperator", input: { email: "operator@example.test" } };
    expect(internalCommandSchema.safeParse(internal).success).toBe(true);
    expect(publicCommandSchema.safeParse(internal).success).toBe(false);
    const decoded = decodeCommand(internal, requestId);
    expect(decoded.ok).toBe(false);
    if (!decoded.ok) expect(decoded.error.code).toBe("INVALID_INPUT");
  });

  it("enforces mode and genre compatibility", () => {
    expect(
      publicCommandSchema.safeParse({
        op: "projects.create",
        input: { title: "Sachbuch", mode: "nf", genre: "nonfiction" },
      }).success,
    ).toBe(true);
    expect(
      publicCommandSchema.safeParse({
        op: "projects.create",
        input: { title: "Sachbuch", mode: "nf", genre: "litrpg" },
      }).success,
    ).toBe(false);
    expect(
      publicCommandSchema.safeParse({
        op: "projects.create",
        input: { title: "Roman", mode: "fic", genre: "nonfiction" },
      }).success,
    ).toBe(false);
  });

  it("rejects a second chapter or unknown authority in a run command", () => {
    const base = {
      op: "runs.start",
      input: {
        kind: "forward",
        length: "chapter",
        authority: "normal",
        conflictPolicy: "pause",
        chapterId: requestId,
        unitIds: [],
        instructions: "",
      },
    };
    expect(publicCommandSchema.safeParse(base).success).toBe(true);
    expect(
      publicCommandSchema.safeParse({
        ...base,
        input: { ...base.input, authority: "admin" },
      }).success,
    ).toBe(false);
    expect(
      publicCommandSchema.safeParse({
        ...base,
        input: { ...base.input, nextChapterId: requestId },
      }).success,
    ).toBe(false);
    expect(
      publicCommandSchema.safeParse({
        ...base,
        input: { ...base.input, length: "book" },
      }).success,
    ).toBe(false);
  });

  it("requires an explicit target node for expand and rejects one otherwise", () => {
    expect(
      publicCommandSchema.safeParse({
        op: "planning.generate",
        input: { stage: "expand", targetNode: { kind: "chapter", id: requestId }, answers: "" },
      }).success,
    ).toBe(true);
    expect(
      publicCommandSchema.safeParse({
        op: "planning.generate",
        input: { stage: "expand", answers: "" },
      }).success,
    ).toBe(false);
    expect(
      publicCommandSchema.safeParse({
        op: "planning.generate",
        input: {
          stage: "idea",
          targetNode: { kind: "chapter", id: requestId },
          answers: "",
        },
      }).success,
    ).toBe(false);
  });
});

describe("job and step boundaries", () => {
  it("accepts a bounded cover submission and rejects a fifth child", () => {
    const payload = {
      kind: "cover.submit",
      batchId: requestId,
      childIndex: 3,
      attemptId: requestId,
    };
    expect(jobPayloadSchema.safeParse(payload).success).toBe(true);
    expect(jobPayloadSchema.safeParse({ ...payload, childIndex: 4 }).success).toBe(false);
  });

  it("requires the complete acceptance mutation", () => {
    const incomplete = {
      kind: "proposal_accept",
      proposal: { id: requestId },
      revisions: [],
      canon: { id: requestId },
      extractions: [],
      run: { id: requestId },
      nextJobs: [],
    };
    expect(stepMutationSchema.safeParse(incomplete).success).toBe(false);
    expect(
      stepMutationSchema.safeParse({ kind: "delete_everything", nextJobs: [] }).success,
    ).toBe(false);
  });
});

describe("fault presentation", () => {
  it("provides a German message and safe status for every declared code", () => {
    for (const code of faultCodeList) {
      const fault = makeFault(code, requestId);
      expect(fault.messageDe.length, code).toBeGreaterThan(10);
      expect(fault.messageDe, code).not.toMatch(/[A-Z_]{4,}/);
      expect(httpStatusForFault(code)).toBeGreaterThanOrEqual(400);
    }
  });

  it("maps the declared conflict and limit semantics", () => {
    expect(httpStatusForFault("STALE_VERSION")).toBe(409);
    expect(httpStatusForFault("IDEMPOTENCY_CONFLICT")).toBe(409);
    expect(httpStatusForFault("WORD_LIMIT")).toBe(422);
    expect(httpStatusForFault("RATE_LIMITED")).toBe(429);
    expect(httpStatusForFault("DATABASE_UNAVAILABLE")).toBe(503);
    expect(httpStatusForFault("UNSUPPORTED_FORMAT")).toBe(415);
    expect(httpStatusForFault("INPUT_LIMIT")).toBe(413);
  });

  it("never leaks exception or vendor text into a fault", () => {
    const fault = toFault(new Error("prompt=geheimer Text key=sk-live-123"), requestId);
    expect(fault.code).toBe("INTERNAL_ERROR");
    expect(fault.messageDe).toBe(de.errors.INTERNAL_ERROR);
    expect(JSON.stringify(fault)).not.toContain("geheimer");
    expect(JSON.stringify(fault)).not.toContain("sk-live");
  });
});
