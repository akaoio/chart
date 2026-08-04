/**
 * Sinh golden data bằng cách chạy chính mã nguồn của bản gốc.
 *
 *   CHART_SOURCE=~/react-financial-charts npm run golden
 *
 * Kết quả ghi vào tools/golden/fixtures/ và được commit. Nhờ vậy `npm test` chỉ cần
 * bản port — không ai phải clone repo gốc để chạy test. Chỉ khi muốn sinh lại mới cần.
 *
 * Múi giờ bị ép về UTC vì bản gốc tính mốc thời gian bằng giờ địa phương.
 */

import { writeFileSync, mkdirSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { stringify } from "./serialize.mjs"

if (process.env.TZ !== "UTC") {
    console.error("Phải chạy với TZ=UTC. Dùng `npm run golden`.")
    process.exit(1)
}

const source = process.env.CHART_SOURCE
if (!source) {
    console.error("Thiếu CHART_SOURCE — đường dẫn tới repo react-financial-charts.")
    console.error("Ví dụ: CHART_SOURCE=~/react-financial-charts npm run golden")
    process.exit(1)
}

const here = dirname(fileURLToPath(import.meta.url))
const fixtures = join(here, "fixtures")
mkdirSync(fixtures, { recursive: true })

const packages = join(source, "packages")

const scales = await import(join(packages, "scales/src/index.ts"))
const utils = await import(join(packages, "core/src/utils/index.ts"))
const chartDataUtil = await import(join(packages, "core/src/utils/ChartDataUtil.ts"))
const evaluator = await import(join(packages, "core/src/utils/evaluator.ts"))
const zoomBehavior = await import(join(packages, "core/src/zoom/zoomBehavior.ts"))
// react chỉ có trong node_modules của repo gốc, không có ở repo này
const { createRequire } = await import("node:module")
const React = createRequire(join(source, "package.json"))("react")

const chartData = {
    ...chartDataUtil,
    ...zoomBehavior,
    evaluator: evaluator.default,
    // Khớp nối duy nhất trong cả bộ golden: bản gốc nhận React children rồi đọc
    // `each.props`, bản port nhận thẳng props. Ba dòng này chỉ bọc lại, không có logic
    // chart nào — nếu chúng sai thì mọi bài kiểm getNewChartConfig đều đổ, không im lặng.
    getNewChartConfig: (innerDimension, chartPropsList, existing) =>
        chartDataUtil.getNewChartConfig(
            innerDimension,
            chartPropsList.map(props => (props == null ? props : React.createElement("div", props))),
            existing,
        ),
}

const suites = [
    [await import("./cases/scales.mjs"), scales],
    [await import("./cases/utils.mjs"), utils],
    [await import("./cases/chartdata.mjs"), chartData],
]

const { execSync } = await import("node:child_process")
const commit = execSync("git rev-parse --short HEAD", { cwd: source }).toString().trim()

for (const [suite, api] of suites) {
    const result = suite.run(api)
    const file = join(fixtures, `${suite.name}.json`)
    writeFileSync(file, stringify({ source: { repo: "react-financial-charts", commit }, result }) + "\n")
    console.log(`${suite.name}.json ghi xong (nguồn @ ${commit})`)
}
