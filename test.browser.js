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
import { chromium, devices } from "playwright"
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
    results.push(await showcaseKeepsWorkingAfterDrawing(page, origin))

    return results
}

/**
 * Vẽ xong rồi bấm tiếp thì biểu đồ phải còn sống.
 *
 * Đây là chỗ bài kiểm cũ mù, và người dùng phải phát hiện hộ: "sau khi add text là đơ
 * ngay". `chart-drawing-object-selector` được trang đăng ký với `chartId: undefined` còn
 * pane thì mang id 0, nên `getMorePropsForChart` không tìm thấy pane và nổ. Nó nổ từ trong
 * vòng phát sự kiện của `ChartCanvas`, nên cú nổ cắt luôn việc phát cho những phần tử đăng
 * ký sau nó — bấm gì cũng không ăn nữa.
 *
 * Bài cũ vẽ một trendline bằng hai cú bấm rồi dừng. Cú bấm thứ hai xảy ra khi danh sách
 * còn rỗng, nên `getMorePropsForChart` chưa được gọi tới. Chỉ cần bấm thêm một lần nữa là
 * thấy. Nên bài này bấm thêm — đặt một text, rồi bấm tiếp hai lần vào chỗ trống.
 */
const showcaseKeepsWorkingAfterDrawing = async (page, origin) => {
    const checks = []
    const problems = []

    const onError = error => problems.push(error.stack ?? error.message)
    const onConsole = message => {
        if (message.type() === "error") problems.push("console: " + message.text())
    }

    page.on("pageerror", onError)
    page.on("console", onConsole)

    await page.goto(`${origin}/docs/showcase/drawing.html`)
    await page.waitForFunction(() => document.querySelectorAll("chart-canvas").length > 0)
    await page.waitForTimeout(600)

    const readout = () => document.querySelector("section.demo .readout").textContent

    // Chọn công cụ TRƯỚC khi đo toạ độ: Playwright cuộn trang để bấm được cái nút, nên một
    // hình chữ nhật đo trước cú bấm ấy là hình chữ nhật của chỗ khác.
    await page.click("section.demo .controls button:nth-child(6)")

    const box = await page.evaluate(() => {
        const canvas = document.querySelector("chart-canvas")
        canvas.scrollIntoView({ block: "center" })
        const { left, top, width, height } = canvas.shadowRoot
            .querySelector("[data-event-capture]")
            .getBoundingClientRect()
        return { left, top, width, height }
    })
    await page.waitForTimeout(200)
    const at = (fx, fy) => [Math.round(box.left + box.width * fx), Math.round(box.top + box.height * fy)]

    // Text: một cú bấm là xong một nhãn.
    const [tx, ty] = at(0.45, 0.35)
    await page.mouse.move(tx, ty)
    await page.mouse.click(tx, ty)
    await page.waitForTimeout(400)

    checks.push({
        label: "một cú bấm đặt được một text",
        pass: (await page.evaluate(readout)) === "Text: 1",
        expected: "Text: 1",
        actual: await page.evaluate(readout),
    })

    // Tắt công cụ đi, để hai cú bấm sau là bấm-để-chọn thuần: đúng cảnh đã nổ, mà không
    // thêm nhãn nào vào danh sách.
    await page.click("section.demo .controls button:nth-child(6)")

    // Và đây là cú bấm mà bài cũ không bao giờ thực hiện.
    for (const spot of [at(0.7, 0.6), at(0.25, 0.7)]) {
        await page.mouse.move(spot[0], spot[1])
        await page.mouse.click(spot[0], spot[1])
        await page.waitForTimeout(250)
    }

    checks.push({
        label: "bấm tiếp sau khi đã vẽ thì không có lỗi nào",
        pass: problems.length === 0,
        expected: "0",
        actual: problems.length ? `${problems.length} — ${problems[0].split("\n")[0]}` : "0",
    })

    // Còn sống nghĩa là công cụ khác vẫn dùng được: vẽ thêm một trendline.
    await page.click("section.demo .controls button:first-child")
    const [ax, ay] = at(0.3, 0.5)
    const [bx, by] = at(0.6, 0.3)
    await page.mouse.move(ax, ay)
    await page.mouse.click(ax, ay)
    await page.waitForTimeout(300)
    await page.mouse.move(bx, by)
    await page.mouse.click(bx, by)
    await page.waitForTimeout(400)

    const after = await page.evaluate(readout)
    checks.push({
        label: "công cụ khác vẫn vẽ được sau đó",
        pass: after.includes("Trend line: 1") && after.includes("Text: 1"),
        expected: "có cả Trend line: 1 và Text: 1",
        actual: after,
    })

    page.off("pageerror", onError)
    page.off("console", onConsole)

    return { name: "trưng bày: vẽ xong rồi bấm tiếp thì biểu đồ còn sống", checks }
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

/**
 * Cả tám công cụ vẽ, bằng NGÓN TAY THẬT, trên chính trang người dùng mở.
 *
 * Bài kiểm trong harness dựng `TouchEvent` bằng tay. Cách ấy chạy được và đã chứng minh
 * được đường pan, nhưng nó không đi qua tầng của trình duyệt: `touch-action`, phép dò trúng
 * đích, và việc trình duyệt tự sinh ra chuỗi sự kiện chuột sau một cú gõ. Nên chỗ này chạm
 * bằng CDP `Input.dispatchTouchEvent` — đúng đường một ngón tay thật đi.
 *
 * Một thân bài, một bảng tám dòng. Cùng một chuỗi cử chỉ cho mọi công cụ, vì đó chính là
 * điều đang được khẳng định: một ngón tay làm được mọi thứ con chuột làm được, ở công cụ nào
 * cũng vậy. Tám bản sao của cùng một thân bài thì tám lần phải giữ chúng khớp nhau.
 */
const TOUCH_TOOLS = [
    { label: "Trend line", tag: "chart-trend-line", list: "trends", taps: 2, grab: [0.45, 0.475] },
    { label: "Fibonacci", tag: "chart-fibonacci-retracement", list: "retracements", taps: 2, grab: [0.45, 0.475] },
    { label: "Channel", tag: "chart-equidistant-channel", list: "channels", taps: 3, grab: [0.45, 0.475] },
    /**
     * Kênh hồi quy có hai chỗ khác mọi công cụ còn lại, và cả hai là thiết kế của bản gốc.
     *
     * Nó được vẽ theo đường KHỚP với dữ liệu giữa hai chỗ tay chạm, không theo dây cung nối
     * hai chỗ ấy — nên chỗ để gõ vào không suy ra được từ mấy cú gõ, phải đo.
     *
     * Và **thân nó không kéo được**: `EachLinearRegressionChannel` chỉ nối `onHover` cho
     * vùng thân, còn `onDrag` thì chỉ hai chốt hai đầu có. Bằng chuột cũng vậy. Nên bài này
     * kéo bằng chốt — đúng cách sửa một kênh hồi quy, và vẫn đi qua đúng đường cần chứng
     * minh: trỏ trúng → nhận cú kéo → đối tượng đổi hình.
     */
    {
        label: "Regression",
        tag: "chart-standard-deviation-channel",
        list: "channels",
        taps: 2,
        grab: [0.45, 0.5],
        dragGrab: [0.296, 0.545],
    },
    { label: "Gann fan", tag: "chart-gann-fan-tool", list: "fans", taps: 2, grab: [0.45, 0.475] },
    // Nhãn chữ chỉ cần một cú gõ, và nó nằm đúng chỗ ấy.
    { label: "Text", tag: "chart-interactive-text-tool", list: "textList", taps: 1, grab: [0.3, 0.4] },
    /**
     * Cảnh báo giá cũng một cú gõ, nhưng cử chỉ đặt KHÔNG do thư viện cấp.
     *
     * `chart-interactive-y-coordinate-tool` chỉ vẽ những cảnh báo được đưa cho nó, cho kéo và
     * cho xoá — hết. Bản gốc khai một prop `onChoosePosition` cho nó rồi không chỗ nào gọi.
     * Nên trang trưng bày tự đặt lấy, bằng bốn dòng: đọc giá dưới con trỏ từ thang của pane
     * rồi thêm vào danh sách. Trước đây nút "Alert" arm một công cụ không làm được gì — bấm
     * xong không thấy gì, chạm cũng không thấy gì.
     *
     * Nó là đường ngang chạy hết bề rộng pane, nên gõ ở đâu trên đường ấy cũng trúng.
     */
    {
        label: "Alert",
        tag: "chart-interactive-y-coordinate-tool",
        list: "yCoordinateList",
        taps: 1,
        grab: [0.5, 0.4],
    },
    // Bốn công cụ vượt bản gốc (chart#5). Đường ngang của H-line chạy hết bề rộng pane
    // nên gõ đâu trên đúng y cũng trúng; ba công cụ kia nắm vào giữa thân hình.
    { label: "H-line", tag: "chart-axis-line", list: "lines", taps: 1, grab: [0.5, 0.4] },
    { label: "Rectangle", tag: "chart-shape-tool", list: "shapes", taps: 2, grab: [0.45, 0.475] },
    { label: "Measure", tag: "chart-measure", list: "measures", taps: 2, grab: [0.45, 0.475] },
    { label: "Position", tag: "chart-position-tool", list: "positions", taps: 1, grab: [0.35, 0.4] },
    // Ba cú gõ: cán rồi hai chân. Chỗ nắm nằm giữa cán — trên đường trung tuyến từ
    // (0.3, 0.4) về trung điểm của hai chân (0.65, 0.425).
    { label: "Pitchfork", tag: "chart-pitchfork", list: "forks", taps: 3, grab: [0.475, 0.412] },
    // Muc 0% cua fib extension nam ngang o y cua diem C (0.7, 0.3), chay sang phai.
    { label: "Fib ext", tag: "chart-fib-extension", list: "extensions", taps: 3, grab: [0.8, 0.3] },
    // Callout: tap 1 la mui neo (0.3, 0.4), tap 2 la hop chu (0.6, 0.55) — nam vao hop.
    { label: "Callout", tag: "chart-callout", list: "callouts", taps: 2, grab: [0.6, 0.55] },
    { label: "Price label", tag: "chart-price-label", list: "labels", taps: 1, grab: [0.3, 0.4] },
    // XABCD nam tap: doan X(0.3,0.4) -> A(0.6,0.55) di qua trung diem (0.45, 0.475).
    { label: "Pattern", tag: "chart-pattern", list: "patterns", taps: 5, grab: [0.45, 0.475] },
]

const touchToolTests = async (browser, origin) => {
    /**
     * Ngữ cảnh điện thoại thật, không phải desktop có thêm cảm ứng.
     *
     * Chuyện này tôi đã đo sai một lần: trong ngữ cảnh desktop, `Input.dispatchTouchEvent`
     * gửi được touch nhưng trình duyệt KHÔNG sinh ra chuỗi sự kiện chuột sau cú gõ — nên
     * `click` không tới, không đối tượng nào được đặt, và trông y như một lỗi của thư viện.
     * Cùng cú gõ ấy trong ngữ cảnh Pixel 7 thì đặt được. Bài này là bài về điện thoại, nên
     * nó phải chạy trong ngữ cảnh điện thoại.
     */
    const context = await browser.newContext({ ...devices["Pixel 7"] })
    const page = await context.newPage()
    const client = await context.newCDPSession(page)
    const touch = (type, points) =>
        client.send("Input.dispatchTouchEvent", { type, touchPoints: points.map(({ x, y }) => ({ x, y })) })

    const tap = async point => {
        await touch("touchStart", [point])
        await page.waitForTimeout(40)
        await touch("touchEnd", [])
        // Qua hẳn cửa sổ nhấp đúp: hai cú gõ gần nhau cùng chỗ là một cú nhấp đúp.
        await page.waitForTimeout(450)
    }

    const swipe = async (from, to, steps = 6) => {
        await touch("touchStart", [from])
        for (let step = 1; step <= steps; step++) {
            await touch("touchMove", [
                { x: from.x + ((to.x - from.x) * step) / steps, y: from.y + ((to.y - from.y) * step) / steps },
            ])
            await page.waitForTimeout(16)
        }
        await touch("touchEnd", [])
        await page.waitForTimeout(400)
    }

    const results = []

    for (const tool of TOUCH_TOOLS) {
        const checks = []
        const problems = []
        const onError = error => problems.push(error.stack ?? error.message)
        page.on("pageerror", onError)

        await page.goto(`${origin}/docs/showcase/drawing.html`)
        await page.waitForFunction(() => document.querySelectorAll("chart-canvas").length > 0)
        await page.waitForTimeout(700)

        // Chọn công cụ TRƯỚC khi đo toạ độ: bấm nút làm trang cuộn.
        await page.click(`section.demo .controls button:text-is("${tool.label}")`)
        const box = await page.evaluate(() => {
            const canvas = document.querySelector("chart-canvas")
            canvas.scrollIntoView({ block: "center" })
            const { left, top, width, height } = canvas.shadowRoot
                .querySelector("[data-event-capture]")
                .getBoundingClientRect()
            return { left, top, width, height }
        })
        await page.waitForTimeout(200)
        const at = (fx, fy) => ({ x: Math.round(box.left + box.width * fx), y: Math.round(box.top + box.height * fy) })

        // Ba điểm đặt, đủ cho công cụ cần tới ba cú gõ.
        const spots = [at(0.3, 0.4), at(0.6, 0.55), at(0.7, 0.3), at(0.45, 0.25), at(0.55, 0.5)]
        for (let index = 0; index < tool.taps; index++) await tap(spots[index])

        const placed = await page.evaluate(
            ([tag, list]) => JSON.stringify(document.querySelector(tag)[list]),
            [tool.tag, tool.list],
        )

        checks.push({
            label: "gõ để đặt: có đúng một đối tượng",
            pass: JSON.parse(placed).length === 1,
            expected: "1",
            actual: JSON.parse(placed).length,
        })

        // Tắt công cụ, rồi gõ vào chính đối tượng để chọn nó — đúng cử chỉ đã thiết kế.
        await page.click(`section.demo .controls button:text-is("${tool.label}")`)

        /**
         * Chỗ nắm do mỗi công cụ tự khai, vì mỗi công cụ vẽ ra một hình khác nhau.
         *
         * Đã thử hai cách tự suy và cả hai đều sai. Trung điểm của mấy chỗ vừa gõ: nhãn chữ
         * chỉ cần một cú gõ nên trung điểm rơi vào chỗ trống. Quét lưới rồi hỏi
         * `isHoverTest`: phần tử so `mouseXY` trong toạ độ của pane còn ngón tay chạm vào
         * toạ độ của khung bắt sự kiện, nên cái nó nhận và chỗ tay đặt xuống không cùng một
         * chỗ — bộ dò nói trúng mà thực tế trượt.
         *
         * Nên bỏ suy diễn: mỗi dòng khai chỗ nắm của mình, và trọng tài là hành vi thật —
         * "gõ vào đó thì đối tượng có được chọn không". Chỗ nắm sai thì bài đỏ, chứ không
         * âm thầm xanh.
         */
        const grab = at(tool.grab[0], tool.grab[1])
        await tap(grab)

        const selected = await page.evaluate(
            ([tag, list]) => document.querySelector(tag)[list].some(each => each.selected === true),
            [tool.tag, tool.list],
        )
        checks.push({ label: "gõ vào đối tượng thì nó được chọn", pass: selected, expected: "true", actual: selected })

        const domainBefore = await page.evaluate(() =>
            document.querySelector("chart-canvas").getState().xScale.domain().map(Number).join(),
        )

        const from = tool.dragGrab === undefined ? grab : at(tool.dragGrab[0], tool.dragGrab[1])
        await swipe(from, { x: from.x + 70, y: from.y + 50 })

        const [moved, domainAfter] = await page.evaluate(
            ([tag, list]) => [
                JSON.stringify(document.querySelector(tag)[list]),
                document.querySelector("chart-canvas").getState().xScale.domain().map(Number).join(),
            ],
            [tool.tag, tool.list],
        )

        checks.push({
            label: "kéo bằng ngón tay thì đối tượng đi theo",
            pass: moved !== placed,
            expected: "khác lúc vừa đặt",
            actual: moved === placed ? "y nguyên" : "đã đổi",
        })
        checks.push({
            label: "và khung nhìn đứng im, không pan theo",
            pass: domainAfter === domainBefore,
            expected: domainBefore,
            actual: domainAfter,
        })
        checks.push({
            label: "không có lỗi nào trong trang",
            pass: problems.length === 0,
            expected: "0",
            actual: problems.length ? `${problems.length} — ${problems[0].split("\n")[0]}` : "0",
        })

        page.off("pageerror", onError)
        results.push({ name: `ngón tay thật: ${tool.tag}`, checks })
    }

    /**
     * Brush: cử chỉ CHÍNH là cú kéo, không phải "đặt rồi kéo".
     *
     * Nên nó cũng không nằm trong bảng. Trên điện thoại đây là chỗ dễ hỏng nhất, vì một cú
     * kéo bằng ngón tay trên chart vốn có nghĩa là pan — brush phải giành được cú kéo ấy.
     */
    {
        const checks = []
        const problems = []
        const onError = error => problems.push(error.stack ?? error.message)
        page.on("pageerror", onError)

        await page.goto(`${origin}/docs/showcase/drawing.html`)
        await page.waitForFunction(() => document.querySelectorAll("chart-canvas").length > 1)
        await page.waitForTimeout(700)

        const box = await page.evaluate(() => {
            const canvas = document.querySelectorAll("chart-canvas")[1]
            canvas.scrollIntoView({ block: "center" })
            const { left, top, width, height } = canvas.shadowRoot
                .querySelector("[data-event-capture]")
                .getBoundingClientRect()
            return { left, top, width, height }
        })
        await page.waitForTimeout(200)

        await swipe(
            { x: Math.round(box.left + box.width * 0.25), y: Math.round(box.top + box.height * 0.3) },
            { x: Math.round(box.left + box.width * 0.7), y: Math.round(box.top + box.height * 0.65) },
        )

        const said = await page.evaluate(
            () => document.querySelectorAll("section.demo .readout")[1].textContent,
        )

        checks.push({
            label: "kéo một hộp bằng ngón tay thì brush báo hai mốc",
            pass: /\d{4}-\d{2}-\d{2} at \d/.test(said) && said.includes("→"),
            expected: "hai mốc có ngày và giá",
            actual: said,
        })
        checks.push({
            label: "không có lỗi nào trong trang",
            pass: problems.length === 0,
            expected: "0",
            actual: problems.length ? `${problems.length} — ${problems[0].split("\n")[0]}` : "0",
        })

        page.off("pageerror", onError)
        results.push({ name: "ngón tay thật: chart-brush", checks })
    }

    /**
     * Chụm hai ngón để zoom KHÔNG phải một cú bấm.
     *
     * Bài này canh chỗ mà chính phép sửa ở trên có thể phá. Cú bấm tự phát ở `touchend` được
     * thêm vào để brush chốt được cú quét; mà đường pinch không đặt `#panHappened`, nên nếu
     * chỉ hỏi "ngón tay có đi không" thì một cú chụm hai ngón cũng thành một cú bấm. Đo được
     * trước khi sửa: pinch khi đang bật công cụ Text đặt oan một nhãn — người dùng zoom một
     * cái là có thêm rác trên biểu đồ.
     *
     * Nên điều kiện là "một ngón từ đầu đến cuối, và mọi ngón đã rời ra".
     */
    {
        const checks = []
        const problems = []
        const onError = error => problems.push(error.stack ?? error.message)
        page.on("pageerror", onError)

        await page.goto(`${origin}/docs/showcase/drawing.html`)
        await page.waitForFunction(() => document.querySelectorAll("chart-canvas").length > 0)
        await page.waitForTimeout(700)

        await page.click(`section.demo .controls button:text-is("Text")`)
        const box = await page.evaluate(() => {
            const canvas = document.querySelector("chart-canvas")
            canvas.scrollIntoView({ block: "center" })
            const { left, top, width, height } = canvas.shadowRoot
                .querySelector("[data-event-capture]")
                .getBoundingClientRect()
            return { left, top, width, height }
        })
        await page.waitForTimeout(200)
        const at = (fx, fy) => ({ x: Math.round(box.left + box.width * fx), y: Math.round(box.top + box.height * fy) })

        const first = at(0.35, 0.4)
        const second = at(0.6, 0.6)

        await touch("touchStart", [first])
        await page.waitForTimeout(30)
        await touch("touchStart", [first, second])
        for (let step = 1; step <= 5; step++) {
            await touch("touchMove", [
                { x: first.x - step * 6, y: first.y },
                { x: second.x + step * 6, y: second.y },
            ])
            await page.waitForTimeout(20)
        }
        await touch("touchEnd", [])
        await page.waitForTimeout(600)

        const placed = await page.evaluate(
            () => document.querySelector("chart-interactive-text-tool").textList.length,
        )

        checks.push({
            label: "pinch khi đang bật công cụ thì KHÔNG đặt ra đối tượng nào",
            pass: placed === 0,
            expected: "0",
            actual: placed,
        })
        checks.push({
            label: "không có lỗi nào trong trang",
            pass: problems.length === 0,
            expected: "0",
            actual: problems.length ? `${problems.length} — ${problems[0].split("\n")[0]}` : "0",
        })

        page.off("pageerror", onError)
        results.push({ name: "ngón tay thật: pinch không phải một cú bấm", checks })
    }

    /**
     * Sau khi tay rời ra, biểu đồ phải ĐỨNG LẠI.
     *
     * Đây là bài kiểm cho cái đơ mà người dùng báo — "trình duyệt thường đơ khi xuất hiện
     * Click to select object". Chữ ấy chỉ là thứ đi kèm: cả nó và cái đơ đều cần một đối
     * tượng đã vẽ. Cái đơ là một vòng tự nuôi.
     *
     * Setter của `defineProperties` từng phát `propertyChanged` và hẹn redraw kể cả khi giá
     * trị y nguyên. Mà `propertyChanged` của công cụ vẽ là "dựng lại cây con", và dựng lại
     * thì ghi lại toàn bộ prop của con. Một cú chạm khiến `onSelect` của trang ghi lại danh
     * sách của cả bảy công cụ, và từ đó biểu đồ không bao giờ đứng lại: đo được 37 lần redraw
     * trong 3 giây sau khi tay đã rời ra, và không giảm khi chờ lâu hơn.
     *
     * Nên bài này đếm redraw trong 2,5 giây **sau** khi cú chạm đã xong. Ngưỡng 20 rộng gấp
     * đôi con số hiện tại (9) để không đỏ vì một khung hình lẻ, mà vẫn chặn xa dưới 37.
     */
    {
        const checks = []

        await page.goto(`${origin}/docs/showcase/drawing.html`)
        await page.waitForFunction(() => document.querySelectorAll("chart-canvas").length > 0)
        await page.waitForTimeout(700)

        await page.click(`section.demo .controls button:text-is("Trend line")`)
        const box = await page.evaluate(() => {
            const canvas = document.querySelector("chart-canvas")
            canvas.scrollIntoView({ block: "center" })
            const { left, top, width, height } = canvas.shadowRoot
                .querySelector("[data-event-capture]")
                .getBoundingClientRect()
            return { left, top, width, height }
        })
        await page.waitForTimeout(200)
        const at = (fx, fy) => ({ x: Math.round(box.left + box.width * fx), y: Math.round(box.top + box.height * fy) })

        const first = at(0.3, 0.4)
        const second = at(0.65, 0.6)
        await tap(first)
        await tap(second)

        // Tắt công cụ rồi bỏ chọn: đúng trạng thái người dùng đang ở khi chữ hiện ra.
        await page.click(`section.demo .controls button:text-is("Trend line")`)
        await tap(at(0.85, 0.85))

        await page.evaluate(() => {
            const canvas = document.querySelector("chart-canvas")
            window.__redraws = 0
            const redraw = canvas.redraw.bind(canvas)
            canvas.redraw = () => {
                window.__redraws++
                return redraw()
            }
        })

        await tap({ x: Math.round((first.x + second.x) / 2), y: Math.round((first.y + second.y) / 2) })
        await page.waitForTimeout(2500)

        const redraws = await page.evaluate(() => window.__redraws)

        checks.push({
            label: "tay rời ra rồi thì biểu đồ đứng lại, không vẽ lại mãi",
            pass: redraws < 20,
            expected: "< 20 lần redraw trong 2,5s",
            actual: redraws,
        })

        results.push({ name: "ngón tay thật: chạm xong thì biểu đồ đứng lại", checks })
    }

    await context.close()
    return results
}

/**
 * Mực của biểu đồ phải theo theme, và nút chuyển phải thật sự chuyển.
 *
 * Canvas không thừa kế CSS: mặc định của thư viện là `#000000`, trung thành với bản gốc và
 * đúng trên nền trắng — trên nền tối thì trục, nhãn trục và số trong tooltip biến mất. Người
 * dùng báo đúng chỗ ấy.
 *
 * Bài này đo bằng độ sáng của màu thật sự nằm trên phần tử, chứ không so chuỗi: chuỗi có thể
 * là `rgb(…)`, `#…`, hay `light-dark(…)` chưa phân giải — mà chính "chưa phân giải" là cái bẫy
 * đầu tiên tôi rơi vào, vì `getPropertyValue` trả về nguyên văn và canvas không hiểu.
 */
const themeTests = async (browser, origin) => {
    const checks = []

    const context = await browser.newContext({ viewport: { width: 1000, height: 800 }, colorScheme: "dark" })
    const page = await context.newPage()

    await page.goto(`${origin}/docs/showcase/index.html`)
    await page.waitForFunction(() => document.querySelectorAll("chart-canvas").length > 0)
    await page.waitForTimeout(900)

    /** Trung bình ba kênh của màu đang nằm trên trục. 0 là đen, 255 là trắng. */
    const inkBrightness = () =>
        page.evaluate(() => {
            const value = document.querySelector("chart-y-axis").tickLabelFill
            const parts = String(value).match(/\d+/g)
            if (parts === null || parts.length < 3) return null
            return (Number(parts[0]) + Number(parts[1]) + Number(parts[2])) / 3
        })

    const dark = await inkBrightness()
    checks.push({
        label: "nền tối thì mực của trục phải sáng",
        pass: dark !== null && dark > 150,
        expected: "> 150",
        actual: dark,
    })

    const tooltipInk = await page.evaluate(() => document.querySelector("chart-ohlc-tooltip")?.textFill ?? null)
    checks.push({
        label: "số trong tooltip cũng đổi theo, không chỉ trục",
        pass: tooltipInk !== null && !/#000|rgb\(0, 0, 0\)/.test(tooltipInk),
        expected: "khác đen",
        actual: tooltipInk,
    })

    // Nút chuyển: hệ → sáng. Mực phải tối lại ngay, không cần tải lại trang.
    await page.click("button.theme")
    await page.waitForTimeout(400)

    const light = await inkBrightness()
    checks.push({
        label: "bấm sang chế độ sáng thì mực tối lại ngay",
        pass: light !== null && light < 80,
        expected: "< 80",
        actual: light,
    })
    checks.push({
        label: "và nút nói ra nó đang ở chế độ nào",
        pass: (await page.evaluate(() => document.querySelector("button.theme").textContent)).includes("Light"),
        expected: "Light",
        actual: await page.evaluate(() => document.querySelector("button.theme").textContent),
    })

    // Chọn xong thì tải lại trang vẫn giữ, kể cả khi hệ điều hành đang để tối.
    await page.reload()
    await page.waitForFunction(() => document.querySelectorAll("chart-canvas").length > 0)
    await page.waitForTimeout(900)

    checks.push({
        label: "tải lại trang thì vẫn nhớ lựa chọn",
        pass: (await inkBrightness()) < 80,
        expected: "< 80",
        actual: await inkBrightness(),
    })

    await context.close()
    return { name: "trưng bày: mực của biểu đồ theo theme", checks }
}

await page.goto(`${origin}/tools/browser/harness.html`)
await page.waitForFunction(() => window.chartReady === true, null, { timeout: 15000 })

const results = await page.evaluate(() => window.runChartTests())

results.push(...(await runShowcaseTests(page, origin)))
results.push(...(await touchToolTests(browser, origin)))
results.push(await themeTests(browser, origin))

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
