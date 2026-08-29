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
