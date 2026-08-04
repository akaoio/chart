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

const suites = [
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
            ...(await import("./src/coordinates/index.js")),
            ...(await import("./src/tooltip/index.js")),
            ...(await import("./src/annotations/index.js")),
        },
    ],
    [
        await import("./tools/golden/cases/svg.mjs"),
        {
            ...(await import("./src/tooltip/index.js")),
            ...(await import("./src/annotations/index.js")),
        },
    ],
]

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

if (failed > 0) {
    console.error(`\n${failed} bộ lệch so với bản gốc.`)
    process.exit(1)
}

console.log(`\n${checked} giá trị khớp bản gốc.`)
