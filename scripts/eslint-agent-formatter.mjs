import path from "node:path";

const ruleGuidance = new Map([
  [
    "@typescript-eslint/no-explicit-any",
    "Prefer a specific type, unknown plus narrowing, or a generic. If any is truly the least bad option, suppress only this rule on one line and explain why.",
  ],
  [
    "@typescript-eslint/no-floating-promises",
    "Await or return the promise. Use void only for deliberate fire-and-forget work after considering error handling.",
  ],
  [
    "@typescript-eslint/no-misused-promises",
    "Keep async work out of places expecting a plain boolean or void callback unless the framework contract explicitly supports it.",
  ],
  [
    "@typescript-eslint/no-unused-vars",
    "Remove unused code. Use a leading underscore only for required callback or interface parameters that are intentionally unused.",
  ],
  [
    "@typescript-eslint/ban-ts-comment",
    "Fix the type issue first. Prefer a narrow ts-expect-error with a useful reason when an exception is unavoidable.",
  ],
  [
    "complexity",
    "Extract named decisions or separate policy from orchestration. A local, justified suppression is better than weakening the global threshold.",
  ],
  [
    "max-lines-per-function",
    "Split by behavior or responsibility when that clarifies the code. Avoid tiny helper churn that hides a simple flow.",
  ],
  [
    "max-params",
    "Introduce an options object or cohesive value object when the parameters travel together. Do not add a wrapper just to satisfy the count.",
  ],
  [
    "no-nested-ternary",
    "Prefer named branches, guard clauses, or a small helper so future readers can see the decision points.",
  ],
  [
    "@eslint-community/eslint-comments/no-unlimited-disable",
    "Name the exact rule being suppressed so the exception is reviewable and cannot hide unrelated problems.",
  ],
  [
    "@eslint-community/eslint-comments/require-description",
    "Add a short reason after -- so reviewers can judge whether the suppression is still valid.",
  ],
  [
    "@eslint-community/eslint-comments/no-duplicate-disable",
    "Keep one narrow suppression per issue. Duplicate disables are usually stale cleanup debt.",
  ],
  [
    "@eslint-community/eslint-comments/disable-enable-pair",
    "Keep disable blocks tightly scoped. Prefer line-level suppressions unless a whole-file exception is intentional.",
  ],
]);

const unsafeTypeGuidance =
  "Move from unsafe values toward typed boundaries: validate, narrow unknown, or type the external contract before using the value.";

function relativeFilePath(filePath) {
  return path.relative(process.cwd(), filePath).split(path.sep).join("/");
}

function guidanceFor(ruleId) {
  if (!ruleId) {
    return "Fix the parser or configuration error before making code changes.";
  }

  if (ruleGuidance.has(ruleId)) {
    return ruleGuidance.get(ruleId);
  }

  if (ruleId.startsWith("@typescript-eslint/no-unsafe-")) {
    return unsafeTypeGuidance;
  }

  return null;
}

function formatMessage(result, message) {
  const severity = message.severity === 2 ? "error" : "warning";
  const ruleId = message.ruleId ?? "fatal";
  const location = `${relativeFilePath(result.filePath)}:${message.line}:${message.column}`;
  const guidance = guidanceFor(message.ruleId);
  const lines = [`${location} ${severity} ${ruleId}`, `  ${message.message}`];

  if (guidance) {
    lines.push(`  Self-correction: ${guidance}`);
  }

  return lines.join("\n");
}

export default function eslintAgentFormatter(results) {
  const messages = results.flatMap((result) =>
    result.messages.map((message) => formatMessage(result, message)),
  );

  if (messages.length === 0) {
    return "";
  }

  return `${messages.join("\n\n")}\n`;
}
