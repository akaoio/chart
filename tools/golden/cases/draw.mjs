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
import { datasets } from "../data.mjs"

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

    return out
}
