/**
 * Bài kiểm cho bậc 3: axes và series.
 *
 * Thứ cần chứng minh ở đây là **hình vẽ**. Hình vẽ trên canvas là một chuỗi lệnh, nên
 * bài kiểm cho cả hai phía vẽ vào cùng một canvas giả rồi so đúng từng lệnh — chính xác
 * hơn so ảnh, và khi lệch thì chỉ ra được ngay lệnh thứ mấy.
 *
 * Bên bản gốc, hàm vẽ được lấy ra bằng cách dựng component React rồi đọc prop
 * `canvasDraw` mà nó truyền cho `GenericChartComponent` — không render, không cần DOM.
 * Xem `tools/golden/generate.mjs`.
 */

import { scaleLinear } from "d3-scale"
import { curveMonotoneX } from "d3-shape"
import { createRecorder } from "../recorder.mjs"
import { normalizeSvg } from "../svgtree.mjs"
import { datasets } from "../data.mjs"

/** Khác biệt có khai báo: tên lớp `react-financial-charts-*` thành `chart-*`. */
const stripPrefix = tree => {
    if (tree === null || typeof tree !== "object") return tree
    if (Array.isArray(tree)) return tree.map(stripPrefix)
    if (tree.text !== undefined) return tree

    const attrs = { ...tree.attrs }
    if (typeof attrs.class === "string") attrs.class = attrs.class.replace(/react-financial-charts-/g, "chart-")

    return { ...tree, attrs, children: (tree.children ?? []).map(stripPrefix) }
}

export const name = "draw"

/**
 * Bốn mươi phiên, cộng ba trường hợp mà dữ liệu ngẫu nhiên gần như không bao giờ sinh ra
 * nhưng thị trường thì có: một phiên mở bằng đóng (doji — thân nến dày 0), một phiên
 * đứng im hoàn toàn, và một phiên biến động rất mạnh.
 */
const rows = datasets.daily.slice(0, 40).map((row, index) => {
    if (index === 5) return { ...row, index, open: 100, close: 100, high: 103, low: 97 }
    if (index === 6) return { ...row, index, open: 100, close: 100, high: 100, low: 100 }
    if (index === 7) return { ...row, index, open: 92, close: 114, high: 114.5, low: 91.5 }
    return { ...row, index }
})

const xAccessor = datum => datum.index
const xScale = () => scaleLinear().domain([0, 39]).range([0, 760])
const yScale = () => scaleLinear().domain([90, 115]).range([360, 0])

const chartConfig = () => ({
    id: 0,
    origin: [0, 0],
    width: 760,
    height: 360,
    yScale: yScale(),
    flipYScale: false,
    padding: 0,
    yPan: true,
    yPanEnabled: false,
})

/** Đúng thứ một series nhìn thấy khi được yêu cầu vẽ. */
const moreProps = (overrides = {}) => ({
    xAccessor,
    xScale: xScale(),
    chartConfig: chartConfig(),
    chartConfigs: [chartConfig()],
    plotData: rows,
    fullData: rows,
    width: 760,
    height: 360,
    hovering: false,
    chartId: 0,
    ...overrides,
})

/** Chạy một hàm vẽ và trả về chuỗi lệnh nó phát ra. */
const record = (draw, props, extra) => {
    const context = createRecorder()
    draw(context, moreProps(extra), props)
    return context.calls
}

/** Dữ liệu phái sinh cho các series gắn với chỉ báo. Cố định, không random. */
const withIndicators = rows.map((row, index) => {
    const macd = Math.sin(index / 4) * 2
    const signal = Math.sin((index - 2) / 4) * 2
    return {
        ...row,
        bb: { top: row.high + 2, middle: (row.high + row.low) / 2, bottom: row.low - 2 },
        macd: { macd, signal, divergence: macd - signal },
        rsi: 50 + Math.round(Math.cos(index / 3) * 30),
        stochastic: { K: 50 + Math.round(Math.cos(index / 3) * 40), D: 50 + Math.round(Math.cos(index / 5) * 30) },
        elderRay: { bullPower: (index % 5) - 2, bearPower: 2 - (index % 7) },
        sar: index % 3 === 0 ? row.high + 1 : row.low - 1,
        absoluteChange: row.close - row.open,
    }
})

/** Renko/Kagi/PointAndFigure nhận dữ liệu đã qua chỉ báo, hình dạng rất riêng. */
const renkoRows = rows.map((row, index) => ({ ...row, fullyFormed: index < rows.length - 1 }))

const kagiRows = rows.map((row, index) => ({
    ...row,
    startAs: "yang",
    current: row.close,
    reverseAt: row.close - 3,
    ...(index % 9 === 4 ? { changeTo: index % 18 === 4 ? "yin" : "yang", changePoint: row.close } : {}),
}))

const pointAndFigureRows = rows.map((row, index) => ({
    ...row,
    direction: index % 2 === 0 ? 1 : -1,
    boxes: [
        { open: 100, close: 102 },
        { open: 102, close: 104 },
    ],
}))

const close = datum => datum.close
const volume = datum => datum.volume
const ohlc = datum => ({ open: datum.open, high: datum.high, low: datum.low, close: datum.close })

export function run(api) {
    const out = {}

    // ── series ────────────────────────────────────────────────────────────────────

    out.line = record(api.drawLineSeries, { yAccessor: close })
    out.lineStyled = record(api.drawLineSeries, {
        yAccessor: close,
        strokeStyle: "#ff9800",
        strokeWidth: 3,
        strokeDasharray: "ShortDash",
    })
    out.lineCurved = record(api.drawLineSeries, { yAccessor: close, curve: curveMonotoneX })
    out.lineHovering = record(api.drawLineSeries, { yAccessor: close, highlightOnHover: true }, { hovering: true })
    // dữ liệu thủng lỗ: nhánh `defined` quyết định nối hay ngắt
    out.lineWithGaps = record(api.drawLineSeries, { yAccessor: datum => (datum.index % 7 === 3 ? undefined : datum.close) })
    out.lineConnectNulls = record(api.drawLineSeries, {
        yAccessor: datum => (datum.index % 7 === 3 ? undefined : datum.close),
        connectNulls: true,
    })

    out.areaOnly = record(api.drawAreaOnlySeries, { yAccessor: close, fillStyle: "rgba(33,150,243,0.2)" })
    out.areaOnlyBase = record(api.drawAreaOnlySeries, { yAccessor: close, base: 300 })
    out.area = record(api.drawAreaSeries, { yAccessor: close })

    out.straightLineHorizontal = record(api.drawStraightLine, { type: "horizontal", yValue: 104 })
    out.straightLineVertical = record(api.drawStraightLine, { type: "vertical", xValue: 12, lineDash: "Dot" })

    out.bar = record(api.drawBarSeries, { yAccessor: volume })
    out.barStyled = record(api.drawBarSeries, {
        yAccessor: volume,
        fillStyle: datum => (datum.close > datum.open ? "#26a69a" : "#ef5350"),
        strokeStyle: "#000000",
    })

    out.candlestick = record(api.drawCandlestickSeries, { yAccessor: ohlc })
    out.candlestickStroked = record(api.drawCandlestickSeries, { yAccessor: ohlc, stroke: "#333333", widthRatio: 0.5 })

    out.ohlc = record(api.drawOHLCSeries, { yAccessor: ohlc })

    out.scatterCircle = record(api.drawScatterSeries, { yAccessor: close, marker: api.CircleMarker, markerProps: { r: 3 } })
    out.scatterSquare = record(api.drawScatterSeries, { yAccessor: close, marker: api.Square, markerProps: { width: 6 } })
    out.scatterTriangle = record(api.drawScatterSeries, {
        yAccessor: close,
        marker: api.Triangle,
        markerProps: { width: 8 },
    })

    // ── series ghép và series gắn chỉ báo ─────────────────────────────────────────

    const onIndicators = extra => ({ plotData: withIndicators, fullData: withIndicators, ...extra })

    out.alternatingFillArea = record(api.drawAlternatingFillAreaSeries, { yAccessor: close, baseAt: 102 })

    out.stackedBar = record(api.drawStackedBarSeries, { yAccessor: [d => d.volume / 2, d => d.volume / 3] })
    out.stackedBarStroked = record(api.drawStackedBarSeries, {
        yAccessor: [d => d.volume / 2, d => d.volume / 3],
        stroke: true,
        fillStyle: (d, i) => (i === 0 ? "#26a69a" : "#ef5350"),
    })
    // Dữ liệu dày tới mức mỗi cột chỉ còn 1 pixel — nhánh riêng trong cách tính offset,
    // và là trạng thái bình thường của một chart nhiều năm dữ liệu.
    const dense = Array.from({ length: 700 }, (_, index) => ({
        index,
        volume: 1000 + ((index * 37) % 500),
        close: 100 + ((index * 13) % 20),
        open: 100 + ((index * 7) % 20),
    }))
    out.stackedBarDense = record(
        api.drawStackedBarSeries,
        { yAccessor: [d => d.volume / 2, d => d.volume / 3] },
        { plotData: dense, fullData: dense, xScale: scaleLinear().domain([0, 699]).range([0, 760]) },
    )

    out.groupedBar = record(api.drawGroupedBarSeries, { yAccessor: [d => d.volume / 2, d => d.volume / 3] })
    out.groupedBarDense = record(
        api.drawGroupedBarSeries,
        { yAccessor: [d => d.volume / 2, d => d.volume / 3], spaceBetweenBar: 0 },
        { plotData: dense, fullData: dense, xScale: scaleLinear().domain([0, 699]).range([0, 760]) },
    )

    out.overlayBar = record(api.drawOverlayBarSeries, { yAccessor: [d => d.volume / 2, d => d.volume / 4] })
    out.barSwapScales = record(api.drawBarSeries, { yAccessor: volume, swapScales: true })

    out.bollinger = record(api.drawBollingerSeries, { yAccessor: d => d.bb }, onIndicators())
    out.macd = record(api.drawMACDSeries, { yAccessor: d => d.macd }, onIndicators())
    out.rsi = record(api.drawRSISeries, { yAccessor: d => d.rsi }, onIndicators())
    out.stochastic = record(api.drawStochasticSeries, { yAccessor: d => d.stochastic }, onIndicators())
    out.elderRay = record(api.drawElderRaySeries, { yAccessor: d => d.elderRay }, onIndicators())
    out.sar = record(api.drawSARSeries, { yAccessor: d => d.sar }, onIndicators())
    out.sarStroked = record(
        api.drawSARSeries,
        { yAccessor: d => d.sar, strokeStyle: { falling: "#000", rising: "#111" } },
        onIndicators(),
    )

    out.renko = record(api.drawRenkoSeries, {}, { plotData: renkoRows, fullData: renkoRows })
    out.kagi = record(api.drawKagiSeries, {}, { plotData: kagiRows, fullData: kagiRows })
    out.pointAndFigure = record(api.drawPointAndFigureSeries, {}, {
        plotData: pointAndFigureRows,
        fullData: pointAndFigureRows,
    })

    out.volumeProfile = record(api.drawVolumeProfileSeries, {}, onIndicators())
    out.volumeProfileRight = record(
        api.drawVolumeProfileSeries,
        { orient: "right", showSessionBackground: true, bins: 10 },
        onIndicators(),
    )

    // ── coordinates ───────────────────────────────────────────────────────────────
    //
    // Nhóm này chỉ vẽ khi con trỏ đang ở đâu đó, nên moreProps phải mang theo trạng thái
    // chuột thật: show, mouseXY, currentItem, currentCharts.

    const timeFormat = value => `t${value}`
    const priceFormat = value => value.toFixed(2)

    const hovering = extra => ({
        show: true,
        mouseXY: [380, 140],
        currentItem: rows[20],
        currentCharts: [0],
        displayXAccessor: xAccessor,
        margin: { top: 10, right: 60, bottom: 30, left: 0 },
        ratio: 1,
        ...extra,
    })

    out.crossHairCursor = record(api.drawCrossHairCursor, {}, hovering())
    out.crossHairCursorFree = record(api.drawCrossHairCursor, { snapX: false }, hovering())
    out.cursor = record(api.drawCursor, {}, hovering())
    out.cursorNoY = record(api.drawCursor, { disableYCursor: true }, hovering())
    out.cursorShape = record(
        api.drawCursor,
        { useXCursorShape: true, xCursorShapeFillStyle: "rgba(0,0,0,0.1)" },
        hovering(),
    )
    out.cursorShapeDashed = record(
        api.drawCursor,
        { useXCursorShape: true, xCursorShapeStrokeDasharray: "ShortDash" },
        hovering(),
    )
    // con trỏ ra ngoài chart: phải không vẽ gì
    out.cursorHidden = record(api.drawCursor, {}, hovering({ show: false }))

    out.currentCoordinate = record(api.drawCurrentCoordinate, { yAccessor: close }, hovering())
    out.currentCoordinateStroked = record(
        api.drawCurrentCoordinate,
        { yAccessor: close, r: 5, strokeStyle: "#000", fillStyle: d => (d.close > d.open ? "#26a69a" : "#ef5350") },
        hovering(),
    )

    out.mouseCoordinateX = record(api.drawMouseCoordinateX, { displayFormat: timeFormat }, hovering())
    out.mouseCoordinateXTop = record(
        api.drawMouseCoordinateX,
        { displayFormat: timeFormat, at: "top", orient: "top" },
        hovering(),
    )
    out.mouseCoordinateXFree = record(
        api.drawMouseCoordinateX,
        { displayFormat: timeFormat, snapX: false },
        hovering(),
    )
    out.mouseCoordinateXV2 = record(api.drawMouseCoordinateXV2, { displayFormat: timeFormat }, hovering())
    out.mouseCoordinateXV2Top = record(
        api.drawMouseCoordinateXV2,
        { displayFormat: timeFormat, at: "top", orient: "top" },
        hovering(),
    )

    out.mouseCoordinateY = record(api.drawMouseCoordinateY, { displayFormat: priceFormat }, hovering())
    out.mouseCoordinateYLeft = record(
        api.drawMouseCoordinateY,
        { displayFormat: priceFormat, at: "left", orient: "left", arrowWidth: 6 },
        hovering(),
    )
    out.mouseCoordinateYFit = record(
        api.drawMouseCoordinateY,
        { displayFormat: priceFormat, fitToText: true },
        hovering(),
    )
    // chuột ở pane khác: phải im lặng
    out.mouseCoordinateYOtherPane = record(
        api.drawMouseCoordinateY,
        { displayFormat: priceFormat },
        hovering({ currentCharts: ["khác"] }),
    )

    out.priceCoordinate = record(api.drawPriceCoordinate, { price: 104 }, hovering())
    out.priceCoordinateRight = record(
        api.drawPriceCoordinate,
        { price: 98, at: "right", orient: "right", arrowWidth: 8, stroke: "#333" },
        hovering(),
    )
    // giá nằm ngoài khung nhìn: phải không vẽ gì
    out.priceCoordinateOutside = record(api.drawPriceCoordinate, { price: 500 }, hovering())

    out.edgeIndicator = record(api.drawEdgeIndicator, { yAccessor: close }, hovering())
    out.edgeIndicatorFirst = record(
        api.drawEdgeIndicator,
        { yAccessor: close, itemType: "first", edgeAt: "left", orient: "left" },
        hovering(),
    )
    out.edgeIndicatorFull = record(
        api.drawEdgeIndicator,
        { yAccessor: close, fullWidth: true, hideLine: false, arrowWidth: 6, fill: d => (d.close > d.open ? "#26a69a" : "#ef5350") },
        hovering(),
    )

    // ── tooltip và annotation vẽ lên canvas ───────────────────────────────────────

    out.hoverTooltip = record(
        api.drawHoverTooltip,
        {
            tooltip: {
                content: ({ currentItem }) => ({
                    x: `phiên ${currentItem.index}`,
                    y: [
                        { label: "Mở", value: currentItem.open.toFixed(2), stroke: "#26a69a" },
                        { label: "Đóng", value: currentItem.close.toFixed(2) },
                    ],
                }),
            },
        },
        hovering(),
    )
    // con trỏ ở nửa trái: hộp lật sang phải thay vì tràn ra ngoài
    out.hoverTooltipLeft = record(
        api.drawHoverTooltip,
        {
            tooltip: {
                content: ({ currentItem }) => ({ x: "x", y: [{ label: "Giá", value: currentItem.close.toFixed(2) }] }),
            },
        },
        hovering({ mouseXY: [40, 300], currentItem: rows[2] }),
    )

    out.label = record(api.drawLabel, { text: "AKAO", x: () => 380, y: () => 180 }, hovering())
    out.labelRotated = record(
        api.drawLabel,
        { text: "AKAO", x: () => 380, y: () => 180, rotate: -30, fontSize: 40, fillStyle: "#eeeeee" },
        hovering(),
    )

    // ── axes ──────────────────────────────────────────────────────────────────────

    const axisBase = {
        edgeClip: false,
        outerTickSize: 0,
        innerTickSize: 4,
        tickPadding: 4,
        showDomain: true,
        showGridLines: false,
        showTicks: true,
        showTickLabel: true,
        strokeStyle: "#000000",
        strokeWidth: 1,
        tickStrokeStyle: "#000000",
        tickLabelFill: "#000000",
        tickStrokeWidth: 1,
        gridLinesStrokeStyle: "#E2E4EC",
        gridLinesStrokeWidth: 1,
        fontFamily: "sans-serif",
        fontSize: 12,
        fontWeight: 400,
        getMouseDelta: (startXY, mouseXY) => startXY[0] - mouseXY[0],
    }

    const xAxis = extra => ({
        ...axisBase,
        orient: "bottom",
        transform: [0, 360],
        range: [0, 760],
        ticks: 8,
        getScale: props => props.xScale,
        ...extra,
    })

    const yAxis = extra => ({
        ...axisBase,
        orient: "right",
        transform: [760, 0],
        range: [0, 360],
        ticks: 6,
        getScale: props => props.chartConfig.yScale,
        getMouseDelta: (startXY, mouseXY) => startXY[1] - mouseXY[1],
        ...extra,
    })

    out.axisX = record(api.drawAxis, xAxis())
    out.axisXGrid = record(api.drawAxis, xAxis({ showGridLines: true, gridLinesStrokeDasharray: "ShortDot" }))
    out.axisXTop = record(api.drawAxis, xAxis({ orient: "top", transform: [0, 0] }))
    out.axisXNoTicks = record(api.drawAxis, xAxis({ showTicks: false }))
    out.axisXTickValues = record(api.drawAxis, xAxis({ tickValues: [0, 10, 20, 30] }))
    out.axisXTickInterval = record(api.drawAxis, xAxis({ tickInterval: 5 }))
    out.axisXFormatted = record(api.drawAxis, xAxis({ tickFormat: value => `#${value}` }))

    out.axisY = record(api.drawAxis, yAxis())
    out.axisYLeft = record(api.drawAxis, yAxis({ orient: "left", transform: [0, 0] }))
    out.axisYGrid = record(api.drawAxis, yAxis({ showGridLines: true }))
    out.axisYOuter = record(api.drawAxis, yAxis({ outerTickSize: 6 }))

    // Mật độ tick cao trên trục ngang là chỗ duy nhất chạy vào mô phỏng lực đẩy nhãn.
    // Nhiều mức khác nhau vì lượng dịch chuyển phụ thuộc vào khoảng cách giữa các tick:
    // thưa quá thì không có va chạm nào, dày quá thì nhãn nào cũng dịch xa.
    out.axisXCrowded = record(api.drawAxis, xAxis({ ticks: 40 }))
    out.axisXTight = record(api.drawAxis, xAxis({ ticks: 24 }))
    out.axisXBarely = record(api.drawAxis, xAxis({ ticks: 16 }))
    out.axisYCrowded = record(api.drawAxis, yAxis({ ticks: 30 }))

    // ── kéo trục cho giãn ra ──────────────────────────────────────────────────────
    //
    // Kéo ra xa giữa trục thì range giãn, domain hẹp lại, chart phóng to. Cả hai đầu đi
    // ngược chiều nhau cùng một lượng, nên giữa trục đứng yên. Đây là toán thuần, so số.

    const tidy = value => (typeof value === "number" ? Math.round(value * 1e6) / 1e6 : value)

    const zoomOn = (scale, startXY, mouseXY, extra = {}) => {
        const domain = api.axisZoomDomain({
            startScale: scale,
            startXY,
            mouseXY,
            getMouseDelta: (start, mouse) => start[0] - mouse[0],
            ...extra,
        })
        return domain === undefined ? "undefined" : domain.map(tidy)
    }

    const zoomScale = () => scaleLinear().domain([0, 39]).range([0, 760])

    out.axisZoom = {
        // kéo sang trái từ giữa: range giãn ra, domain hẹp lại
        stretch: zoomOn(zoomScale(), [400, 20], [300, 20]),
        // kéo sang phải: ngược lại
        squash: zoomOn(zoomScale(), [400, 20], [500, 20]),
        // không di chuyển thì không đổi gì
        still: zoomOn(zoomScale(), [400, 20], [400, 20]),
        // kéo quá đà: hai đầu vượt qua nhau, trục lộn ngược — phải từ chối
        tooFar: zoomOn(zoomScale(), [400, 20], [0, 20]),
        // ngay trước ngưỡng ấy thì vẫn nhận
        almostTooFar: zoomOn(zoomScale(), [400, 20], [30, 20]),
        // không đảo dấu: kéo ra xa lại thành thu vào
        notInverted: zoomOn(zoomScale(), [400, 20], [300, 20], { inverted: false }),
    }

    // trục dọc: cùng phép toán, nhưng range chạy ngược (360 → 0) nên dấu khác
    const zoomOnY = (startXY, mouseXY) =>
        api
            .axisZoomDomain({
                startScale: scaleLinear().domain([90, 115]).range([360, 0]),
                startXY,
                mouseXY,
                getMouseDelta: (start, mouse) => start[1] - mouse[1],
            })
            ?.map(tidy) ?? "undefined"

    out.axisZoomY = {
        stretch: zoomOnY([20, 200], [20, 140]),
        squash: zoomOnY([20, 200], [20, 260]),
        tooFar: zoomOnY([20, 200], [20, 0]),
        almostTooFar: zoomOnY([20, 200], [20, 30]),
    }

    // Thang có `invert` khác nhau thì domain ra khác nhau, nên kiểm cả thang log
    out.axisZoomOther = {
        wideDomain: zoomOn(scaleLinear().domain([-500, 500]).range([0, 760]), [400, 20], [250, 20]),
        flippedRange: zoomOn(scaleLinear().domain([0, 39]).range([760, 0]), [400, 20], [300, 20]),
    }

    // ── vùng bắt chuột trên trục ──────────────────────────────────────────────────

    const capture = (bg, extra = {}) =>
        stripPrefix(
            normalizeSvg(
                api.axisZoomCaptureRect({ bg, className: "chart-x-axis", zoomCursorClassName: "", ...extra }),
            ),
        )

    out.axisZoomCaptureX = capture({ x: 0, y: 0, h: 25, w: 760 })
    out.axisZoomCaptureXTop = capture({ x: 0, y: -25, h: 25, w: 760 })
    out.axisZoomCaptureY = capture({ x: 0, y: 0, h: 360, w: 40 })
    out.axisZoomCaptureYLeft = capture({ x: -40, y: 0, h: 360, w: 40 })
    // đang kéo: con trỏ đổi
    out.axisZoomCaptureDragging = capture(
        { x: 0, y: 0, h: 25, w: 760 },
        { dragging: true, zoomCursorClassName: "chart-ew-resize-cursor" },
    )

    return out
}
