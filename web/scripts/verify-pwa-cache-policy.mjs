import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = join(projectRoot, "dist", "web", "browser");
const sourceConfig = readJson(join(projectRoot, "ngsw-config.json"));

assert(sourceConfig.dataGroups?.length === 0, "ngsw-config.json must not define API data groups.");
assert(
  sourceConfig.navigationUrls?.includes("!/api/**"),
  "ngsw-config.json must exclude /api/** from navigation fallback.",
);

const sourceAssetPatterns = sourceConfig.assetGroups.flatMap((group) => [
  ...(group.resources.files ?? []),
  ...(group.resources.urls ?? []),
]);
assert(
  sourceAssetPatterns.every((pattern) => !pattern.includes("/api")),
  "ngsw-config.json asset groups must not include /api.",
);

for (const artifact of ["ngsw-worker.js", "ngsw.json", "manifest.webmanifest"]) {
  assert(existsSync(join(outputRoot, artifact)), `Production build is missing ${artifact}.`);
}

const builtConfig = readJson(join(outputRoot, "ngsw.json"));
assert(
  !builtConfig.dataGroups || builtConfig.dataGroups.length === 0,
  "Built service worker must not contain data groups.",
);
assert(
  builtConfig.assetGroups.every((group) =>
    group.urls.every((url) => !url.startsWith("/api/")),
  ),
  "Built service worker assets must not contain API URLs.",
);
assert(
  builtConfig.navigationUrls.some(
    (rule) => rule.positive === false && new RegExp(rule.regex).test("/api/events"),
  ),
  "Built service worker must exclude API URLs from navigation fallback.",
);

console.log("PWA cache policy verified: application assets only; /api/** excluded.");

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
