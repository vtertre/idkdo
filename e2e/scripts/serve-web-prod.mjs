import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer, request } from "node:http";
import { extname, join, normalize, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../../web/dist/web/browser", import.meta.url)));
const port = 4300;
const types = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
]);

const server = createServer((incoming, outgoing) => {
  const url = new URL(incoming.url ?? "/", `http://${incoming.headers.host ?? "localhost"}`);

  if (url.pathname.startsWith("/api")) {
    proxyApi(incoming, outgoing, url);
    return;
  }

  serveStatic(outgoing, url.pathname);
});

server.listen(port, () => {
  console.log(`Serving ${root} at http://localhost:${port}`);
});

function serveStatic(outgoing, pathname) {
  const decodedPath = decodeURIComponent(pathname);
  const candidatePath = normalize(join(root, decodedPath));
  const relativePath = relative(root, candidatePath);
  const withinRoot = relativePath === "" || (!relativePath.startsWith("..") && !relativePath.includes(`..${sep}`));
  const filePath = withinRoot && isFile(candidatePath) ? candidatePath : join(root, "index.html");

  if (!isFile(filePath)) {
    outgoing.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    outgoing.end("Not found");
    return;
  }

  outgoing.writeHead(200, {
    "Content-Type": types.get(extname(filePath)) ?? "application/octet-stream",
  });
  createReadStream(filePath).pipe(outgoing);
}

function proxyApi(incoming, outgoing, url) {
  const proxy = request(
    {
      hostname: "localhost",
      port: 3000,
      method: incoming.method,
      path: `${url.pathname}${url.search}`,
      headers: { ...incoming.headers, host: "localhost:3000" },
    },
    (response) => {
      outgoing.writeHead(response.statusCode ?? 500, response.headers);
      response.pipe(outgoing);
    },
  );

  proxy.on("error", () => {
    outgoing.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
    outgoing.end("API proxy failed");
  });
  incoming.pipe(proxy);
}

function isFile(filePath) {
  return existsSync(filePath) && statSync(filePath).isFile();
}
