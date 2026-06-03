import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

const requiredFiles = [
  "AGENTS.md",
  "ARCHITECTURE.md",
  "README.md",
  ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/workflows/ci.yml",
  "docs/GOAL.md",
  "docs/PRODUCT.md",
  "docs/SPEC.md",
  "docs/SPEC-implementation.md",
  "docs/design-docs/index.md",
  "scripts/verify-docs.mjs",
];

const requiredPrSections = [
  "Thinking Path",
  "What Changed",
  "Verification",
  "Risks",
  "Harness Gaps / Follow-ups",
  "Model Used",
  "Checklist",
];

const requiredDesignDocMetadata = [
  /^Status:\s+\S+/m,
  /^Applies To:\s+\S+/m,
  /^Verification:\s+\S+/m,
];

const requiredDesignDocSections = ["Decision", "Details"];
const ignoredDirectories = new Set([".git", "coverage", "dist", "node_modules"]);

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function absolutePath(relativePath) {
  return path.join(root, relativePath);
}

function exists(relativePath) {
  return fs.existsSync(absolutePath(relativePath));
}

function read(relativePath) {
  return fs.readFileSync(absolutePath(relativePath), "utf8");
}

function fail(message) {
  failures.push(message);
}

function walkFiles(relativeDirectory) {
  const directory = absolutePath(relativeDirectory);

  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) {
      return [];
    }

    const relativePath = toPosixPath(path.join(relativeDirectory, entry.name));

    if (entry.isDirectory()) {
      return walkFiles(relativePath);
    }

    return [relativePath];
  });
}

function stripFencedCodeBlocks(content) {
  return content.replace(/```[\s\S]*?```/g, "");
}

function isExternalReference(reference) {
  return (
    reference.startsWith("http://") ||
    reference.startsWith("https://") ||
    reference.startsWith("mailto:")
  );
}

function isPlaceholderReference(reference) {
  return /^YYYY-MM-DD-[a-z0-9-]+\.md$/i.test(reference);
}

function cleanReference(reference) {
  const withoutTitle = reference.trim().replace(/^<(.+)>$/, "$1").split(/\s+".*"$/)[0];
  return withoutTitle.split("#")[0].split("?")[0];
}

function resolveReference(fromFile, reference) {
  const cleanedReference = cleanReference(reference);

  if (!cleanedReference || cleanedReference.startsWith("#") || isExternalReference(cleanedReference)) {
    return null;
  }

  return path.resolve(path.dirname(absolutePath(fromFile)), cleanedReference);
}

function assertFileExists(relativePath) {
  if (!exists(relativePath)) {
    fail(`Missing required file: ${relativePath}`);
  }
}

function assertContains(file, expectedText) {
  if (!read(file).includes(expectedText)) {
    fail(`${file} must mention ${JSON.stringify(expectedText)}`);
  }
}

function assertHeadingExists(file, heading) {
  const content = read(file);
  const headingPattern = new RegExp(`^##\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "m");

  if (!headingPattern.test(content)) {
    fail(`${file} is missing required heading: ## ${heading}`);
  }
}

function verifyRequiredFiles() {
  for (const file of requiredFiles) {
    assertFileExists(file);
  }
}

function verifyDesignDocIndex() {
  const designDocDirectory = "docs/design-docs";
  const indexFile = `${designDocDirectory}/index.md`;
  const indexContent = read(indexFile);
  const indexedDocs = [...indexContent.matchAll(/`([^`]+\.md)`/g)]
    .map((match) => match[1])
    .filter((file) => file !== "index.md")
    .sort();

  const actualDocs = walkFiles(designDocDirectory)
    .filter((file) => file.endsWith(".md"))
    .map((file) => path.basename(file))
    .filter((file) => file !== "index.md")
    .sort();

  for (const file of actualDocs) {
    if (!indexedDocs.includes(file)) {
      fail(`${indexFile} must list docs/design-docs/${file}`);
    }
  }

  for (const file of indexedDocs) {
    if (!actualDocs.includes(file)) {
      fail(`${indexFile} lists missing design doc: ${file}`);
    }
  }
}

function verifyDesignDocMetadata() {
  const designDocs = walkFiles("docs/design-docs")
    .filter((file) => file.endsWith(".md"))
    .filter((file) => !file.endsWith("/index.md"));

  for (const file of designDocs) {
    const content = read(file);

    for (const pattern of requiredDesignDocMetadata) {
      if (!pattern.test(content)) {
        fail(`${file} is missing required metadata matching ${pattern}`);
      }
    }

    for (const heading of requiredDesignDocSections) {
      assertHeadingExists(file, heading);
    }
  }
}

function verifyPrTemplate() {
  const file = ".github/PULL_REQUEST_TEMPLATE.md";

  for (const section of requiredPrSections) {
    assertHeadingExists(file, section);
  }
}

function verifyWorkflowCommand() {
  assertContains(".github/workflows/ci.yml", "pnpm install --frozen-lockfile");
  assertContains(".github/workflows/ci.yml", "pnpm build");
  assertContains(".github/workflows/ci.yml", "pnpm lint");
  assertContains(".github/workflows/ci.yml", "pnpm test");
  assertContains(".github/workflows/ci.yml", "pnpm verify");
}

function verifyAgentCommand() {
  assertContains("AGENTS.md", "pnpm lint");
  assertContains("AGENTS.md", "pnpm test");
  assertContains("AGENTS.md", "pnpm build");
  assertContains("AGENTS.md", "Docs/diff verification is a CI job");
}

function verifyMarkdownLinks() {
  const markdownFiles = walkFiles(".")
    .filter((file) => file.endsWith(".md"))
    .filter((file) => !file.startsWith(".git/"));

  for (const file of markdownFiles) {
    const content = read(file);
    const markdownLinkMatches = [...content.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)];

    for (const match of markdownLinkMatches) {
      const reference = match[1];
      const resolvedReference = resolveReference(file, reference);

      if (resolvedReference && !fs.existsSync(resolvedReference)) {
        fail(`${file} links to missing local target: ${reference}`);
      }
    }
  }
}

function verifyInlineMarkdownFileReferences() {
  const markdownFiles = walkFiles(".")
    .filter((file) => file.endsWith(".md"))
    .filter((file) => !file.startsWith(".git/"));

  for (const file of markdownFiles) {
    const content = stripFencedCodeBlocks(read(file));
    const inlineCodeMatches = [...content.matchAll(/`([^`\n]+)`/g)];

    for (const match of inlineCodeMatches) {
      const reference = match[1].trim();

      if (!/\.md$/i.test(cleanReference(reference)) || isPlaceholderReference(reference)) {
        continue;
      }

      const resolvedReference = resolveReference(file, reference);

      if (resolvedReference && !fs.existsSync(resolvedReference)) {
        fail(`${file} references missing markdown file: ${reference}`);
      }
    }
  }
}

verifyRequiredFiles();
verifyDesignDocIndex();
verifyDesignDocMetadata();
verifyPrTemplate();
verifyWorkflowCommand();
verifyAgentCommand();
verifyMarkdownLinks();
verifyInlineMarkdownFileReferences();

if (failures.length > 0) {
  console.error("Documentation verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Documentation verification passed.");
