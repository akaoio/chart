/**
 * Bài kiểm cho bậc 6: `interactive`.
 *
 * Nhóm này có ba tầng, và mỗi tầng chứng minh được theo một cách khác nhau:
 *
 *   hình học và tiện ích  → so số, như bậc 1 và bậc 5
 *   phần vẽ               → so chuỗi lệnh canvas, như bậc 3
 *   kéo thả và chọn       → chỉ trình duyệt mới trả lời được
 *
 * File này lo hai tầng đầu.
 */

import { scaleLinear } from "d3-scale"
import { createRecorder } from "../recorder.mjs"
import { normalizeSvg } from "../svgtree.mjs"

/**
 * Cùng một khác biệt có khai báo như ở bậc 4: tên lớp `react-financial-charts-*` thành
 * `chart-*`. Quy chuẩn cho **cả hai phía**, nên mọi khác biệt tên lớp ngoài đúng phép đổi
 * tiền tố ấy vẫn lộ ra.
 */
const stripPrefix = tree => {
    if (tree === null || typeof tree !== "object") return tree
    if (Array.isArray(tree)) return tree.map(stripPrefix)
    if (tree.text !== undefined) return tree

    const attrs = { ...tree.attrs }
    if (typeof attrs.class === "string") attrs.class = attrs.class.replace(/react-financial-charts-/g, "chart-")

    return { ...tree, attrs, children: (tree.children ?? []).map(stripPrefix) }
}
import { datasets } from "../data.mjs"

export const name = "interactive"

const rows = datasets.daily.slice(0, 40).map((row, index) => ({ ...row, index }))

const xScale = () => scaleLinear().domain([0, 39]).range([0, 760])
const yScale = () => scaleLinear().domain([90, 115]).range([360, 0])

const chartConfig = () => ({ id: 0, origin: [0, 0], width: 760, height: 360, yScale: yScale() })

const moreProps = (overrides = {}) => ({
    xAccessor: datum => datum.index,
    xScale: xScale(),
    chartConfig: chartConfig(),
    chartConfigs: [chartConfig()],
    plotData: rows,
    fullData: rows,
    width: 760,
    height: 360,
    chartId: 0,
    mouseXY: [380, 140],
    ...overrides,
})

const record = (draw, props, extra) => {
    const context = createRecorder()
    draw(context, moreProps(extra), props)
    return context.calls
}

const tidy = value => (typeof value === "number" ? Math.round(value * 1e6) / 1e6 : value)
const tidyLine = line => ({ x1: tidy(line.x1), y1: tidy(line.y1), x2: tidy(line.x2), y2: tidy(line.y2) })

export function run(api) {
    const out = {}

    // ── hình học đường thẳng ──────────────────────────────────────────────────────

    const cases = [
        ["rising", [5, 95], [30, 110]],
        ["falling", [5, 110], [30, 95]],
        ["vertical", [12, 95], [12, 110]],
        ["horizontal", [5, 102], [30, 102]],
        ["backwards", [30, 110], [5, 95]],
    ]

    for (const [label, start, end] of cases) {
        for (const type of ["LINE", "RAY", "XLINE"]) {
            out[`line_${label}_${type}`] = tidyLine(
                api.generateLine({ type, start, end, xScale: xScale(), yScale: yScale() }),
            )
        }

        out[`slope_${label}`] = tidy(api.getSlope(start, end) ?? "undefined")
    }

    out.yIntercept = tidy(api.getYIntercept(2, [10, 30]))

    // ── có đang trỏ vào đường không ───────────────────────────────────────────────

    const hoverAt = (mouseXY, extra = {}) =>
        api.isHovering({
            x1Value: 5,
            y1Value: 95,
            x2Value: 30,
            y2Value: 110,
            mouseXY,
            type: "LINE",
            tolerance: 7,
            xScale: xScale(),
            yScale: yScale(),
            ...extra,
        })

    // trên đường, ngay cạnh đường, xa đường, và ngoài hai đầu mút
    out.hovering = {
        onTheLine: hoverAt([xScale()(17.5), yScale()(102.5)]),
        justOff: hoverAt([xScale()(17.5), yScale()(102.5) + 5]),
        farOff: hoverAt([xScale()(17.5), yScale()(102.5) + 40]),
        pastTheEnd: hoverAt([xScale()(35), yScale()(113)]),
        beforeTheStart: hoverAt([xScale()(1), yScale()(93)]),
    }

    out.hovering2 = {
        onIt: api.isHovering2([0, 0], [100, 100], [50, 50], 7),
        nearIt: api.isHovering2([0, 0], [100, 100], [50, 55], 7),
        awayFromIt: api.isHovering2([0, 0], [100, 100], [50, 80], 7),
        // đường thẳng đứng đi vào nhánh riêng
        verticalOnIt: api.isHovering2([50, 0], [50, 100], [50, 40], 7),
        verticalNear: api.isHovering2([50, 0], [50, 100], [54, 40], 7),
        verticalPastEnd: api.isHovering2([50, 0], [50, 100], [50, 140], 7),
    }

    // ── phần vẽ ───────────────────────────────────────────────────────────────────

    for (const type of ["LINE", "RAY", "XLINE"]) {
        out[`draw_${type}`] = record(api.drawInteractiveStraightLine, {
            type,
            x1Value: 5,
            y1Value: 95,
            x2Value: 30,
            y2Value: 110,
            strokeStyle: "#000000",
            strokeWidth: 1,
        })
    }

    out.draw_dashed = record(api.drawInteractiveStraightLine, {
        type: "LINE",
        x1Value: 5,
        y1Value: 95,
        x2Value: 30,
        y2Value: 110,
        strokeStyle: "#ff0000",
        strokeWidth: 3,
        strokeDasharray: "ShortDash",
    })

    out.draw_vertical = record(api.drawInteractiveStraightLine, {
        type: "LINE",
        x1Value: 12,
        y1Value: 95,
        x2Value: 12,
        y2Value: 110,
        strokeStyle: "#000000",
    })

    // ── tiện ích ──────────────────────────────────────────────────────────────────

    out.getValueFromOverride = {
        matching: api.getValueFromOverride({ index: 2, x1Value: 42 }, 2, "x1Value", 7),
        differentIndex: api.getValueFromOverride({ index: 3, x1Value: 42 }, 2, "x1Value", 7),
        noOverride: api.getValueFromOverride(undefined, 2, "x1Value", 7),
    }

    out.getMorePropsForChart = (() => {
        const source = {
            chartConfig: [
                { id: "price", origin: [0, 0], height: 260 },
                { id: "volume", origin: [0, 280], height: 80 },
            ],
            mouseXY: [400, 310],
        }
        const narrowed = api.getMorePropsForChart(source, "volume")
        return { chartId: narrowed.chartConfig.id, mouseXY: narrowed.mouseXY }
    })()

    out.getMorePropsForChartNoMouse = (() => {
        const narrowed = api.getMorePropsForChart(
            { chartConfig: [{ id: 0, origin: [0, 0] }], mouseXY: undefined },
            0,
        )
        return { mouseXY: narrowed.mouseXY ?? "undefined" }
    })()

    out.getSelected = api.getSelected([
        { type: "TrendLine", objects: [{ selected: true, id: 1 }, { selected: false, id: 2 }] },
        { type: "Fib", objects: [{ selected: false, id: 3 }] },
        { type: "Channel", objects: [{ selected: true, id: 4 }] },
    ])

    // ── ZoomButtons: SVG, nên so cây chứ không so lệnh ────────────────────────────

    out.zoomButtons = stripPrefix(normalizeSvg(api.renderZoomButtons(moreProps(), {
        fill: "#ffffff",
        fillOpacity: 0.75,
        heightFromBase: 32,
        r: 16,
        stroke: "#e0e3eb",
        strokeWidth: 1,
        textFill: "#000000",
    })))

    // Sáu bước nội suy: chart không nhảy một phát mà đi từ từ, để mắt không mất chỗ
    out.zoomSteps = {
        in: api
            .zoomSteps(xScale(), rows, datum => datum.index, -1, 1.5)
            .map(step => step.map(tidy)),
        out: api
            .zoomSteps(xScale(), rows, datum => datum.index, 1, 1.5)
            .map(step => step.map(tidy)),
    }

    return out
}
