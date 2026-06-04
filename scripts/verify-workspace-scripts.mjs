import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function usage() {
  console.error("Usage: node scripts/verify-workspace-scripts.mjs <script> [--root <path>]");
  process.exit(2);
}

const args = process.argv.slice(2);
const scriptName = args[0];
let root = defaultRoot;

if (!scriptName || scriptName.startsWith("-")) {
  usage();
}

for (let index = 1; index < args.length; index += 1) {
  const arg = args[index];

  if (arg === "--root") {
    const nextArg = args[index + 1];

    if (!nextArg) {
      usage();
    }

    root = path.resolve(nextArg);
    index += 1;
    continue;
  }

  usage();
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function relativePath(filePath) {
  return toPosixPath(path.relative(root, filePath));
}

function stripYamlString(value) {
  return value.trim().replace(/^["']|["']$/g, "");
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    failures.push(`${relativePath(filePath)} could not be parsed as JSON: ${error.message}`);
    return null;
  }
}

function readWorkspacePatterns() {
  const workspaceFile = path.join(root, "pnpm-workspace.yaml");

  if (!fs.existsSync(workspaceFile)) {
    failures.push("Missing pnpm-workspace.yaml.");
    return [];
  }

  const patterns = [];
  const lines = fs.readFileSync(workspaceFile, "utf8").split(/\r?\n/);
  let inPackages = false;
  let packagesIndent = 0;

  for (const rawLine of lines) {
    const lineWithoutComment = rawLine.replace(/\s+#.*$/, "");

    if (!lineWithoutComment.trim()) {
      continue;
    }

    const packagesMatch = lineWithoutComment.match(/^(\s*)packages:\s*$/);

    if (packagesMatch) {
      inPackages = true;
      packagesIndent = packagesMatch[1].length;
      continue;
    }

    if (!inPackages) {
      continue;
    }

    const indent = lineWithoutComment.match(/^\s*/)?.[0].length ?? 0;

    if (indent <= packagesIndent && !lineWithoutComment.trimStart().startsWith("-")) {
      break;
    }

    const patternMatch = lineWithoutComment.match(/^\s*-\s*(.+?)\s*$/);

    if (patternMatch) {
      patterns.push(stripYamlString(patternMatch[1]));
    }
  }

  if (patterns.length === 0) {
    failures.push("pnpm-workspace.yaml must define at least one package pattern.");
  }

  return patterns;
}

function expandWorkspacePattern(pattern) {
  const normalizedPattern = pattern.replaceAll("\\", "/");

  if (normalizedPattern.endsWith("/*") && !normalizedPattern.slice(0, -2).includes("*")) {
    const directory = path.join(root, normalizedPattern.slice(0, -2));

    if (!fs.existsSync(directory)) {
      failures.push(`Workspace pattern ${JSON.stringify(pattern)} points to a missing directory.`);
      return [];
    }

    return fs
      .readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(directory, entry.name))
      .filter((packageDirectory) => fs.existsSync(path.join(packageDirectory, "package.json")));
  }

  if (normalizedPattern.includes("*")) {
    failures.push(`Workspace pattern ${JSON.stringify(pattern)} uses an unsupported glob shape.`);
    return [];
  }

  const packageDirectory = path.join(root, normalizedPattern);

  if (!fs.existsSync(path.join(packageDirectory, "package.json"))) {
    failures.push(`Workspace pattern ${JSON.stringify(pattern)} does not match a package.json.`);
    return [];
  }

  return [packageDirectory];
}

function findWorkspacePackages() {
  const seenPackageDirectories = new Set();
  const packageDirectories = [];

  for (const pattern of readWorkspacePatterns()) {
    for (const packageDirectory of expandWorkspacePattern(pattern)) {
      const resolvedPackageDirectory = path.resolve(packageDirectory);

      if (!seenPackageDirectories.has(resolvedPackageDirectory)) {
        seenPackageDirectories.add(resolvedPackageDirectory);
        packageDirectories.push(resolvedPackageDirectory);
      }
    }
  }

  return packageDirectories.sort((left, right) => relativePath(left).localeCompare(relativePath(right)));
}

function placeholderReason(script) {
  const normalizedScript = script.trim().replace(/\s+/g, " ");

  if (!normalizedScript) {
    return "is empty";
  }

  if (normalizedScript === "true" || normalizedScript === ":" || normalizedScript === "exit 0") {
    return `only runs ${JSON.stringify(normalizedScript)}`;
  }

  if (/^(echo|printf)(\s|$)/.test(normalizedScript)) {
    return "only prints text";
  }

  return null;
}

const workspacePackages = findWorkspacePackages();

if (workspacePackages.length === 0) {
  failures.push("No workspace package.json files were found.");
}

for (const packageDirectory of workspacePackages) {
  const packageJsonPath = path.join(packageDirectory, "package.json");
  const packageJson = readJson(packageJsonPath);

  if (!packageJson) {
    continue;
  }

  const packageName = packageJson.name ?? relativePath(packageDirectory);
  const scripts = packageJson.scripts ?? {};
  const script = scripts[scriptName];

  if (script === undefined) {
    failures.push(`${packageName} (${relativePath(packageJsonPath)}) is missing a ${JSON.stringify(scriptName)} script.`);
    continue;
  }

  const reason = placeholderReason(script);

  if (reason) {
    failures.push(`${packageName} (${relativePath(packageJsonPath)}) has a ${JSON.stringify(scriptName)} script that ${reason}.`);
  }
}

if (failures.length > 0) {
  console.error(`Workspace script verification failed for ${JSON.stringify(scriptName)}:`);

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  console.error(`Add meaningful package-level ${JSON.stringify(scriptName)} scripts before relying on pnpm ${scriptName}.`);
  process.exit(1);
}

console.log(`Workspace script verification passed for ${JSON.stringify(scriptName)} (${workspacePackages.length} packages).`);
