/**
 * Máy chủ tĩnh để xem bộ trưng bày tại chỗ.
 *
 *   npm run docs
 *
 * Không dịch gì, không gộp gì — nó chỉ trả file. Đó là điểm mấu chốt: trang trưng bày
 * nạp thẳng `src/` và `node_modules/d3-*` qua import map viết sẵn trong chính trang,
 * nên thứ chạy ở đây với thứ chạy khi đã xuất bản là **cùng một thứ**.
 */

import { createServer } from "node:http"
import { readFile, stat } from "node:fs/promises"
import { extname, join, normalize } from "node:path"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("../../", import.meta.url))

const TYPES = {
    ".css": "text/css",
    ".html": "text/html",
    ".js": "text/javascript",
    ".json": "application/json",
    // hiển thị thẳng trong trình duyệt thay vì bị tải về
    ".md": "text/plain; charset=utf-8",
    ".mjs": "text/javascript",
    ".svg": "image/svg+xml",
}

const server = createServer(async (request, response) => {
    try {
        let path = join(root, normalize(decodeURIComponent(request.url.split("?")[0])))
        if (!path.startsWith(root)) throw new Error("ngoài phạm vi")

        if ((await stat(path)).isDirectory()) path = join(path, "index.html")

        const body = await readFile(path)
        response.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" })
        response.end(body)
    } catch {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" })
        response.end("không thấy")
    }
})

const port = Number(process.env.PORT ?? 8123)

server.listen(port, "127.0.0.1", () => {
    console.log(`http://127.0.0.1:${port}/docs/showcase/`)
})
