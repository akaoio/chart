/**
 * Bậc 2 không chứng minh được bằng golden data — nó là DOM, canvas và chuột thật.
 * Nên nó được chứng minh trong trình duyệt thật, bằng thao tác thật.
 *
 *   npm run test:browser
 *
 * Mỗi bài phải khẳng định một điều CÓ THỂ SAI. "Không nổ" không phải là kết quả.
 */

import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright"
import { listen, staticServer } from "./tools/static-server.mjs"
import { chartMeasurements } from "./tools/browser/painted.mjs"
import { importMap as buildImportMap } from "./tools/import-map.mjs"

const root = fileURLToPath(new URL(".", import.meta.url))

/**
 * Import map cho d3.
 *
 * Trình duyệt không tự phân giải `import { extent } from "d3-array"` — tên trần là việc
 * của bundler hoặc của import map. Danh sách gói được **tính** ở `tools/import-map.mjs`,
 * cùng một nguồn với trang trưng bày và với script gom trang tĩnh.
 */
const importMap = JSON.stringify({ imports: await buildImportMap("/") }, null, 4)

const server = staticServer({
    root,
    transform: html => html.replace("<!--IMPORTMAP-->", `<script type="importmap">${importMap}</script>`),
})

const origin = await listen(server)

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } })

const pageErrors = []
page.on("pageerror", error => pageErrors.push(error.stack ?? error.message))
page.on("console", message => {
    if (message.type() === "error") pageErrors.push("console: " + message.text())
})

/**
 * Bộ trưng bày cũng phải chạy thật.
 *
 * Trang trưng bày là **tài liệu**, mà tài liệu sai còn tệ hơn không có: người đọc chép về
 * rồi mới biết. Nên mỗi trang được nạp trong đúng trình duyệt ấy và phải chứng minh hai
 * điều — không có lỗi nào trong trang, và mỗi biểu đồ thật sự vẽ ra pixel. Vài trang còn
 * bị thao tác thật: bấm để vẽ, kéo để quét.
 */
const SHOWCASE = ["index", "series", "indicators", "coordinates", "drawing", "interaction"]

const runShowcaseTests = async (page, origin) => {
    const results = []

    for (const name of SHOWCASE) {
        const checks = []
        const problems = []

        const onError = error => problems.push(error.stack ?? error.message)
        const onConsole = message => {
            if (message.type() === "error") problems.push("console: " + message.text())
        }

        page.on("pageerror", onError)
        page.on("console", onConsole)

        await page.goto(`${origin}/docs/showcase/${name}.html`)
        await page.waitForFunction(
            () => document.querySelectorAll("chart-canvas").length > 0,
            null,
            { timeout: 15000 },
        )
        // để mọi biểu đồ kịp đo mình và vẽ xong
        await page.waitForTimeout(600)

        const measured = await page.evaluate(chartMeasurements)

        /**
         * Không tooltip nào được đọc ra `n/a` khi trang vừa mở.
         *
         * `displayValuesFor` mặc định là "hàng con trỏ đang chỉ vào", mà lúc chưa trỏ thì
         * không có hàng nào — sáu trong tám tooltip của bản gốc tự lùi về hàng cuối, hai
         * cái còn lại (`RSITooltip`, `StochasticTooltip`) thì không. Đặt hai kiểu cạnh nhau
         * trong một biểu đồ thì cái không lùi trông như đang hỏng, nên bài trưng bày phải
         * truyền `displayValuesFor` cho chúng. Bài này canh đúng chỗ ấy.
         */
        const unread = await page.evaluate(() =>
            [...document.querySelectorAll("chart-canvas")].flatMap(canvas =>
                [...(canvas.shadowRoot?.querySelectorAll("text") ?? [])]
                    .map(node => node.textContent)
                    .filter(text => text.includes("n/a")),
            ),
        )

        checks.push({
            label: "trang không có lỗi nào",
            pass: problems.length === 0,
            expected: "0",
            actual: String(problems.length) + (problems.length ? ` — ${problems[0]}` : ""),
        })
        checks.push({ label: "trang có biểu đồ", pass: measured.length > 0, expected: "> 0", actual: measured.length })
        checks.push({
            label: "biểu đồ nào cũng vẽ ra pixel",
            pass: measured.every(({ painted }) => painted > 200),
            expected: "> 200 mỗi cái",
            actual: measured.map(({ painted }) => painted).join(", "),
        })
        // Hai bài dưới đây là chỗ bài cũ để lọt ba trang chỉ còn hai cái trục.
        checks.push({
            label: "biểu đồ nào cũng có series",
            pass: measured.every(({ series }) => series > 0),
            expected: "≥ 1 mỗi cái",
            actual: measured.map(({ series }) => series).join(", "),
        })
        checks.push({
            label: "biểu đồ nào cũng vẽ ra pixel TRONG VÙNG VẼ, không chỉ hai cái trục",
            pass: measured.every(({ inside }) => inside > 200),
            expected: "> 200 mỗi cái",
            actual: measured.map(({ inside }) => inside).join(", "),
        })
        checks.push({
            label: "không tooltip nào đọc ra n/a khi trang vừa mở",
            pass: unread.length === 0,
            expected: "0",
            actual: unread.length ? `${unread.length} — ${unread[0]}` : "0",
        })

        page.off("pageerror", onError)
        page.off("console", onConsole)

        results.push({ name: `trưng bày: ${name}`, checks })
    }

    results.push(await showcaseDrawing(page, origin))
    results.push(await showcaseBrush(page, origin))
    results.push(await showcaseAlternateData(page, origin))

    return results
}

/**
 * `chart-alternate-data` chỉ đáng một demo nếu dữ liệu khách **không** khớp một-đối-một.
 *
 * Bản demo đầu tiên gán cho mỗi hàng khách đúng `idx` của một cây nến, một-đối-một. Chạy
 * thì đúng, nhìn thì hợp lý, mà không chứng minh gì cả: y hệt việc thêm một trường vào
 * hàng gốc rồi vẽ line. Người đọc phát hiện hộ, vì đường vàng ăn khớp từng nến. Nên bài
 * này canh đúng chỗ ấy — số hàng khách phải khác số nến — và canh cả việc nó có vẽ thật.
 */
const showcaseAlternateData = async (page, origin) => {
    const checks = []

    await page.goto(`${origin}/docs/showcase/series.html`)
    await page.waitForFunction(() => document.querySelectorAll("chart-canvas").length > 0)
    await page.waitForTimeout(600)

    const counts = await page.evaluate(() => {
        const section = [...document.querySelectorAll("section.demo")].find(node =>
            node.querySelector("h2")?.textContent === "A second dataset in the same chart",
        )
        if (!section) return null

        const said = section.querySelector(".readout").textContent
        const [candles, guest] = [...said.matchAll(/\d+/g)].map(match => Number(match[0]))

        // Vàng của đường khách, #e0a800 — đếm để biết nó có thật sự được vẽ ra hay không.
        const context = section.querySelector("chart-canvas").getCanvasContexts().axes
        const pixels = context.getImageData(0, 0, context.canvas.width, context.canvas.height).data

        let yellow = 0
        for (let at = 0; at < pixels.length; at += 4) {
            if (pixels[at] > 180 && pixels[at + 1] > 120 && pixels[at + 1] < 210 && pixels[at + 2] < 90) yellow++
        }

        return { candles, guest, yellow }
    })

    checks.push({
        label: "demo báo cả hai số hàng",
        pass: counts !== null && counts.candles > 0 && counts.guest > 0,
        expected: "hai số dương",
        actual: JSON.stringify(counts),
    })
    checks.push({
        label: "dữ liệu khách KHÔNG khớp một-đối-một với nến",
        pass: counts !== null && counts.guest < counts.candles / 2,
        expected: "khách < nửa số nến",
        actual: counts && `${counts.guest} khách / ${counts.candles} nến`,
    })
    checks.push({
        label: "đường khách vẽ ra pixel vàng",
        pass: counts !== null && counts.yellow > 100,
        expected: "> 100",
        actual: counts?.yellow,
    })

    return { name: "trưng bày: dữ liệu khách có lịch sử riêng", checks }
}

/** Bấm hai lần trên trang công cụ vẽ, rồi đọc lại bảng kết quả của chính trang ấy. */
const showcaseDrawing = async (page, origin) => {
    const checks = []

    await page.goto(`${origin}/docs/showcase/drawing.html`)
    await page.waitForFunction(() => document.querySelectorAll("chart-canvas").length > 0)
    await page.waitForTimeout(600)

    const readout = () => document.querySelector("section.demo .readout").textContent

    checks.push({
        label: "chưa vẽ gì thì trang nói thế",
        pass: (await page.evaluate(readout)) === "nothing drawn yet",
        expected: "nothing drawn yet",
        actual: await page.evaluate(readout),
    })

    await page.click("section.demo .controls button:first-child")

    const box = await page.evaluate(() => {
        const rect = document.querySelector("chart-canvas").shadowRoot.querySelector("[data-event-capture]")
        const { left, top } = rect.getBoundingClientRect()
        return { left, top }
    })

    await page.mouse.move(box.left + 200, box.top + 120)
    await page.mouse.click(box.left + 200, box.top + 120)
    await page.waitForTimeout(500)
    await page.mouse.move(box.left + 500, box.top + 260)
    await page.mouse.click(box.left + 500, box.top + 260)
    await page.waitForTimeout(300)

    const after = await page.evaluate(readout)
    checks.push({
        label: "hai lần bấm thì có một trendline",
        pass: after === "Trend line: 1",
        expected: "Trend line: 1",
        actual: after,
    })

    return { name: "trưng bày: vẽ được trendline bằng chuột thật", checks }
}

/** Kéo một hộp trên trang brush và đọc lại hai mốc nó báo. */
const showcaseBrush = async (page, origin) => {
    const checks = []

    await page.goto(`${origin}/docs/showcase/drawing.html`)
    await page.waitForFunction(() => document.querySelectorAll("chart-canvas").length > 1)
    await page.waitForTimeout(600)

    // Trang dài hơn khung nhìn, mà toạ độ chuột tính theo khung nhìn — không cuộn tới
    // thì cú kéo rơi vào chỗ khác hẳn.
    await page.evaluate(() => document.querySelectorAll("chart-canvas")[1].scrollIntoView({ block: "center" }))
    await page.waitForTimeout(200)

    const box = await page.evaluate(() => {
        const canvases = document.querySelectorAll("chart-canvas")
        const rect = canvases[1].shadowRoot.querySelector("[data-event-capture]")
        const { left, top } = rect.getBoundingClientRect()
        return { left, top }
    })

    await page.mouse.move(box.left + 150, box.top + 80)
    await page.mouse.down()
    await page.mouse.move(box.left + 300, box.top + 160)
    await page.mouse.move(box.left + 450, box.top + 220)
    await page.mouse.up()
    await page.waitForTimeout(300)

    const said = await page.evaluate(
        () => document.querySelectorAll("section.demo .readout")[1].textContent,
    )

    checks.push({
        label: "kéo một hộp thì brush báo hai mốc",
        pass: /\d{4}-\d{2}-\d{2} at \d/.test(said) && said.includes("→"),
        expected: "hai mốc có ngày và giá",
        actual: said,
    })

    return { name: "trưng bày: brush báo lại khoảng đã quét", checks }
}

await page.goto(`${origin}/tools/browser/harness.html`)
await page.waitForFunction(() => window.chartReady === true, null, { timeout: 15000 })

const results = await page.evaluate(() => window.runChartTests())

results.push(...(await runShowcaseTests(page, origin)))

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
