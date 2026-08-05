/**
 * Kiểm trang đã gom, trước khi xuất bản.
 *
 *   npm run docs:site && npm run docs:check
 *
 * `npm test` đã kiểm bộ trưng bày khi phục vụ từ **kho mã**. Bài này kiểm đúng thứ sẽ
 * được đưa lên: `_site/`, phục vụ từ gốc, không có gì khác quanh nó. Nếu một đường dẫn
 * trong import map trỏ ra ngoài thư mục đã gom, hay một file bị bỏ quên, chỗ này đổ —
 * chứ không phải người truy cập phát hiện hộ.
 */

import { fileURLToPath } from "node:url"
import { chromium } from "playwright"
import { listen, staticServer } from "../static-server.mjs"
import { chartMeasurements } from "../browser/painted.mjs"

const site = fileURLToPath(new URL("../../_site/", import.meta.url))

const PAGES = ["", "docs/showcase/", "docs/showcase/series.html", "docs/showcase/indicators.html",
    "docs/showcase/coordinates.html", "docs/showcase/drawing.html", "docs/showcase/interaction.html"]

const server = staticServer({ root: site })
const origin = await listen(server)

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } })

let failed = 0

for (const path of PAGES) {
    const problems = []

    const onError = error => problems.push(error.stack ?? error.message)
    const onConsole = message => {
        if (message.type() === "error") problems.push("console: " + message.text())
    }
    const onFailed = request => problems.push(`không tải được ${request.url()}`)

    // Về chỗ trắng TRƯỚC khi nghe: trang chủ chuyển hướng bằng meta refresh, và lần
    // chuyển hướng đang dở của vòng trước bị huỷ sẽ báo về như một request hỏng.
    await page.goto("about:blank")

    page.on("pageerror", onError)
    page.on("console", onConsole)
    page.on("requestfailed", onFailed)

    let response = null

    // Trang chủ chỉ chuyển hướng; các trang còn lại phải thật sự vẽ ra thứ gì đó.
    const isRedirect = path === ""

    // Một trang hỏng làm chờ đợi hết giờ; đó là một kết quả, không phải một tai nạn.
    try {
        response = await page.goto(`${origin}/${path}`, { waitUntil: "load" })

        if (isRedirect) {
            // và phải chuyển hướng tới đúng chỗ, chứ không chỉ trả về 200
            await page.waitForURL(`${origin}/docs/showcase/`, { timeout: 5000 })
        } else {
            await page.waitForFunction(() => document.querySelectorAll("chart-canvas").length > 0, null, {
                timeout: 15000,
            })
            await page.waitForTimeout(600)
        }
    } catch (error) {
        problems.push(error.message.split("\n")[0])
    }

    const measured = isRedirect || problems.length > 0
        ? []
        : await page.evaluate(chartMeasurements)

    page.off("pageerror", onError)
    page.off("console", onConsole)
    page.off("requestfailed", onFailed)

    // "Không vẽ gì" và "chỉ vẽ được hai cái trục" là hai cái sai khác nhau, và cái thứ hai
    // mới là cái đã lọt lên trang thật: trục xám vượt ngưỡng pixel, còn nến thì không có.
    const blank = measured.filter(({ painted }) => painted <= 200).length
    const empty = measured.filter(({ inside }) => inside <= 200).length
    const bare = measured.filter(({ series }) => series === 0).length

    const ok =
        response?.ok() === true &&
        problems.length === 0 &&
        (isRedirect || (measured.length > 0 && blank === 0 && empty === 0 && bare === 0))

    if (ok) {
        console.log(`✓ /${path}${isRedirect ? " (chuyển hướng)" : ` — ${measured.length} biểu đồ vẽ ra dữ liệu`}`)
    } else {
        failed++
        console.error(`✗ /${path}`)
        if (!response?.ok()) console.error(`    HTTP ${response?.status()}`)
        for (const problem of problems.slice(0, 5)) console.error(`    ${problem}`)
        if (!isRedirect && blank > 0) console.error(`    ${blank} biểu đồ không vẽ gì`)
        if (!isRedirect && bare > 0) console.error(`    ${bare} biểu đồ không có series nào`)
        if (!isRedirect && empty > 0) console.error(`    ${empty} biểu đồ trống trong vùng vẽ — chỉ có trục`)
    }
}

await browser.close()
server.close()

if (failed > 0) {
    console.error(`\n${failed} trang hỏng trong _site — chưa xuất bản được.`)
    process.exit(1)
}

console.log(`\n${PAGES.length} trang trong _site chạy đúng khi phục vụ từ gốc.`)
