/**
 * Một máy chủ tĩnh, dùng chung cho ba chỗ cần một cái.
 *
 * Bộ kiểm trình duyệt, bộ kiểm trang đã gom, và `npm run docs` — cả ba đều chỉ cần "trả
 * file từ một thư mục". Trước đây mỗi chỗ chép một bản; khác nhau đúng hai điều, và cả
 * hai đều thành tham số ở đây: gốc thư mục, và một phép biến đổi cho HTML.
 *
 * Nó cố ý thô sơ. Đây không phải máy chủ để chạy thật, chỉ để **chạy đúng thứ sẽ được
 * xuất bản** — nên nó không nén, không cache, và chặn mọi đường dẫn trỏ ra ngoài gốc.
 */

import { createServer } from "node:http"
import { readFile, stat } from "node:fs/promises"
import { extname, join, normalize } from "node:path"

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

/**
 * `transform` nhận nội dung HTML dạng chuỗi và trả về chuỗi khác — chỗ bộ kiểm trình
 * duyệt chèn import map vào.
 */
export const staticServer = ({ root, transform }) =>
    createServer(async (request, response) => {
        try {
            let path = join(root, normalize(decodeURIComponent(request.url.split("?")[0])))
            if (!path.startsWith(root)) throw new Error("ngoài phạm vi")

            if ((await stat(path)).isDirectory()) path = join(path, "index.html")

            let body = await readFile(path)
            if (transform !== undefined && path.endsWith(".html")) body = transform(body.toString())

            response.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" })
            response.end(body)
        } catch {
            response.writeHead(404, { "content-type": "text/plain; charset=utf-8" })
            response.end("không thấy")
        }
    })

/** Mở cổng ngẫu nhiên và trả về origin — thứ mọi bộ kiểm cần. */
export const listen = async server => {
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve))
    return `http://127.0.0.1:${server.address().port}`
}
