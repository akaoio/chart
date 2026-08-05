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

const TYPES = {
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".html": "text/html",
    ".css": "text/css",
    ".json": "application/json",
}

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

/**
 * Bộ trưng bày cũng phải chạy thật.
 *
 * Trang trưng bày là **tài liệu**, mà tài liệu sai còn tệ hơn không có: người đọc chép về
 * rồi mới biết. Nên mỗi trang được nạp trong đúng trình duyệt ấy và phải chứng minh hai
 * điều — không có lỗi nào trong trang, và mỗi biểu đồ thật sự vẽ ra pixel. Vài trang còn
 * bị thao tác thật: bấm để vẽ, kéo để quét.
 */
const SHOWCASE = ["index", "series", "indicators", "coordinates", "drawing", "interaction"]

const paintedPixels = () =>
    [...document.querySelectorAll("chart-canvas")].map(canvas => {
        const contexts = canvas.getCanvasContexts?.()
        if (!contexts) return 0

        let painted = 0
        for (const key of ["bg", "axes", "mouseCoord"]) {
            const context = contexts[key]
            if (!context) continue

            const pixels = context.getImageData(0, 0, context.canvas.width, context.canvas.height).data
            for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 0) painted++
        }
        return painted
    })

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

        const painted = await page.evaluate(paintedPixels)

        checks.push({
            label: "trang không có lỗi nào",
            pass: problems.length === 0,
            expected: "0",
            actual: String(problems.length) + (problems.length ? ` — ${problems[0]}` : ""),
        })
        checks.push({ label: "trang có biểu đồ", pass: painted.length > 0, expected: "> 0", actual: painted.length })
        checks.push({
            label: "biểu đồ nào cũng vẽ ra pixel",
            pass: painted.every(count => count > 200),
            expected: "> 200 mỗi cái",
            actual: painted.join(", "),
        })

        page.off("pageerror", onError)
        page.off("console", onConsole)

        results.push({ name: `trưng bày: ${name}`, checks })
    }

    results.push(await showcaseDrawing(page, origin))
    results.push(await showcaseBrush(page, origin))

    return results
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
