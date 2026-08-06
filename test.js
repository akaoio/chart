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

    const wrong = differences(expected, actual)
    if (wrong.length === 0) {
        console.log(`✓ ${suite.name}: ${leaves} giá trị khớp bản gốc @ ${fixture.source.commit}`)
        continue
    }

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

console.log(`\n${checked} giá trị khớp bản gốc.`)
