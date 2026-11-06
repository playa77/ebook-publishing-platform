import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const pkg = JSON.parse(read("package.json")) as {
  engines: Record<string, string>;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

describe("toolchain pinning", () => {
  it("pins the required Node.js runtime exactly", () => {
    expect(read(".node-version").trim()).toBe("26.13.0");
    expect(pkg.engines.node).toBe("26.13.0");
    expect(process.versions.node).toBe("26.13.0");
  });

  it("uses exact dependency versions without ranges or tags", () => {
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const [name, version] of Object.entries(all)) {
      expect(version, `${name} must be an exact semver version`).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  it("declares the applicable package command contract", () => {
    for (const script of ["dev", "build", "lint", "typecheck", "test", "test:unit"]) {
      expect(pkg.scripts[script], `missing script ${script}`).toBeTruthy();
    }
    for (const script of ["lint", "typecheck"]) {
      expect(pkg.scripts[script]).not.toMatch(/exit 0|--no-verify/);
    }
  });

  it("enables strict TypeScript settings for application and tests", () => {
    const tsconfig = JSON.parse(read("tsconfig.json")) as {
      compilerOptions: Record<string, unknown>;
      include: string[];
    };
    expect(tsconfig.compilerOptions.strict).toBe(true);
    expect(tsconfig.compilerOptions.noUncheckedIndexedAccess).toBe(true);
    expect(tsconfig.compilerOptions.noEmit).toBe(true);
    expect(tsconfig.compilerOptions.moduleResolution).toBe("bundler");
    expect(tsconfig.include).toContain("tests/**/*.ts");
  });

  it("ignores generated output, environment files and private evidence", () => {
    const ignore = read(".gitignore").split("\n").map((line) => line.trim());
    for (const entry of [
      "node_modules/",
      ".next/",
      "coverage/",
      ".env*",
      "!.env.example",
      "private-evidence/",
      "*.tsbuildinfo",
    ]) {
      expect(ignore, `missing ignore entry ${entry}`).toContain(entry);
    }
  });
});

describe("German application shell", () => {
  it("declares German language metadata and a skip link", () => {
    const layout = read("src/app/layout.tsx");
    expect(layout).toContain('lang="de"');
    expect(layout).toContain('href="#hauptinhalt"');
    expect(layout).toContain("de.shell.skipToContent");
    expect(layout).toContain('id="hauptinhalt"');
  });

  it("renders German primary content from the central message catalog", () => {
    const page = read("src/app/page.tsx");
    const messages = read("src/i18n/de.ts");
    expect(messages).toContain("Autorenstudio");
    expect(page).toContain("de.start.heading");
    expect(page).not.toMatch(/[\u4e00-\u9fff]/);
    expect(messages).not.toMatch(/[\u4e00-\u9fff]/);
  });

  it("keeps server secrets out of browser-facing source", () => {
    for (const path of ["src/app/layout.tsx", "src/app/page.tsx", "src/i18n/de.ts"]) {
      expect(read(path)).not.toMatch(/OPENROUTER_API_KEY|BFL_API_KEY|SUPABASE_ADMIN_KEY/);
    }
    expect(read("next.config.ts")).not.toMatch(/\benv\s*:/);
  });
});

describe("canonical design documents", () => {
  it("has one current design without versioned copies or companion protocols", () => {
    const canonical = ["architecture.md", "technical-spec.md", "implementation-roadmap.md"];
    const designFiles = readdirSync(resolve(root, "docs")).filter((name) =>
      /^(?:\d+-)?(?:design-document|technical-specification|implementation-roadmap|architecture|technical-spec)(?:-v.*)?\.md$/.test(name),
    );
    expect(designFiles.sort()).toEqual([...canonical].sort());
    for (const name of canonical) {
      const document = read(`docs/${name}`);
      expect(document).toContain("Version: **2.0.0**");
      expect(document).not.toMatch(/(?:01-design-document|02-technical-specification|03-implementation-roadmap)-v|writing-system\.md|v1\.[01]\.[01]/);
    }
    for (const obsolete of [
      "01-design-document-v1.0.0.md",
      "02-technical-specification-v1.0.0.md",
      "03-implementation-roadmap-v1.0.0.md",
      "writing-system.md",
    ]) {
      expect(existsSync(resolve(root, "docs", obsolete)), `obsolete specification ${obsolete}`).toBe(false);
    }
    const spec = read("docs/technical-spec.md");
    expect(spec).toContain("### 8.5 Prompt and model task contract");
    expect(spec).toContain("### 12.4 Performance and human evaluation");
    expect(spec).toContain("### 13.4 Staged admission and durable synthetic qualification");
    expect(spec).toContain("TextRole=orchestrator|writer");
    for (const name of canonical) expect(read("README.md")).toContain(`docs/${name}`);
  });
});
