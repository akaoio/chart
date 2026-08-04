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

// ── bậc 3: lấy hàm vẽ ra khỏi component React của bản gốc ─────────────────────────
//
// Không render, không cần DOM. Mọi series và cả Axis đều kết thúc ở cùng một chỗ: chúng
// dựng một <GenericChartComponent canvasDraw={...} />. Nên chỉ cần đi qua cây phần tử
// React mà chúng trả về rồi nhặt prop `canvasDraw` ra là có đúng hàm vẽ bản gốc dùng.
//
// Đoạn này không chứa logic chart nào — nó chỉ thay chỗ của React trong việc gọi
// `render()` và đi xuống các con.

const collectDraws = element => {
    if (element === null || element === undefined || element === false) return []
    if (Array.isArray(element)) return element.flatMap(collectDraws)
    if (typeof element !== "object") return []

    // GenericChartComponent mang sẵn hàm vẽ trong props — dừng ở đây
    if (typeof element.props?.canvasDraw === "function") return [element.props.canvasDraw]

    const { type, props } = element

    if (typeof type === "function") {
        const merged = { ...type.defaultProps, ...props }

        // class component thì dựng rồi gọi render(); function component thì gọi thẳng
        return type.prototype?.render
            ? collectDraws(new type(merged).render())
            : collectDraws(type(merged))
    }

    return collectDraws(props?.children)
}

const drawVia = Component => (context, moreProps, props) => {
    for (const draw of collectDraws(React.createElement(Component, props))) {
        draw(context, moreProps)
    }
}

// Nạp từng file thay vì barrel: barrel của series re-export cả tên chỉ-kiểu
// (`export { StackedBarSeries, StackedBarSeriesProps } from ...`), mà dịch từng file thì
// không thể biết tên nào là kiểu để lược đi, nên nó còn lại lúc chạy rồi nổ.
const fromSeries = async file => import(join(packages, "series/src", file))

const axes = await import(join(packages, "axes/src/Axis.tsx"))
const lineSeries = await fromSeries("LineSeries.tsx")
const areaOnlySeries = await fromSeries("AreaOnlySeries.tsx")
const areaSeries = await fromSeries("AreaSeries.tsx")
const straightLine = await fromSeries("StraightLine.tsx")
const barSeries = await fromSeries("BarSeries.tsx")
const candlestickSeries = await fromSeries("CandlestickSeries.tsx")
const ohlcSeries = await fromSeries("OHLCSeries.tsx")
const scatterSeries = await fromSeries("ScatterSeries.tsx")
const circleMarker = await fromSeries("markers/CircleMarker.tsx")
const squareMarker = await fromSeries("markers/SquareMarker.tsx")
const triangleMarker = await fromSeries("markers/TriangleMarker.tsx")

const drawApi = {
    drawAxis: drawVia(axes.Axis),
    drawLineSeries: drawVia(lineSeries.LineSeries),
    drawAreaOnlySeries: drawVia(areaOnlySeries.AreaOnlySeries),
    drawAreaSeries: drawVia(areaSeries.AreaSeries),
    drawStraightLine: drawVia(straightLine.StraightLine),
    drawBarSeries: drawVia(barSeries.BarSeries),
    drawCandlestickSeries: drawVia(candlestickSeries.CandlestickSeries),
    drawOHLCSeries: drawVia(ohlcSeries.OHLCSeries),
    drawScatterSeries: drawVia(scatterSeries.ScatterSeries),
    CircleMarker: circleMarker.CircleMarker,
    Square: squareMarker.Square,
    Triangle: triangleMarker.Triangle,
}

const suites = [
    [await import("./cases/scales.mjs"), scales],
    [await import("./cases/utils.mjs"), utils],
    [await import("./cases/chartdata.mjs"), chartData],
    [await import("./cases/draw.mjs"), drawApi],
]

const { execSync } = await import("node:child_process")
const commit = execSync("git rev-parse --short HEAD", { cwd: source }).toString().trim()

for (const [suite, api] of suites) {
    const result = suite.run(api)
    const file = join(fixtures, `${suite.name}.json`)
    writeFileSync(file, stringify({ source: { repo: "react-financial-charts", commit }, result }) + "\n")
    console.log(`${suite.name}.json ghi xong (nguồn @ ${commit})`)
}
