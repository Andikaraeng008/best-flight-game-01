// Tiny static server for local play-testing: serves game/ at http://localhost:8080.
// Node standard library only; run with `node serve.ts`. Query strings (such as
// ?shot=rings) are ignored when resolving the file, so screenshot presets work.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "game");
const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".json": "application/json",
};
const port = Number(process.env.PORT ?? 8080);

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    let path = normalize(join(root, decodeURIComponent(url.pathname)));
    if (!path.startsWith(root)) {
      res.writeHead(403);
      res.end();
      return;
    }
    if (path === root || path.endsWith("/")) path = join(path, "index.html");
    const data = await readFile(path);
    res.writeHead(200, { "content-type": types[extname(path)] ?? "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});

server.listen(port, () => console.log(`Island Runway Courier at http://localhost:${port}/`));
