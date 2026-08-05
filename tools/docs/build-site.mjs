/**
 * Gom trang tĩnh để xuất bản.
 *
 *   npm run docs:site      → _site/
 *
 * Đây **không phải** bước build của thư viện: không có gì được dịch, gộp hay nhỏ lại.
 * Nó chỉ chép file, và điều duy nhất nó phải giữ là **bố cục thư mục**.
 *
 * Lý do: import map trong mỗi trang trưng bày trỏ bằng đường dẫn tương đối tới
 * `../../src/` và `../../node_modules/d3-*`. Giữ nguyên bố cục nghĩa là trang đã xuất bản
 * nạp đúng những đường dẫn ấy — nên thứ chạy trên Pages với thứ bộ kiểm chạy trong
 * Chromium là **cùng một trang, cùng một mã**. Viết lại đường dẫn lúc build thì mất đúng
 * điều đó, và mất luôn khả năng nói "cái anh thấy là cái đã được kiểm".
 *
 * Chỉ những gói trình duyệt thật sự hỏi tới mới được chép — chép cả node_modules là chép
 * hàng chục nghìn file không ai nạp.
 */

import { cp, mkdir, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { bareSpecifiers } from "../import-map.mjs"

const root = fileURLToPath(new URL("../../", import.meta.url))
const site = join(root, "_site")

/** Trang chủ chỉ đưa người ta sang bộ trưng bày — không có gì khác ở gốc. */
const REDIRECT = `<!doctype html>
<meta charset="utf-8" />
<title>chart</title>
<meta http-equiv="refresh" content="0; url=docs/showcase/" />
<link rel="canonical" href="docs/showcase/" />
<p><a href="docs/showcase/">Financial charts as plain Web Components →</a></p>
`

export const build = async () => {
    await rm(site, { recursive: true, force: true })
    await mkdir(site, { recursive: true })

    await cp(join(root, "docs"), join(site, "docs"), { recursive: true })
    await cp(join(root, "src"), join(site, "src"), { recursive: true })
    await cp(join(root, "README.md"), join(site, "README.md"))
    await cp(join(root, "LICENSE"), join(site, "LICENSE"))

    const modules = join(root, "node_modules")
    // Đúng những gói trình duyệt sẽ hỏi tới, tính ở tools/import-map.mjs — cùng một
    // nguồn với import map trong trang và với bộ kiểm.
    const wanted = await bareSpecifiers()

    if (wanted.length === 0) throw new Error("Không thấy gói nào — chạy `npm install` trước.")

    for (const name of wanted) {
        await cp(join(modules, name), join(site, "node_modules", name), { recursive: true })
    }

    await writeFile(join(site, "index.html"), REDIRECT)

    // GitHub Pages chạy Jekyll nếu không được bảo đừng, và Jekyll bỏ qua thư mục bắt đầu
    // bằng dấu gạch dưới — `node_modules` thì không sao, nhưng tắt hẳn cho chắc và nhanh.
    await writeFile(join(site, ".nojekyll"), "")

    return { modules: wanted.length }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    const { modules } = await build()
    console.log(`_site/ dựng xong — docs, src, và ${modules} gói d3`)
}
