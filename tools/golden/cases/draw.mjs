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
