/**
 * Máy chủ tĩnh để xem bộ trưng bày tại chỗ.
 *
 *   npm run docs
 *
 * Không dịch gì, không gộp gì — nó chỉ trả file. Đó là điểm mấu chốt: trang trưng bày nạp
 * thẳng `src/` và `node_modules/d3-*` qua cái import map viết sẵn trong chính trang, nên
 * thứ chạy ở đây với thứ chạy khi đã xuất bản là **cùng một thứ**.
 */

import { fileURLToPath } from "node:url"
import { staticServer } from "../static-server.mjs"

const root = fileURLToPath(new URL("../../", import.meta.url))
const port = Number(process.env.PORT ?? 8123)

staticServer({ root }).listen(port, "127.0.0.1", () => {
    console.log(`http://127.0.0.1:${port}/docs/showcase/`)
})
