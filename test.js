/**
 * So bản port với golden data sinh từ mã nguồn bản gốc.
 *
 *   npm test
 *
 * Không cần repo gốc — fixture đã commit. Cùng một file case chạy cho cả hai phía nên
 * chênh lệch duy nhất có thể xảy ra là chênh lệch kết quả, đúng thứ cần đo.
 */

import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { normalize } from "./tools/golden/serialize.mjs"

if (process.env.TZ !== "UTC") {
    console.error("Phải chạy với TZ=UTC. Dùng `npm test`.")
    process.exit(1)
}

const here = dirname(fileURLToPath(import.meta.url))

/**
 * Bộ nào phải chạy một mình thì ghi ở đây — xem `tools/golden/cases/locale.mjs`.
 * `setLocale` đổi trạng thái toàn cục của tiến trình, nên nó được chạy trong tiến trình
 * con của chính file này.
 */
const ISOLATED = {
    locale: async () => [
        await import("./tools/golden/cases/locale.mjs"),
        await import("./src/scales/index.js"),
    ],
}

const only = process.env.GOLDEN_SUITE

const everySuite = [
    [await import("./tools/golden/cases/scales.mjs"), await import("./src/scales/index.js")],
    [await import("./tools/golden/cases/utils.mjs"), await import("./src/core/utils/index.js")],
    [
        await import("./tools/golden/cases/chartdata.mjs"),
        {
            ...(await import("./src/core/utils/ChartDataUtil.js")),
            ...(await import("./src/core/zoom/zoomBehavior.js")),
            evaluator: (await import("./src/core/utils/evaluator.js")).default,
        },
    ],
    [
        await import("./tools/golden/cases/draw.mjs"),
        {
            ...(await import("./src/series/index.js")),
            ...(await import("./src/axes/index.js")),
            ...(await import("./src/axes/AxisZoomCapture.js")),
            ...(await import("./src/coordinates/index.js")),
            ...(await import("./src/tooltip/index.js")),
            ...(await import("./src/annotations/index.js")),
        },
    ],
    [
        await import("./tools/golden/cases/indicators.mjs"),
        await import("./src/indicators/index.js"),
    ],
    [
        await import("./tools/golden/cases/interactive.mjs"),
        await (async () => {
            const text = await import("./src/interactive/components/InteractiveText.js")
            const closeIcon = await import("./src/interactive/components/ClickableShape.js")
            const alert = await import("./src/interactive/components/InteractiveYCoordinate.js")

            return {
                ...(await import("./src/interactive/utils.js")),
                ...(await import("./src/interactive/components/InteractiveStraightLine.js")),
                ...(await import("./src/interactive/components/ChannelWithArea.js")),
                ...(await import("./src/interactive/components/LinearRegressionChannelWithArea.js")),
                ...(await import("./src/interactive/components/GannFan.js")),
                ...(await import("./src/interactive/ZoomButtons.js")),

                fibRetracementLines: (await import("./src/interactive/wrapper/EachFibRetracement.js")).fibLines,

                // Ba thứ dưới đây nhớ kết quả đo giữa lần vẽ và lần hỏi hover. Bản gốc
                // nhớ trong chính thực thể component; bản port nhớ trong một `cache` mà
                // phần tử giữ. Ba dòng này chỉ nối lại đúng cặp ấy — không có logic nào.
                textDrawThenHover: (context, drawMoreProps, hoverMoreProps, props) => {
                    const cache = {}
                    text.drawInteractiveText(context, drawMoreProps, props, cache)
                    return text.isTextHover(props, hoverMoreProps, cache.textWidth)
                },
                closeIconDrawThenHover: (context, drawMoreProps, hoverMoreProps, props) => {
                    const cache = {}
                    closeIcon.drawClickableShape(context, drawMoreProps, props, cache)
                    return closeIcon.isCloseIconHover(cache.closeIcon, props.textBox, hoverMoreProps.mouseXY)
                },
                yCoordinateDrawThenHover: (context, drawMoreProps, hoverMoreProps, props) => {
                    const cache = {}
                    alert.drawInteractiveYCoordinate(context, drawMoreProps, props, cache)
                    return alert.isInteractiveYCoordinateHover(props, hoverMoreProps, cache.width ?? 0)
                },
            }
        })(),
    ],
    [
        await import("./tools/golden/cases/svg.mjs"),
        {
            ...(await import("./src/tooltip/index.js")),
            ...(await import("./src/annotations/index.js")),
        },
    ],
]

const suites = only ? [await ISOLATED[only]()] : everySuite

/** Mọi chỗ lệch, kèm đường dẫn tới đúng ô sai — không dừng ở chỗ đầu tiên. */
const differences = (expected, actual, path = "") => {
    const found = []
    const at = key => (path ? `${path}.${key}` : key)

    if (Array.isArray(expected) || Array.isArray(actual)) {
        if (!Array.isArray(expected) || !Array.isArray(actual)) {
            return [{ path, expected, actual }]
        }
        if (expected.length !== actual.length) {
            found.push({ path: `${path}.length`, expected: expected.length, actual: actual.length })
        }
        for (let i = 0; i < Math.max(expected.length, actual.length); i++) {
            found.push(...differences(expected[i], actual[i], `${path}[${i}]`))
        }
        return found
    }

    const isObject = value => value !== null && typeof value === "object"
    if (isObject(expected) && isObject(actual)) {
        for (const key of new Set([...Object.keys(expected), ...Object.keys(actual)])) {
            found.push(...differences(expected[key], actual[key], at(key)))
        }
        return found
    }

    if (!Object.is(expected, actual)) found.push({ path, expected, actual })
    return found
}

/** Số ô lá, để "0 chỗ lệch" không thể là do không kiểm gì cả. */
const countLeaves = value => {
    if (Array.isArray(value)) return value.reduce((total, item) => total + countLeaves(item), 0)
    if (value !== null && typeof value === "object") {
        return Object.values(value).reduce((total, item) => total + countLeaves(item), 0)
    }
    return 1
}

let failed = 0
let checked = 0
let onPurposeTotal = 0

/**
 * Chỗ lệch ĐÃ KHAI BÁO.
 *
 * Bản port sửa vài chỗ bản gốc làm sai — xem bảng "lệch có chủ ý" trong `docs/parity/`.
 * Sửa xong thì chuỗi lệnh canvas không còn khớp fixture nữa, mà fixture là **bản gốc**
 * chạy thật, nên nó không được sinh lại cho vừa ý bản port: làm thế là mất luôn thứ duy
 * nhất nói được bản gốc vốn vẽ gì.
 *
 * Nên mỗi bộ được phép khai báo `deviations`: tên case → lý do. Hai chiều đều bị canh.
 * Lệch ở case KHÔNG khai báo là đỏ, như trước. Và case đã khai báo mà **hết lệch** cũng
 * là đỏ — nghĩa là bản sửa đã bị ai đó gỡ mất, hoặc lời khai báo đã hết hạn, và cả hai
 * đều phải nói ra chứ không được lặng lẽ trôi qua.
 */
const caseOf = path => path.match(/^[^.[]+/)?.[0]

for (const [suite, port] of suites) {
    const fixture = JSON.parse(readFileSync(join(here, "tools/golden/fixtures", `${suite.name}.json`), "utf8"))
    const expected = fixture.result
    const actual = normalize(suite.run(port))

    const leaves = countLeaves(expected)
    if (leaves === 0) {
        console.error(`✗ ${suite.name}: fixture rỗng — bài kiểm không kiểm gì cả`)
        failed++
        continue
    }
    checked += leaves

    const declared = suite.deviations ?? {}
    const everyDifference = differences(expected, actual)

    const wrong = everyDifference.filter(one => declared[caseOf(one.path)] === undefined)
    const onPurpose = new Set(everyDifference.map(one => caseOf(one.path)).filter(name => declared[name]))

    onPurposeTotal += everyDifference.length - wrong.length

    const stale = Object.keys(declared).filter(name => !onPurpose.has(name))
    if (stale.length > 0) {
        failed++
        console.error(`✗ ${suite.name}: khai báo lệch có chủ ý nhưng không lệch: ${stale.join(", ")}`)
        for (const name of stale) console.error(`    ${name}: ${declared[name]}`)
    }

    if (wrong.length === 0 && stale.length === 0) {
        const matched = leaves - everyDifference.length
        const note = onPurpose.size === 0 ? "" : ` · ${onPurpose.size} case lệch có chủ ý`
        console.log(`✓ ${suite.name}: ${matched} giá trị khớp bản gốc @ ${fixture.source.commit}${note}`)
        continue
    }

    if (wrong.length === 0) continue

    failed++
    console.error(`✗ ${suite.name}: ${wrong.length}/${leaves} giá trị lệch`)
    for (const { path, expected: want, actual: got } of wrong.slice(0, 25)) {
        console.error(`    ${path}\n      gốc:  ${JSON.stringify(want)}\n      port: ${JSON.stringify(got)}`)
    }
    if (wrong.length > 25) console.error(`    … còn ${wrong.length - 25} chỗ nữa`)
}

/**
 * Tài liệu tham chiếu phải khớp mã.
 *
 * `docs/reference/elements.md` được sinh ra từ `src/`. Nếu ai đổi một mặc định mà quên
 * chạy lại, bảng ấy nói sai — mà một bảng nói sai còn tệ hơn không có bảng, vì người đọc
 * tin nó. Nên chỗ này sinh lại rồi so với file đã commit.
 */
const { reference } = await import("./tools/docs/elements.mjs")
const referencePath = join(here, "docs/reference/elements.md")
/**
 * So sánh bỏ qua kiểu xuống dòng: checkout trên Windows viết file thành CRLF
 * còn generator sinh LF — khác biệt đó là của git autocrlf, không phải của
 * tài liệu, và từng làm bài này đỏ giả sau mỗi lần checkout.
 */
const committed = readFileSync(referencePath, "utf8").replaceAll("\r\n", "\n")
const current = await reference()

if (committed === current) {
    console.log(`✓ docs/reference/elements.md khớp mã nguồn`)
} else {
    failed++
    console.error(`✗ docs/reference/elements.md đã cũ — chạy \`npm run docs:reference\``)
}

/**
 * Calculator vượt ra ngoài bản gốc không có golden — chúng được so với
 * số tính TAY theo luật chuẩn, và bộ kiểm này phải biết fail.
 */
{
    // LUẬT SHOWCASE (chủ repo, 2026-08-16): mọi tính năng phải có mặt trong
    // https://akaoio.github.io/chart/ để test bằng mắt. Cổng này đếm: element
    // CÔNG KHAI nào định nghĩa trong src mà không xuất hiện ở docs/showcase là
    // đỏ. Tầng ruột được miễn — wrapper (chart-each-*) và leaf
    // (chart-interactive-*) lên màn hình khi demo TOOL cha; hạ tầng trỏ chuột/
    // tay cầm cũng vậy.
    const { readFileSync, readdirSync } = await import("node:fs")
    const walk = (dir, out = []) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            if (entry.isDirectory()) walk(`${dir}/${entry.name}`, out)
            else if (entry.name.endsWith(".js")) out.push(`${dir}/${entry.name}`)
        }
        return out
    }
    const INTERNAL = new Set([
        "chart-clickable-circle", "chart-clickable-shape", "chart-hover-text",
        "chart-mouse-location-indicator", "chart-axis-zoom-capture",
        "chart-channel-with-area", "chart-linear-regression-channel", "chart-gann-fan",
        "chart-interactive-label", "chart-interactive-straight-line",
    ])
    const internal = tag => tag.startsWith("chart-each-") || tag.startsWith("chart-interactive-") || INTERNAL.has(tag)
    const defined = new Set()
    for (const file of walk("./src")) for (const m of readFileSync(file, "utf8").matchAll(/define\("(chart-[a-z-]+)"/g)) defined.add(m[1])
    const shown = new Set()
    for (const file of walk("./docs/showcase")) {
        const text = readFileSync(file, "utf8")
        for (const m of text.matchAll(/"(chart-[a-z-]+)"/g)) shown.add(m[1])
        for (const m of text.matchAll(/<(chart-[a-z-]+)/g)) shown.add(m[1])
    }
    const missing = [...defined].filter(tag => !shown.has(tag) && !internal(tag)).sort()
    if (missing.length === 0) {
        checked += 1
        console.log(`✓ showcase phủ đủ bề mặt công khai (${[...defined].filter(t => !internal(t)).length} element)`)
    } else {
        failed++
        console.error(`✗ ${missing.length} element công khai vắng mặt showcase: ${missing.join(", ")}`)
    }
}

{
    /**
     * Không chú thích nào được trích nguyên văn cái chuỗi mà kho akao ĐẾM.
     *
     * Cổng `check:drawn-icons` bên akao đọc thẳng `src/interactive` của gói này mỗi lượt
     * chạy và suy ra icon phải vẽ mấy vành bằng một biểu thức chính quy trên VĂN BẢN THÔ:
     * nó đếm số lời gọi `createElement` dựng một `chart-clickable-circle` trong wrapper.
     * Biểu thức ấy không che chú thích. Nên một câu giải thích trích đúng chuỗi làm số đếm
     * cao hơn số tay cầm thật, và akao vẽ thừa vành — ở kho BÊN KIA, sau khi ai đó nâng
     * lock, lúc không còn ai nhìn hai tệp cạnh nhau. Triệu chứng sẽ là "cổng đòi 2 vành",
     * không phải "chú thích có chuỗi trùng".
     *
     * Đã xảy ra thật (chart#34): `EachSticker.js` giải thích chính giao ước ấy bằng cách
     * trích nguyên văn, và thành tệp DUY NHẤT trong 31 wrapper có phép đếm thô (2) khác
     * phép đếm thật (1). Chú thích càng viết đúng thì càng dễ gây lỗi, vì viết đúng nghĩa
     * là trích nguyên văn.
     *
     * Đây là mặt NGƯỢC của một lớp lỗi kho akao đã trả giá: ở đó một chuỗi nằm trong chú
     * thích làm mù bộ quét; ở đây một chuỗi nằm trong chú thích làm bộ quét đếm thừa.
     *
     * Nên chỗ này đếm hai lần — thô, rồi sau khi che chú thích — và bắt hai số bằng nhau.
     * Phép che thô sơ (khối bắt đầu bằng dấu sao và dòng bắt đầu bằng hai gạch chéo) là đủ
     * cho một câu hỏi hẹp: token ấy nằm ở đâu. Nó không phải một bộ phân tích JavaScript và
     * không cần phải là. Cổng này CHỈ vá được phía gói; phía akao che chú thích trước khi
     * đếm mới là chữa gốc, và đó là việc của kho bên kia.
     *
     * Giới hạn đã biết, ghi ra chứ chưa sửa: phép che cắt từ hai gạch chéo tới hết dòng KỂ
     * CẢ khi chúng nằm trong một chuỗi — một URL trong tệp có tay cầm sẽ che nhầm phần còn
     * lại của dòng. Nó hỏng theo chiều AN TOÀN: che quá tay làm số "thật" tụt xuống, hai số
     * lệch, và cổng ĐỎ chứ không xanh. `src/interactive` hôm nay không có URL nào, nên rủi
     * ro là tiềm tàng chứ chưa sống. Ngày nào nó sống thì đấy là lúc viết một bộ che tử tế,
     * không phải hôm nay.
     */
    const { readFileSync, readdirSync } = await import("node:fs")
    const walk = (dir, out = []) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            if (entry.isDirectory()) walk(`${dir}/${entry.name}`, out)
            else if (entry.name.endsWith(".js")) out.push(`${dir}/${entry.name}`)
        }
        return out
    }
    const handleToken = /createElement\("chart-clickable-circle"\)/g
    const withoutComments = text => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")

    const files = walk("./src/interactive")
    const skewed = []
    let handles = 0

    for (const file of files) {
        const text = readFileSync(file, "utf8")
        const scanned = (text.match(handleToken) ?? []).length
        const real = (withoutComments(text).match(handleToken) ?? []).length
        handles += real
        if (scanned !== real) skewed.push(`${file} (bộ quét đếm ${scanned}, thật ${real})`)
    }

    if (skewed.length === 0) {
        checked += 1
        console.log(`✓ token tay cầm chỉ nằm trong mã, không trong chú thích (${handles} lời gọi thật)`)
    } else {
        failed++
        console.error(`✗ ${skewed.length} tệp làm cổng đếm icon của akao lệch: ${skewed.join(", ")}`)
    }
}

{
    const { drawSessionProfileSeries, periodLetter } = await import("./src/series/SessionProfileSeries.js")
    // Hai ngày, mỗi ngày hai bar 30 phút; trục tay như bài footprint.
    const xScale = value => value * 10
    const yScale = value => (100 - value) * 10
    yScale.invert = pixel => 100 - pixel / 10
    const day1 = new Date(2026, 0, 5, 0, 0)
    const day1b = new Date(2026, 0, 5, 0, 30)
    const day2 = new Date(2026, 0, 6, 0, 0)
    const plotData = [
        { x: 1, date: day1, footprint: [{ price: 99.5, buy: 3, sell: 1 }] },
        { x: 2, date: day1b, footprint: [{ price: 99.5, buy: 0, sell: 4 }, { price: 99.6, buy: 2, sell: 0 }] },
        { x: 5, date: day2, footprint: [{ price: 98.0, buy: 1, sell: 1 }] },
    ]
    const rects = []
    const context = new Proxy({}, { get: (target, key) => (key === "fillRect" ? (...args) => rects.push(args.map(n => Math.round(n * 100) / 100)) : () => {}), set: () => true })
    const moreProps = { xAccessor: d => d.x, xScale, chartConfig: { yScale }, plotData }

    // VOLUME: phiên 1 có hai mức — 99.5 tổng 8 (max), 99.6 tổng 2; phiên 2 một mức.
    // maxWidth phiên 1 = (x2−x1=10px)×40% = 8? (right−left)=10 → 4… tính: (20−10)×0.4 = 4 → max(8,4)=8.
    // 99.5: total 8/8×8 = 8px, buy 3/8 → 3px; 99.6: 2/8×8 = 2px, buy 2/2 → 2px. Phiên 2: (50−50)×0.4→max(8,0)=8; total 8, buy 4.
    drawSessionProfileSeries(context, moreProps, { mode: "volume" })
    const volumeOk =
        rects.length === 6 &&
        rects[0][2] === 3 && rects[1][2] === 5 && // 99.5: buy 3 + sell 5
        rects[2][2] === 2 && rects[3][2] === 0 && // 99.6: buy 2 + sell 0
        rects[4][2] === 4 && rects[5][2] === 4    // ngày 2: buy 4 + sell 4
    // TPO: 99.5 chạm kỳ A (0) và B (1) → 2 khối; 99.6 chỉ kỳ B → 1 khối; ngày 2 mức 98 kỳ A → 1 khối.
    rects.length = 0
    drawSessionProfileSeries(context, moreProps, { mode: "tpo" })
    const tpoOk = rects.length === 4
    const letterOk = periodLetter(0) === "A" && periodLetter(1) === "B" && periodLetter(26) === "a" && periodLetter(52) === "A'"

    // Pan-bất-biến (#review): bar đầu TRONG KHUNG NHÌN lúc 01:00 — kỳ phải neo
    // vào 00:00 của ngày (kỳ 2 với 30m), không phải vào bar đầu (kỳ 0).
    const letters = []
    const letterContext = new Proxy({}, { get: (target, key) => (key === "fillText" ? text => letters.push(text) : key === "fillRect" ? () => {} : () => {}), set: () => true })
    drawSessionProfileSeries(
        letterContext,
        { xAccessor: d => d.x, xScale, chartConfig: { yScale }, plotData: [{ x: 1, date: new Date(2026, 0, 7, 1, 0), footprint: [{ price: 99.5, buy: 1, sell: 0 }, { price: 98.5, buy: 1, sell: 0 }] }] },
        { mode: "tpo", minLetterWidth: 0 },
    )
    const panOk = letters.length === 2 && letters.every(letter => letter === "C")

    // IEEE epsilon (#review vòng 2): maxWidth=12.4, 3 kỳ → w=4.1333…, khối cuối
    // tính (at+1)×w = 12.400000000000002 > 12.4 — so mép TRÁI + epsilon thì đủ 3 khối.
    const fitRects = []
    const fitContext = new Proxy({}, { get: (target, key) => (key === "fillRect" ? (...args) => fitRects.push(args) : () => {}), set: () => true })
    drawSessionProfileSeries(
        fitContext,
        { xAccessor: d => d.x, xScale: v => v, chartConfig: { yScale }, plotData: [
            { x: 0, date: new Date(2026, 0, 9, 0, 0), footprint: [{ price: 99.5, buy: 1, sell: 0 }] },
            { x: 31, date: new Date(2026, 0, 9, 0, 30), footprint: [{ price: 99.5, buy: 1, sell: 0 }] },
            { x: 62, date: new Date(2026, 0, 9, 1, 0), footprint: [{ price: 99.5, buy: 1, sell: 0 }] },
        ] },
        { mode: "tpo", maxWidthPercent: 20 }, // span 62px × 20% = 12.4 → w = 12.4/3
    )
    const fitOk = fitRects.length === 3

    // Datum không date: bị bỏ qua êm, không TypeError giết cả pass vẽ (#review)
    let survived = true
    try {
        drawSessionProfileSeries(letterContext, { xAccessor: d => d.x, xScale, chartConfig: { yScale }, plotData: [{ x: 9 }, { x: 10, date: new Date(2026, 0, 8), footprint: [{ price: 98, buy: 1, sell: 0 }] }] }, { mode: "volume" })
    } catch {
        survived = false
    }
    if (volumeOk && tpoOk && letterOk && panOk && survived && fitOk) {
        checked += 6
        console.log("✓ session profile: volume + TPO + chữ kỳ + neo-ngày bất biến pan + datum không date — khớp số tính tay")
    } else {
        failed++
        console.error(`✗ session profile lệch (volume ${volumeOk}, tpo ${tpoOk} [${rects.length}], letter ${letterOk}, pan ${panOk} [${letters}], dateless ${survived}, fit ${fitOk} [${fitRects.length}])`)
    }
}

{
    const { drawFootprintSeries } = await import("./src/series/FootprintSeries.js")
    // Sân khấu tay: trục x đồng nhất ×10, trục y lật (giá 100 → pixel 0, giá 99 → 10).
    const xScale = value => value * 10
    const yScale = value => (100 - value) * 10
    yScale.invert = pixel => 100 - pixel / 10
    const datum = {
        x: 5,
        footprint: [
            { price: 99.5, buy: 4, sell: 2 }, // phía lớn nhất của bar = 4
            { price: 99.6, buy: 1, sell: 3 },
        ],
    }
    const rects = []
    const context = new Proxy({}, { get: (target, key) => (key === "fillRect" ? (...args) => rects.push(args.map(n => Math.round(n * 100) / 100)) : () => {}), set: () => true })
    drawFootprintSeries(context, { xAccessor: d => d.x, xScale, chartConfig: { yScale }, plotData: [datum] }, { width: 20, widthRatio: 1 })
    // Tay: centre = 50, half = 10; step = 0.1 → ô cao |Δy| − 1 = 0 → minCellHeight 2 thắng.
    // Ô 99.5: buy 4/4 → rộng 10 mọc trái từ 50; sell 2/4 → rộng 5 mọc phải.
    // Ô 99.6: buy 1/4 → 2.5; sell 3/4 → 7.5.
    const widths = rects.map(([, , w]) => w)
    const expected = [10, 5, 2.5, 7.5]
    const anchoredLeft = rects.length === 4 && rects[0][0] === 40 && rects[1][0] === 50 && rects[2][0] === 47.5 && rects[3][0] === 50
    if (rects.length === 4 && JSON.stringify(widths) === JSON.stringify(expected) && anchoredLeft) {
        checked += 4
        console.log("✓ footprint: 4 nửa-ô khớp số tính tay (mọc từ trục giữa, chia theo phía lớn nhất)")
    } else {
        failed++
        console.error(`✗ footprint lệch: ${JSON.stringify(rects)}`)
    }
}

{
    const { default: lineBreak } = await import("./src/indicators/calculator/lineBreak.js")
    const day = index => new Date(2026, 0, index + 1)
    const bar = (index, close) => ({ date: day(index), open: close, high: close, low: close, close, volume: 10 })

    // Chuỗi tăng 10→13 rồi 12.5, 10.5, 9. Vạch: (9→10)(10→11)(11→12)(12→13);
    // 12.5 không vượt gì — không vạch; 10.5 dưới đáy HAI vạch cuối (11) nhưng
    // trên đáy BA vạch cuối (10) — count 3 không đảo, count khác là lệch ngay;
    // 9 < đáy 3 vạch cuối → vạch đảo từ chân vạch cuối (12) xuống 9.
    const seed = { date: day(0), open: 9, high: 10, low: 9, close: 10, volume: 10 }
    const lines = lineBreak().count(3)([seed, bar(1, 11), bar(2, 12), bar(3, 13), bar(4, 12.5), bar(5, 10.5), bar(6, 9)])
    const expected = [
        [9, 10],
        [10, 11],
        [11, 12],
        [12, 13],
        [12, 9],
    ]
    const got = lines.map(line => [line.open, line.close])
    if (JSON.stringify(got) === JSON.stringify(expected) && lines[4].volume === 30) {
        checked += expected.length
        console.log(`✓ lineBreak: ${expected.length} vạch khớp số tính tay`)
    } else {
        failed++
        console.error(`✗ lineBreak lệch: ${JSON.stringify(got)} (volume đảo: ${lines[4]?.volume})`)
    }
}

{
    const { default: rangeBars } = await import("./src/indicators/calculator/rangeBars.js")
    const day = index => new Date(2026, 0, index + 1)
    const tick = (index, close, volume = 10) => ({ date: day(index), close, volume })

    // range 2, đi từ 100: 100→105 sinh (100→102)(102→104), dư 1; 105→99 đi xuống
    // từ gốc 104: sinh (104→102)(102→100), dư 1. Volume 10 chia đôi mỗi cây 2 thanh.
    const bars = rangeBars().range(2)([tick(0, 100), tick(1, 105), tick(2, 99)])
    const expected = [
        [100, 102],
        [102, 104],
        [104, 102],
        [102, 100],
    ]
    const got = bars.map(each => [each.open, each.close])
    if (JSON.stringify(got) === JSON.stringify(expected) && bars[0].volume === 5 && bars[2].volume === 5) {
        checked += expected.length
        console.log(`✓ rangeBars: ${expected.length} thanh khớp số tính tay`)
    } else {
        failed++
        console.error(`✗ rangeBars lệch: ${JSON.stringify(got)} (volume: ${bars.map(each => each.volume)})`)
    }
}

{
    /**
     * chart#34: hình học của họ hình khối, dự phóng và gốc chiếu fib-time.
     *
     * Ba thứ này không có bản gốc để so, nhưng chúng là số học thuần — nên chúng
     * được so với số tính TAY, ở đây, chứ không chỉ được nhìn bằng mắt trong
     * trình duyệt. Trục tay: x nhân 10, y lật quanh 100 rồi nhân 10.
     */
    const { curveOutline } = await import("./src/interactive/components/InteractiveCurve.js")
    const { projectionLeg } = await import("./src/interactive/components/InteractiveProjection.js")
    const { cycleLines } = await import("./src/interactive/components/InteractiveCycles.js")

    const xScale = value => value * 10
    const yScale = value => (100 - value) * 10
    yScale.invert = pixel => 100 - pixel / 10
    xScale.domain = () => [0, 100]
    const moreProps = { xScale, chartConfig: { yScale, height: 400 } }

    // `null` cho chỗ không có điểm: khi một nhánh hình học biến mất, danh sách mẫu ngắn
    // lại và phép so phải NÓI ra điều đó, không được nổ giữa chừng — một cú nổ cũng là
    // đỏ, nhưng nó không nói cho người đọc biết cái gì đã lệch.
    const round = points =>
        points.map(point => (point === undefined ? null : [Math.round(point[0] * 100) / 100, Math.round(point[1] * 100) / 100]))
    const problems = []
    const expect = (what, got, want) => {
        if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${what}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`)
    }

    const three = [
        [0, 0],
        [10, 10],
        [20, 0],
    ]

    // CUNG qua ba điểm (0,1000) (100,900) (200,1000) trong pixel: tâm nằm trên trục
    // đối xứng x=100, nên mẫu giữa của tám đoạn phải rơi ĐÚNG vào điểm thứ hai.
    // Bỏ nhánh arc thì mẫu giữa thành trung điểm dây cung (100, 1000) — lệch 100px.
    const arc = curveOutline({ points: three, mode: "arc", samples: 8 }, moreProps)
    expect("cung: số mẫu", arc.length, 9)
    expect("cung: hai đầu", round([arc[0], arc[8]]), [[0, 1000], [200, 1000]])
    expect("cung: đi qua điểm giữa", round([arc[4]]), [[100, 900]])

    // Ba điểm THẲNG HÀNG không có đường tròn nào — hạ về đoạn thẳng, không NaN.
    // Không có nhánh này thì `d → 0`, toạ độ thành NaN, và canvas nuốt NaN trong im lặng.
    const flat = curveOutline({ points: [[0, 0], [10, 0], [20, 0]], mode: "arc", samples: 8 }, moreProps)
    expect("cung suy biến thành đoạn thẳng", round(flat), [[0, 1000], [100, 1000], [200, 1000]])

    // Bézier bậc hai tại t=0.5 là (p0 + 2c + p2)/4 → y = (1000 + 1800 + 1000)/4 = 950
    const quadratic = curveOutline({ points: three, mode: "quadratic", samples: 2 }, moreProps)
    expect("Bézier bậc hai giữa đường", round([quadratic[1]]), [[100, 950]])

    // Bézier bậc ba tại t=0.5 là (p0 + 3c1 + 3c2 + p3)/8 → y = (1000+2700+2700+1000)/8 = 925
    const cubic = curveOutline(
        { points: [[0, 0], [10, 10], [20, 10], [30, 0]], mode: "cubic", samples: 2 },
        moreProps,
    )
    expect("Bézier bậc ba giữa đường", round([cubic[1]]), [[150, 925]])

    // Chưa đủ neo cho mode thì hạ về đường gấp khúc — đó chính là hình tạm lúc đang đặt
    expect(
        "cubic mới hai neo là đường gấp khúc",
        round(curveOutline({ points: [[0, 0], [10, 10]], mode: "cubic", samples: 8 }, moreProps)),
        [[0, 1000], [100, 900]],
    )

    // DỰ PHÓNG: forecast nối tiếp chân nền tới neo ba; projection chép vector nền sang neo ba
    const anchors = [
        [10, 100],
        [20, 120],
        [40, 90],
    ]
    expect("forecast", projectionLeg("forecast", anchors), { from: [20, 120], to: [40, 90] })
    expect("projection", projectionLeg("projection", anchors), { from: [40, 90], to: [50, 110] })

    // GỐC CHIẾU của fib time: đơn vị là x2−x1 = 4, chiếu từ x3 = 50 → 50, 54, 58
    const ratios = [0, 1, 2]
    const projected = cycleLines({ x1Value: 10, x2Value: 14, x3Value: 50, offsets: ratios }, moreProps)
    expect("fib time chiếu từ neo ba", projected.map(line => line.x), [500, 540, 580])
    // Vắng x3Value thì gốc chiếu là neo đầu — hành vi cũ của fib time zone, không đổi
    const zoned = cycleLines({ x1Value: 10, x2Value: 14, offsets: ratios }, moreProps)
    expect("vắng neo ba thì chiếu từ neo đầu", zoned.map(line => line.x), [100, 140, 180])

    if (problems.length === 0) {
        checked += 11
        console.log(`✓ chart#34: cung/Bézier/dự phóng/gốc-chiếu — 11 phép so khớp số tính tay`)
    } else {
        failed++
        console.error(`✗ chart#34 hình học lệch: ${problems.join(" · ")}`)
    }
}

{
    /**
     * chart#34: ghost feed giữ đúng những bước giá của dải nguồn, và TẤT ĐỊNH.
     *
     * `Math.random()` ở đây làm bóng nhấp nháy mỗi lần vẽ lại — nên hai điều được
     * so bằng số: cùng neo thì cùng bóng, và tập các bước mở→đóng của bóng đúng là
     * tập của dải nguồn, chỉ khác thứ tự. Không có số nào bịa ra từ hư không.
     */
    const { barsPatternCandles } = await import("./src/interactive/components/InteractiveBarsPattern.js")

    const xScale = value => value * 10
    const yScale = value => (100 - value) * 10
    yScale.invert = pixel => 100 - pixel / 10
    const fullData = [
        { x: 0, open: 100, close: 102, high: 103, low: 99 },
        { x: 1, open: 102, close: 101, high: 104, low: 100 },
        { x: 2, open: 101, close: 105, high: 106, low: 101 },
        { x: 3, open: 105, close: 104, high: 105, low: 103 },
    ]
    const moreProps = { xScale, chartConfig: { yScale }, xAccessor: row => row.x, fullData }
    const object = { from: 0, to: 3, at: [10, 100] }

    // Bước mở→đóng đọc ngược từ pixel: yScale lật dấu, nên (yOpen − yClose)/10 là close − open
    const moves = candles => candles.map(candle => Math.round(((candle.yOpen - candle.yClose) / 10) * 100) / 100)
    const sorted = list => [...list].sort((a, b) => a - b)

    const copy = barsPatternCandles({ ...object, mode: "copy" }, moreProps)
    const ghost = barsPatternCandles({ ...object, mode: "ghost" }, moreProps)
    const again = barsPatternCandles({ ...object, mode: "ghost" }, moreProps)
    const moved = barsPatternCandles({ ...object, mode: "ghost", at: [17, 100] }, moreProps)

    const problems = []
    if (copy.length !== 4 || ghost.length !== 4) problems.push(`số nến: copy ${copy.length}, ghost ${ghost.length}`)
    if (JSON.stringify(moves(copy)) !== JSON.stringify([2, -1, 4, -1])) problems.push(`bản chép lệch: ${moves(copy)}`)
    if (JSON.stringify(sorted(moves(ghost))) !== JSON.stringify(sorted([2, -1, 4, -1])))
        problems.push(`bóng giả dùng bước lạ: ${moves(ghost)}`)
    if (JSON.stringify(moves(ghost)) !== JSON.stringify(moves(again))) problems.push(`không tất định: ${moves(ghost)} rồi ${moves(again)}`)
    if (JSON.stringify(moves(ghost)) === JSON.stringify(moves(moved))) problems.push(`dời neo mà bóng không đổi: ${moves(moved)}`)

    if (problems.length === 0) {
        checked += 5
        console.log(`✓ ghost feed: bước giá là của dải nguồn, xáo thứ tự, tất định theo neo`)
    } else {
        failed++
        console.error(`✗ ghost feed lệch: ${problems.join(" · ")}`)
    }
}

/** Và mọi cái tên tài liệu nhắc tới phải có thật — xem tools/docs/check-docs.mjs. */
const { checkDocs } = await import("./tools/docs/check-docs.mjs")
const docProblems = await checkDocs()

if (docProblems.length === 0) {
    console.log(`✓ mọi tên trong tài liệu đều có thật trong mã`)
} else {
    failed++
    console.error(`✗ tài liệu nhắc tới thứ không có:`)
    for (const problem of docProblems) console.error(`    ${problem}`)
}

/** Và không accessor nào bị `defineProperties` che — xem tools/check-accessors.mjs. */
const { checkAccessors } = await import("./tools/check-accessors.mjs")
const accessorProblems = await checkAccessors()

if (accessorProblems.length === 0) {
    console.log(`✓ không accessor nào bị defineProperties che`)
} else {
    failed++
    console.error(`✗ accessor bị che:`)
    for (const problem of accessorProblems) console.error(`    ${problem}`)
}

if (only === undefined) {
    const { execFileSync } = await import("node:child_process")

    for (const name of Object.keys(ISOLATED)) {
        try {
            execFileSync(process.execPath, [fileURLToPath(import.meta.url)], {
                stdio: "inherit",
                env: { ...process.env, GOLDEN_SUITE: name },
            })
        } catch {
            failed++
        }
    }
}

if (failed > 0) {
    console.error(`\n${failed} bộ lệch so với bản gốc.`)
    process.exit(1)
}

console.log(
    `\n${checked - onPurposeTotal} giá trị khớp bản gốc` +
        (onPurposeTotal === 0 ? "." : `, ${onPurposeTotal} giá trị lệch có chủ ý (đã khai báo).`),
)
