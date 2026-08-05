/**
 * Bài kiểm cho phần vẽ bằng SVG: tooltip và annotation.
 *
 * Cùng nguyên tắc với phần canvas — một file case chạy cho cả hai phía — nhưng thứ được
 * so là **cây SVG** đã quy chuẩn, không phải chuỗi lệnh. Xem `tools/golden/svgtree.mjs`.
 */

import { scaleLinear } from "d3-scale"
import { normalizeSvg, stripPrefix } from "../svgtree.mjs"
import { datasets } from "../data.mjs"

export const name = "svg"

const rows = datasets.daily.slice(0, 40).map((row, index) => ({ ...row, index }))

const xAccessor = datum => datum.index

const chartConfig = () => ({
    id: 0,
    origin: [0, 0],
    width: 760,
    height: 360,
    yScale: scaleLinear().domain([90, 115]).range([360, 0]),
})

const moreProps = (overrides = {}) => ({
    xAccessor,
    xScale: scaleLinear().domain([0, 39]).range([0, 760]),
    chartConfig: chartConfig(),
    chartConfigs: [chartConfig()],
    plotData: rows,
    fullData: rows,
    width: 760,
    height: 360,
    chartId: 0,
    show: true,
    mouseXY: [380, 140],
    currentItem: rows[20],
    currentCharts: [0],
    displayXAccessor: xAccessor,
    ...overrides,
})


const render = (draw, props, extra) => stripPrefix(normalizeSvg(draw(moreProps(extra), props)))

export function run(api) {
    const out = {}

    out.singleValue = render(api.renderSingleValueTooltip, { yLabel: "Giá", yAccessor: d => d.close })
    out.singleValueWithX = render(api.renderSingleValueTooltip, {
        yLabel: "Giá",
        yAccessor: d => d.close,
        xLabel: "Phiên",
        xAccessor: d => d.index,
    })
    out.singleValueStyled = render(api.renderSingleValueTooltip, {
        yLabel: "Khối lượng",
        yAccessor: d => d.volume,
        origin: [10, 20],
        labelFill: "#26a69a",
        valueFill: "#333333",
        fontSize: 14,
        fontWeight: 700,
    })
    // con trỏ ở nơi khác: phải lùi về điểm cuối chứ không để trống
    out.singleValueNoCursor = render(
        api.renderSingleValueTooltip,
        { yLabel: "Giá", yAccessor: d => d.close },
        { currentItem: undefined },
    )
    // origin là hàm của kích thước pane
    out.singleValueOriginFunction = render(api.renderSingleValueTooltip, {
        yLabel: "Giá",
        yAccessor: d => d.close,
        origin: (width, height) => [width - 100, height - 20],
    })

    out.ohlc = render(api.renderOHLCTooltip, {})
    out.ohlcStyled = render(api.renderOHLCTooltip, {
        origin: [8, 16],
        labelFill: "#4682B4",
        textFill: "#111111",
        fontSize: 12,
        displayTexts: { o: "Mở ", h: " Cao ", l: " Thấp ", c: " Đóng ", na: "—" },
    })
    out.ohlcTextFillByItem = render(api.renderOHLCTooltip, {
        textFill: datum => (datum.close > datum.open ? "#26a69a" : "#ef5350"),
    })
    out.ohlcNoData = render(api.renderOHLCTooltip, { accessor: () => undefined })

    // ── tooltip gắn chỉ báo ───────────────────────────────────────────────────────

    const indicators = rows.map((row, index) => ({
        ...row,
        bb: { top: row.high + 2, middle: (row.high + row.low) / 2, bottom: row.low - 2 },
        macd: { macd: index / 10, signal: index / 12, divergence: index / 60 },
        rsi: 40 + (index % 40),
        stochastic: { K: 30 + (index % 60), D: 40 + (index % 40) },
    }))
    const onIndicators = { plotData: indicators, fullData: indicators, currentItem: indicators[20] }

    out.rsiTooltip = render(api.renderRSITooltip, { yAccessor: d => d.rsi, options: { windowSize: 14 } }, onIndicators)
    out.rsiTooltipNoValue = render(
        api.renderRSITooltip,
        { yAccessor: () => undefined, options: { windowSize: 14 } },
        onIndicators,
    )

    out.bollingerTooltip = render(
        api.renderBollingerBandTooltip,
        { options: { sourcePath: "close", windowSize: 20, multiplier: 2, movingAverageType: "sma" } },
        onIndicators,
    )

    out.macdTooltip = render(
        api.renderMACDTooltip,
        {
            yAccessor: d => d.macd,
            options: { slow: 26, fast: 12, signal: 9 },
            appearance: { strokeStyle: { macd: "#0093FF", signal: "#D84315" }, fillStyle: { divergence: "#4682B4" } },
        },
        onIndicators,
    )

    out.stochasticTooltip = render(
        api.renderStochasticTooltip,
        {
            yAccessor: d => d.stochastic,
            options: { windowSize: 14, kWindowSize: 3, dWindowSize: 3 },
            appearance: { stroke: { kLine: "#74D400", dLine: "#EA2BFF" } },
        },
        onIndicators,
    )

    const maOptions = [
        { yAccessor: d => d.close, type: "SMA", stroke: "#1f77b4", windowSize: 10 },
        { yAccessor: d => d.open, type: "EMA", stroke: "#ff7f0e", windowSize: 20 },
    ]
    out.movingAverageTooltip = render(api.renderMovingAverageTooltip, { options: maOptions })

    const groupOptions = [
        { yLabel: "Đóng", yAccessor: d => d.close, valueFill: "#26a69a", withShape: true },
        { yLabel: "Mở", yAccessor: d => d.open, valueFill: "#ef5350" },
    ]
    for (const layout of ["horizontal", "horizontalRows", "horizontalInline", "vertical", "verticalRows"]) {
        out[`groupTooltip_${layout}`] = render(api.renderGroupTooltip, { options: groupOptions, layout })
    }
    out.groupTooltipCorner = render(api.renderGroupTooltip, { options: groupOptions, position: "bottomRight" })

    // ── annotations ───────────────────────────────────────────────────────────────

    out.labelAnnotation = render(
        api.renderAnnotate,
        {
            with: api.renderLabelAnnotation,
            when: datum => datum.index % 9 === 0,
            usingProps: { y: ({ yScale, datum }) => yScale(datum.high) - 6, text: "▲", fill: "#26a69a" },
        },
    )
    out.svgPathAnnotation = render(api.renderAnnotate, {
        with: api.renderSvgPathAnnotation,
        when: datum => datum.index % 11 === 0,
        usingProps: {
            y: ({ yScale, datum }) => yScale(datum.low),
            path: () => "M0,0L6,10L-6,10Z",
            pathWidth: 6,
            pathHeight: 10,
            fill: "#ef5350",
        },
    })
    out.barAnnotation = render(api.renderAnnotate, {
        with: api.renderBarAnnotation,
        when: datum => datum.index % 13 === 0,
        usingProps: {
            y: ({ yScale, datum }) => yScale(datum.high),
            text: "mua",
            textIcon: "★",
            textRotate: 90,
            textIconRotate: -45,
            textIconXOffset: 2,
            textIconYOffset: -4,
            tooltip: datum => `phiên ${datum.index}`,
            path: ({ x, y }) => `M${x},${y}L${x + 4},${y + 8}L${x - 4},${y + 8}Z`,
        },
    })

    return out
}
