/**
 * Bậc 2 không chứng minh được bằng golden data — nó là DOM, canvas và chuột thật.
 * Nên nó được chứng minh trong trình duyệt thật, bằng thao tác thật.
 *
 *   npm run test:browser
 *
 * Mỗi bài phải khẳng định một điều CÓ THỂ SAI. "Không nổ" không phải là kết quả.
 */

import { createServer } from "node:http"
import { readFile, readdir } from "node:fs/promises"
import { extname, join, normalize } from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright"

const root = fileURLToPath(new URL(".", import.meta.url))

const TYPES = { ".js": "text/javascript", ".mjs": "text/javascript", ".html": "text/html", ".json": "application/json" }

/**
 * Import map cho d3.
 *
 * Trình duyệt không tự phân giải `import { extent } from "d3-array"` — tên trần là việc
 * của bundler hoặc của import map. Bản port dùng d3 nên trang nào nạp nó bằng ESM thuần
 * cũng cần đúng cái map này; ghi trong README luôn, vì đây là điều người dùng phải biết
 * chứ không phải mẹo riêng của bộ test.
 */
const buildImportMap = async () => {
    const modules = join(root, "node_modules")
    const imports = {}

    for (const name of await readdir(modules)) {
        if (!name.startsWith("d3-") && name !== "internmap") continue

        try {
            const manifest = JSON.parse(await readFile(join(modules, name, "package.json"), "utf8"))
            const entry = manifest.module ?? manifest.exports?.["."]?.default ?? manifest.main
            if (entry) imports[name] = `/node_modules/${name}/${entry.replace(/^\.\//, "")}`
        } catch {
            // gói không đọc được thì bỏ qua — thiếu sẽ lộ ra ngay khi trang nạp
        }
    }

    return JSON.stringify({ imports }, null, 4)
}

const importMap = await buildImportMap()

const server = createServer(async (request, response) => {
    try {
        const path = join(root, normalize(decodeURIComponent(request.url.split("?")[0])))
        if (!path.startsWith(root)) throw new Error("ngoài phạm vi")

        let body = await readFile(path)

        if (path.endsWith(".html")) {
            body = body.toString().replace("<!--IMPORTMAP-->", `<script type="importmap">${importMap}</script>`)
        }

        response.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" })
        response.end(body)
    } catch {
        response.writeHead(404)
        response.end("không thấy")
    }
})

await new Promise(resolve => server.listen(0, "127.0.0.1", resolve))
const origin = `http://127.0.0.1:${server.address().port}`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } })

const pageErrors = []
page.on("pageerror", error => pageErrors.push(error.stack ?? error.message))
page.on("console", message => {
    if (message.type() === "error") pageErrors.push("console: " + message.text())
})

await page.goto(`${origin}/tools/browser/harness.html`)
await page.waitForFunction(() => window.chartReady === true, null, { timeout: 15000 })

const results = await page.evaluate(() => window.runChartTests())

await browser.close()
server.close()

let failed = 0
let assertions = 0

for (const { name, checks, error } of results) {
    if (error) {
        failed++
        console.error(`✗ ${name}\n    nổ: ${error}`)
        continue
    }

    const bad = checks.filter(check => !check.pass)
    assertions += checks.length

    if (bad.length === 0) {
        console.log(`✓ ${name} (${checks.length} khẳng định)`)
    } else {
        failed++
        console.error(`✗ ${name}`)
        for (const check of bad) {
            console.error(`    ${check.label}\n      mong đợi: ${check.expected}\n      thực tế:  ${check.actual}`)
        }
    }
}

if (pageErrors.length) {
    failed++
    console.error("\nlỗi trong trang:")
    for (const error of pageErrors) console.error("  " + error)
}

if (failed > 0) {
    console.error(`\n${failed} bài lỗi.`)
    process.exit(1)
}

console.log(`\n${assertions} khẳng định đúng trong trình duyệt thật.`)
