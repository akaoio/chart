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

    // Component chỉ vẽ SVG (SVGComponent, dùng cho clipPath) không phát lệnh canvas nào.
    // Dựng nó lên sẽ đòi context của React, mà ở đây không có và cũng không cần.
    if (typeof element.props?.svgDraw === "function") return []

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
const axisZoomCapture = await import(join(packages, "axes/src/AxisZoomCapture.tsx"))
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
const alternatingFillArea = await fromSeries("AlternatingFillAreaSeries.tsx")
const stackedBar = await fromSeries("StackedBarSeries.tsx")
const groupedBar = await fromSeries("GroupedBarSeries.tsx")
const overlayBar = await fromSeries("OverlayBarSeries.tsx")
const bollinger = await fromSeries("BollingerSeries.tsx")
const macd = await fromSeries("MACDSeries.tsx")
const rsi = await fromSeries("RSISeries.tsx")
const stochastic = await fromSeries("StochasticSeries.tsx")
const elderRay = await fromSeries("ElderRaySeries.tsx")
const sar = await fromSeries("SARSeries.tsx")
const kagi = await fromSeries("KagiSeries.tsx")
const renko = await fromSeries("RenkoSeries.tsx")
const pointAndFigure = await fromSeries("PointAndFigureSeries.tsx")
const volumeProfile = await fromSeries("VolumeProfileSeries.tsx")

const drawApi = {
    drawAxis: drawVia(axes.Axis),

    /**
     * Phép toán kéo trục nằm trong `handleDrag`, một thuộc tính riêng của instance —
     * `private` của TypeScript chỉ có lúc dịch. Nên nó được gọi thẳng, với `ref` và
     * `state` bơm vào bằng tay thay cho React.
     *
     * `pointer()` của d3 lùi về `[pageX, pageY]` khi node không phải node thật, nên toạ
     * độ chuột đi vào qua đúng đường ấy — không dựng DOM giả, không đoán.
     */
    axisZoomDomain: ({ startScale, startXY, mouseXY, getMouseDelta, inverted }) => {
        let captured

        const instance = new axisZoomCapture.AxisZoomCapture({
            getMouseDelta,
            inverted,
            axisZoomCallback: domain => {
                captured = domain
            },
        })

        instance.ref = { current: {} }
        instance.state = { startPosition: { startScale, startXY } }
        instance.handleDrag({ pageX: mouseXY[0], pageY: mouseXY[1] })

        return captured
    },

    /** Cái rect vô hình: dựng component rồi lấy cây SVG nó render ra. */
    axisZoomCaptureRect: ({ bg, className, zoomCursorClassName, dragging = false }) => {
        const instance = new axisZoomCapture.AxisZoomCapture({ bg, className, zoomCursorClassName })
        if (dragging) instance.state = { startPosition: { startScale: null, startXY: [0, 0] } }
        return instance.render()
    },

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
    drawAlternatingFillAreaSeries: drawVia(alternatingFillArea.AlternatingFillAreaSeries),
    drawStackedBarSeries: drawVia(stackedBar.StackedBarSeries),
    drawGroupedBarSeries: drawVia(groupedBar.GroupedBarSeries),
    drawOverlayBarSeries: drawVia(overlayBar.OverlayBarSeries),
    drawBollingerSeries: drawVia(bollinger.BollingerSeries),
    drawMACDSeries: drawVia(macd.MACDSeries),
    drawRSISeries: drawVia(rsi.RSISeries),
    drawStochasticSeries: drawVia(stochastic.StochasticSeries),
    drawElderRaySeries: drawVia(elderRay.ElderRaySeries),
    drawSARSeries: drawVia(sar.SARSeries),
    drawKagiSeries: drawVia(kagi.KagiSeries),
    drawRenkoSeries: drawVia(renko.RenkoSeries),
    drawPointAndFigureSeries: drawVia(pointAndFigure.PointAndFigureSeries),
    drawVolumeProfileSeries: drawVia(volumeProfile.VolumeProfileSeries),
}

const fromCoordinates = async file => import(join(packages, "coordinates/src", file))

const crossHair = await fromCoordinates("CrossHairCursor.tsx")
const cursor = await fromCoordinates("Cursor.tsx")
const currentCoordinate = await fromCoordinates("CurrentCoordinate.tsx")
const mouseX = await fromCoordinates("MouseCoordinateX.tsx")
const mouseXV2 = await fromCoordinates("MouseCoordinateXV2.tsx")
const mouseY = await fromCoordinates("MouseCoordinateY.tsx")
const priceCoordinate = await fromCoordinates("PriceCoordinate.tsx")
const edgeIndicator = await fromCoordinates("EdgeIndicator.tsx")

/**
 * Cursor và CrossHairCursor đọc margin/ratio từ ChartCanvasContext. Không render thì
 * `this.context` rỗng, nên bơm thẳng vào instance — bản port nhận chúng qua props, và
 * case truyền cùng giá trị cho cả hai phía.
 */
const drawViaWithContext = (Component, context) => (recordContext, moreProps, props) => {
    const instance = new Component({ ...Component.defaultProps, ...props })
    instance.context = context
    for (const draw of collectDraws(instance.render())) draw(recordContext, moreProps)
}

const chartContext = { margin: { top: 10, right: 60, bottom: 30, left: 0 }, ratio: 1 }

const hoverTooltip = await import(join(packages, "tooltip/src/HoverTooltip.tsx"))
const labelAnnotationCanvas = await import(join(packages, "annotations/src/Label.tsx"))

Object.assign(drawApi, {
    drawHoverTooltip: drawViaWithContext(hoverTooltip.HoverTooltip, chartContext),
    drawLabel: drawViaWithContext(labelAnnotationCanvas.Label, chartContext),
    drawCrossHairCursor: drawViaWithContext(crossHair.CrossHairCursor, chartContext),
    drawCursor: drawViaWithContext(cursor.Cursor, chartContext),
    drawCurrentCoordinate: drawVia(currentCoordinate.CurrentCoordinate),
    drawMouseCoordinateX: drawVia(mouseX.MouseCoordinateX),
    drawMouseCoordinateXV2: drawVia(mouseXV2.MouseCoordinateXV2),
    drawMouseCoordinateY: drawVia(mouseY.MouseCoordinateY),
    drawPriceCoordinate: drawVia(priceCoordinate.PriceCoordinate),
    drawEdgeIndicator: drawVia(edgeIndicator.EdgeIndicator),
})

// ── bậc 4: phần vẽ bằng SVG ──────────────────────────────────────────────────────
//
// Lấy hàm renderSVG ra khỏi component, y hệt cách lấy canvasDraw: dựng component rồi
// nhặt prop `svgDraw` mà nó truyền cho GenericChartComponent.

const collectSvgDraw = element => {
    if (element === null || element === undefined || typeof element !== "object") return null
    if (typeof element.props?.svgDraw === "function") return element.props.svgDraw

    const { type, props } = element
    if (typeof type === "function") {
        const merged = { ...type.defaultProps, ...props }
        return collectSvgDraw(type.prototype?.render ? new type(merged).render() : type(merged))
    }

    return collectSvgDraw(props?.children)
}

const renderVia = Component => (moreProps, props) => {
    const draw = collectSvgDraw(React.createElement(Component, props))
    return draw ? draw(moreProps) : null
}

const fromTooltip = async file => import(join(packages, "tooltip/src", file))

const singleValueTooltip = await fromTooltip("SingleValueTooltip.tsx")
const ohlcTooltip = await fromTooltip("OHLCTooltip.tsx")

const rsiTooltip = await fromTooltip("RSITooltip.tsx")
const bollingerTooltip = await fromTooltip("BollingerBandTooltip.tsx")
const macdTooltip = await fromTooltip("MACDTooltip.tsx")
const stochasticTooltip = await fromTooltip("StochasticTooltip.tsx")
const movingAverageTooltip = await fromTooltip("MovingAverageTooltip.tsx")
const groupTooltip = await fromTooltip("GroupTooltip.tsx")

const fromAnnotations = async file => import(join(packages, "annotations/src", file))
const annotate = await fromAnnotations("Annotate.tsx")
const labelAnnotation = await fromAnnotations("LabelAnnotation.tsx")
const svgPathAnnotation = await fromAnnotations("SvgPathAnnotation.tsx")
const barAnnotation = await fromAnnotations("BarAnnotation.tsx")

const svgApi = {
    renderSingleValueTooltip: renderVia(singleValueTooltip.SingleValueTooltip),
    renderOHLCTooltip: renderVia(ohlcTooltip.OHLCTooltip),
    renderRSITooltip: renderVia(rsiTooltip.RSITooltip),
    renderBollingerBandTooltip: renderVia(bollingerTooltip.BollingerBandTooltip),
    renderMACDTooltip: renderVia(macdTooltip.MACDTooltip),
    renderStochasticTooltip: renderVia(stochasticTooltip.StochasticTooltip),
    renderMovingAverageTooltip: renderVia(movingAverageTooltip.MovingAverageTooltip),
    renderGroupTooltip: renderVia(groupTooltip.GroupTooltip),
    renderAnnotate: renderVia(annotate.Annotate),
    // Annotate nhận một COMPONENT làm prop `with`; bản port nhận một HÀM dựng mô tả.
    // Hai bên nhận đúng cùng vai trò, chỉ khác hình dạng của thứ được truyền.
    renderLabelAnnotation: labelAnnotation.LabelAnnotation,
    renderSvgPathAnnotation: svgPathAnnotation.SvgPathAnnotation,
    renderBarAnnotation: barAnnotation.BarAnnotation,
}

const indicators = await import(join(packages, "indicators/src/indicator/index.ts"))

const interactiveUtils = await import(join(packages, "interactive/src/utils.ts"))
const zoomButtons = await import(join(packages, "interactive/src/ZoomButtons.tsx"))
const d3Interpolate = createRequire(join(source, "package.json"))("d3-interpolate")
const { normalizeSvg: normalizeSvgTree } = await import("./svgtree.mjs")
const interactiveLine = await import(join(packages, "interactive/src/components/InteractiveStraightLine.tsx"))
const channelWithArea = await import(join(packages, "interactive/src/components/ChannelWithArea.tsx"))
const regressionChannel = await import(
    join(packages, "interactive/src/components/LinearRegressionChannelWithArea.tsx"),
)
const gannFan = await import(join(packages, "interactive/src/components/GannFan.tsx"))
const interactiveTextComponent = await import(join(packages, "interactive/src/components/InteractiveText.tsx"))
const clickableShape = await import(join(packages, "interactive/src/components/ClickableShape.tsx"))
const yCoordinate = await import(join(packages, "interactive/src/components/InteractiveYCoordinate.tsx"))
const eachFibRetracement = await import(join(packages, "interactive/src/wrapper/EachFibRetracement.tsx"))

/**
 * Dựng thẳng một component rồi gọi phương thức riêng của nó.
 *
 * `private` của TypeScript chỉ có lúc dịch — lúc chạy `isHover` và `drawOnCanvas` vẫn là
 * thuộc tính bình thường. Cần đến chúng vì ba component nhớ kết quả đo trong chính mình
 * (bề rộng chữ, bề rộng hộp): chỉ khi vẽ rồi hỏi hover trên **cùng một thực thể** thì cái
 * nhớ ấy mới có tác dụng, đúng như lúc chạy thật.
 */
const instanceOf = (Component, props) => new Component({ ...Component.defaultProps, ...props })

const hoverVia = Component => (moreProps, props) => instanceOf(Component, props).isHover(moreProps)

/** Vẽ trước rồi mới hỏi hover, trên cùng một thực thể. */
const drawThenHoverVia = Component => (context, drawMoreProps, hoverMoreProps, props) => {
    const instance = instanceOf(Component, props)
    instance.drawOnCanvas(context, drawMoreProps)
    return instance.isHover(hoverMoreProps)
}

/**
 * Đi khắp cây phần tử React, dừng ở đúng chỗ collectDraws dừng.
 *
 * Dùng để lấy ra hình học mà bản gốc **không xuất khẩu**: các mức Fibonacci nằm trong một
 * hàm module-private, nhưng chúng đi thẳng vào props của những đường được render — đọc ở
 * đó là đọc đúng con số bản gốc dùng, chứ không phải chép lại công thức.
 */
const walkElements = (element, visit) => {
    if (element === null || element === undefined || element === false) return
    if (Array.isArray(element)) return element.forEach(each => walkElements(each, visit))
    if (typeof element !== "object") return

    visit(element)

    if (typeof element.props?.canvasDraw === "function") return
    if (typeof element.props?.svgDraw === "function") return

    const { type, props } = element

    if (typeof type === "function") {
        const merged = { ...type.defaultProps, ...props }
        return walkElements(type.prototype?.render ? new type(merged).render() : type(merged), visit)
    }

    walkElements(props?.children, visit)
}

const interactiveApi = {
    ...interactiveUtils,
    generateLine: interactiveLine.generateLine,
    getSlope: interactiveLine.getSlope,
    getYIntercept: interactiveLine.getYIntercept,
    isHovering: interactiveLine.isHovering,
    isHovering2: interactiveLine.isHovering2,
    drawInteractiveStraightLine: drawVia(interactiveLine.InteractiveStraightLine),

    drawChannelWithArea: drawVia(channelWithArea.ChannelWithArea),
    isChannelHover: hoverVia(channelWithArea.ChannelWithArea),

    drawLinearRegressionChannel: drawVia(regressionChannel.LinearRegressionChannelWithArea),
    isRegressionHover: hoverVia(regressionChannel.LinearRegressionChannelWithArea),
    edge1Provider: regressionChannel.edge1Provider,
    edge2Provider: regressionChannel.edge2Provider,

    drawGannFan: drawVia(gannFan.GannFan),
    isGannFanHover: hoverVia(gannFan.GannFan),

    textDrawThenHover: drawThenHoverVia(interactiveTextComponent.InteractiveText),
    closeIconDrawThenHover: drawThenHoverVia(clickableShape.ClickableShape),
    yCoordinateDrawThenHover: drawThenHoverVia(yCoordinate.InteractiveYCoordinate),

    /**
     * Các mức Fibonacci, đọc ra từ chính những đường mà bản gốc render.
     *
     * Phần trăm nằm trong nhãn (`"104.00 (61.80%)"`) chứ không nằm trên đường, nên nó
     * được lấy từ nhãn — vẫn là con số bản gốc tự sinh.
     */
    fibRetracementLines: ({ x1, y1, x2, y2 }) => {
        const lines = []
        const labels = []

        walkElements(
            React.createElement(eachFibRetracement.EachFibRetracement, {
                x1,
                y1,
                x2,
                y2,
                type: "RETRACEMENT",
            }),
            element => {
                if (element.type === interactiveLine.InteractiveStraightLine) {
                    lines.push({ x1: element.props.x1Value, x2: element.props.x2Value, y: element.props.y1Value })
                }
                if (element.type?.name === "Text") labels.push(element.props.children)
            },
        )

        return lines.map((line, index) => ({
            ...line,
            percent: Number(/\(([\d.]+)%\)/.exec(labels[index])[1]),
        }))
    },

    /**
     * ZoomButtons của bản gốc là component đọc ChartContext và render SVG thẳng trong
     * `render()`, không qua GenericChartComponent — nên bơm context rồi lấy cây ra.
     */
    renderZoomButtons: (moreProps, props) => {
        const instance = new zoomButtons.ZoomButtons({ ...zoomButtons.ZoomButtons.defaultProps, ...props })
        instance.context = { chartConfig: moreProps.chartConfig }
        return normalizeSvgTree(instance.render())
    },

    zoomSteps: (xScale, plotData, xAccessor, direction, zoomMultiplier) => {
        const cx = xScale(xAccessor(plotData[plotData.length - 1]))
        const factor = direction > 0 ? zoomMultiplier : 1 / zoomMultiplier
        const [start, end] = xScale.domain()
        const [newStart, newEnd] = xScale.range().map(x => cx + (x - cx) * factor).map(xScale.invert)
        const left = d3Interpolate.interpolateNumber(start, newStart)
        const right = d3Interpolate.interpolateNumber(end, newEnd)
        return [0.25, 0.3, 0.5, 0.6, 0.75, 1].map(at => [left(at), right(at)])
    },
}

/**
 * Bộ nào phải chạy một mình thì ghi tên ở đây.
 *
 * `setLocale` đổi trạng thái toàn cục của tiến trình (`timeFormatDefaultLocale`), nên nó
 * không thể ngồi chung: chạy trước thì làm hỏng bộ khác, chạy sau thì phụ thuộc vào thứ
 * tự — mà thứ tự là thứ không nên phải nhớ. Mỗi bộ như thế được sinh trong một tiến trình
 * con của chính script này.
 */
const ISOLATED = { locale: () => import("./cases/locale.mjs") }

const only = process.env.GOLDEN_SUITE

const suites = only
    ? [[await ISOLATED[only](), scales]]
    : [
    [await import("./cases/scales.mjs"), scales],
    [await import("./cases/utils.mjs"), utils],
    [await import("./cases/chartdata.mjs"), chartData],
    [await import("./cases/draw.mjs"), drawApi],
    [await import("./cases/svg.mjs"), svgApi],
    [await import("./cases/indicators.mjs"), indicators],
    [await import("./cases/interactive.mjs"), interactiveApi],
      ]

const { execSync } = await import("node:child_process")
const commit = execSync("git rev-parse --short HEAD", { cwd: source }).toString().trim()

for (const [suite, api] of suites) {
    const result = suite.run(api)
    const file = join(fixtures, `${suite.name}.json`)
    writeFileSync(file, stringify({ source: { repo: "react-financial-charts", commit }, result }) + "\n")
    console.log(`${suite.name}.json ghi xong (nguồn @ ${commit})`)
}

if (only === undefined) {
    const { execFileSync } = await import("node:child_process")

    for (const name of Object.keys(ISOLATED)) {
        execFileSync(process.execPath, process.execArgv.concat(fileURLToPath(import.meta.url)), {
            stdio: "inherit",
            env: { ...process.env, GOLDEN_SUITE: name },
        })
    }
}
