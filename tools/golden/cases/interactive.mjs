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
import { normalizeSvg, stripPrefix } from "../svgtree.mjs"

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

    // ── kênh song song ────────────────────────────────────────────────────────────

    const channel = {
        startXY: [5, 95],
        endXY: [30, 110],
        dy: 6,
        strokeStyle: "#000000",
        fillStyle: "#8888884d",
        // Không có onHover thì bản gốc trả false thẳng, không thèm tính — bài kiểm nào
        // quên chỗ này sẽ toàn false và không chứng minh được gì. Có một mục riêng ở
        // dưới đo đúng cái cửa chặn ấy.
        onHover: () => {},
    }

    out.draw_channel = record(api.drawChannelWithArea, channel)
    out.draw_channel_negative_dy = record(api.drawChannelWithArea, { ...channel, dy: -6 })
    // chưa có dy: mới kéo được đường thứ nhất, chưa tách thành kênh
    out.draw_channel_no_dy = record(api.drawChannelWithArea, { ...channel, dy: undefined })

    /**
     * Trỏ vào thân kênh: **chỗ bản port cố tình khác bản gốc**.
     *
     * `isHover` của bản gốc lấy toạ độ **pixel** rồi đưa vào `isHovering`, mà hàm ấy chờ
     * toạ độ **giá trị** và sẽ nhân thang một lần nữa. Quét cả khung 760×360 ở bản gốc:
     * trúng 0 trên 68.961 điểm — thân kênh không bao giờ trỏ vào được, dù chính bản gốc
     * đã gắn cho nó con trỏ "move" và một tay kéo cả kênh.
     *
     * Bản port bỏ một lần nhân thang thừa ấy. Vì thế hai phía không thể khớp ở đây, nên
     * mấy điểm "trúng" không nằm trong bộ so — chúng được đo trong trình duyệt, ở
     * test.browser.js. Chỗ nào hai bên vẫn đồng ý thì vẫn so bình thường:
     */
    const channelHoverAt = mouseXY => api.isChannelHover(moreProps({ mouseXY }), channel)
    out.channel_hover = {
        aboveTheBand: channelHoverAt([xScale()(17.5), yScale()(102.5) - 20]),
        belowTheBand: channelHoverAt([xScale()(17.5), yScale()(102.5) + 40]),
        // không ai nghe thì không cần tính: cửa chặn của chính bản gốc, bản port giữ nguyên
        noListener: api.isChannelHover(moreProps({ mouseXY: [xScale()(17.5), yScale()(102.5)] }), {
            ...channel,
            onHover: undefined,
        }),
    }

    // ── kênh hồi quy ──────────────────────────────────────────────────────────────

    const regression = {
        x1Value: 4,
        x2Value: 32,
        type: "SD",
        strokeStyle: "#000000",
        fillStyle: "#8888884d",
        onHover: () => {},
    }

    out.draw_regression = record(api.drawLinearRegressionChannel, regression)
    out.draw_regression_narrow = record(api.drawLinearRegressionChannel, { ...regression, x1Value: 12, x2Value: 20 })
    // hai đầu đảo chiều: người dùng kéo từ phải sang trái
    out.draw_regression_backwards = record(api.drawLinearRegressionChannel, {
        ...regression,
        x1Value: 32,
        x2Value: 4,
    })

    const regressionHoverAt = mouseXY => api.isRegressionHover(moreProps({ mouseXY }), regression)
    out.regression_hover = {
        nearTheFit: regressionHoverAt([xScale()(18), yScale()(102)]),
        farAbove: regressionHoverAt([xScale()(18), 10]),
        farBelow: regressionHoverAt([xScale()(18), 350]),
    }

    /**
     * Quét một cột dọc và ghi lại đúng những y trỏ trúng.
     *
     * Ba đường của kênh hồi quy cách nhau bằng một độ lệch chuẩn, mà con số ấy bản gốc
     * không xuất khẩu — nên thay vì đoán chỗ đặt con trỏ, cứ dò cả cột: kết quả là ba
     * đoạn y, và bất kỳ đường nào lệch hay mất đều đổi danh sách này.
     */
    const hoverColumn = (test, x, step = 2) => {
        const found = []
        for (let y = 0; y <= 360; y += step) if (test([x, y])) found.push(y)
        return found
    }

    out.regression_hover_column = hoverColumn(
        mouseXY => api.isRegressionHover(moreProps({ mouseXY }), regression),
        350,
    )

    out.regression_edges = {
        edge1: api.edge1Provider(regression)(moreProps()).map(tidy),
        edge2: api.edge2Provider(regression)(moreProps()).map(tidy),
    }

    // ── quạt Gann ─────────────────────────────────────────────────────────────────

    const fan = {
        startXY: [5, 95],
        endXY: [30, 110],
        strokeStyle: "#000000",
        fillStyle: ["#1f77b433", "#ff7e0e33", "#2ca02c33", "#d6272733", "#9467bd33", "#8c564b33", "#e377c233"],
        fontFamily: "sans-serif",
        fontSize: 10,
        fontFill: "#000000",
        onHover: () => {},
    }

    out.draw_gannFan = record(api.drawGannFan, fan)
    // quạt hướng xuống: dy đổi dấu, các tia lật theo
    out.draw_gannFan_falling = record(api.drawGannFan, { ...fan, startXY: [5, 110], endXY: [30, 95] })
    // dx bằng không thì không có quạt nào cả, chứ không phải chia cho không
    out.draw_gannFan_degenerate = record(api.drawGannFan, { ...fan, endXY: [5, 110] })

    const fanHoverAt = mouseXY => api.isGannFanHover(moreProps({ mouseXY }), fan)
    out.gannFan_hover = {
        onTheOneToOne: fanHoverAt([xScale()(17.5), yScale()(102.5)]),
        onAnotherRay: fanHoverAt([xScale()(17.5), yScale()(110)]),
        insideTheWedge: fanHoverAt([xScale()(20), yScale()(104)]),
        // các tia vô hạn về một phía — phía kia không được ăn theo
        behindTheOrigin: fanHoverAt([xScale()(1), yScale()(93)]),
        // Ngay quá đầu một tia, trong dải rộng đúng bằng dung sai: `isHovering2` một mình
        // vẫn nhận (nó chỉ chặn theo x), nên bản gốc chặn thêm bằng hộp bao của tia. Bỏ
        // hộp bao ấy đi thì 512 điểm trong khung đổi câu trả lời — điểm này là một.
        justPastTheTipOfARay: fanHoverAt([94, 285]),
    }

    // chín tia toả ra từ một điểm, nên một cột dọc cắt chúng ở những chỗ rất riêng
    out.gannFan_hover_column = hoverColumn(mouseXY => api.isGannFanHover(moreProps({ mouseXY }), fan), 400)

    // ── mức Fibonacci ─────────────────────────────────────────────────────────────

    out.fibLines = api.fibRetracementLines({ x1: 5, y1: 95, x2: 30, y2: 110 }).map(line => ({
        x1: tidy(line.x1),
        x2: tidy(line.x2),
        y: tidy(line.y),
        percent: tidy(line.percent),
    }))
    out.fibLinesInverted = api.fibRetracementLines({ x1: 5, y1: 110, x2: 30, y2: 95 }).map(line => ({
        x1: tidy(line.x1),
        x2: tidy(line.x2),
        y: tidy(line.y),
        percent: tidy(line.percent),
    }))

    // ── chữ đặt trên biểu đồ ──────────────────────────────────────────────────────

    const textProps = {
        position: [17, 103],
        text: "mua ở đây",
        textFill: "#F10040",
        bgFillStyle: "#D3D3D3",
        bgStroke: "#F10040",
        bgStrokeWidth: 1,
        fontFamily: "sans-serif",
        fontSize: 12,
        fontStyle: "normal",
        fontWeight: "normal",
        onHover: () => {},
    }

    /** Đo chữ rồi mới trỏ được: cùng một thực thể, vẽ trước hỏi sau. */
    const textAt = (mouseXY, props = textProps) => {
        const context = createRecorder()
        const hovering = api.textDrawThenHover(context, moreProps(), moreProps({ mouseXY }), props)
        return { calls: context.calls, hovering }
    }

    const textCentre = [xScale()(17), yScale()(103)]

    out.draw_text = textAt(textCentre).calls
    out.draw_text_selected = textAt(textCentre, { ...textProps, selected: true }).calls

    out.text_hover = {
        atTheCentre: textAt(textCentre).hovering,
        // hộp rộng hơn chữ đúng một cỡ chữ mỗi bên
        justInsideTheBox: textAt([textCentre[0] + 40, textCentre[1] + 10]).hovering,
        outsideTheBox: textAt([textCentre[0] + 90, textCentre[1]]).hovering,
        wellBelow: textAt([textCentre[0], textCentre[1] + 60]).hovering,
    }

    // ── nhãn cảnh báo giá và dấu xoá của nó ───────────────────────────────────────

    const textBox = {
        height: 24,
        left: 20,
        padding: { left: 10, right: 5 },
        closeIcon: { padding: { left: 5, right: 8 }, width: 8 },
    }

    const alertProps = {
        yValue: 103,
        text: "Alert",
        textBox,
        edge: {
            stroke: "#6574CD",
            strokeOpacity: 1,
            strokeWidth: 1,
            fill: "#FFFFFF",
            fillOpacity: 1,
            orient: "right",
            at: "right",
            arrowWidth: 10,
            dx: 0,
            rectWidth: 50,
            rectHeight: 20,
            displayFormat: value => value.toFixed(2),
        },
        bgFillStyle: "#FFFFFF",
        textFill: "#6574CD",
        strokeStyle: "#6574CD",
        strokeDasharray: "ShortDash2",
        strokeWidth: 1,
        fontFamily: "sans-serif",
        fontSize: 12,
        fontStyle: "normal",
        fontWeight: "normal",
        onHover: () => {},
    }

    const alertAt = (mouseXY, props = alertProps) => {
        const context = createRecorder()
        const hovering = api.yCoordinateDrawThenHover(context, moreProps(), moreProps({ mouseXY }), props)
        return { calls: context.calls, hovering }
    }

    const alertY = Math.round(yScale()(103))

    out.draw_alert = alertAt([0, 0]).calls
    out.draw_alert_selected = alertAt([0, 0], { ...alertProps, selected: true }).calls
    out.draw_alert_hovering = alertAt([0, 0], { ...alertProps, hovering: true }).calls
    // giá trôi khỏi khung thì không vẽ gì cả, chứ không dán vào mép
    out.draw_alert_offscreen = alertAt([0, 0], { ...alertProps, yValue: 130 }).calls

    out.alert_hover = {
        onTheLabel: alertAt([60, alertY]).hovering,
        onTheLineFarRight: alertAt([600, alertY]).hovering,
        justOffTheLine: alertAt([600, alertY + 10]).hovering,
        offscreenValue: alertAt([60, alertY], { ...alertProps, yValue: 130 }).hovering,
    }

    const closeIconProps = {
        show: true,
        yValue: 103,
        text: "Alert",
        textBox,
        strokeStyle: "#6574CD",
        fontFamily: "sans-serif",
        fontSize: 12,
        fontStyle: "normal",
        fontWeight: "normal",
    }

    const closeIconAt = (mouseXY, props = closeIconProps) => {
        const context = createRecorder()
        const hovering = api.closeIconDrawThenHover(context, moreProps(), moreProps({ mouseXY }), props)
        return { calls: context.calls, hovering }
    }

    out.draw_closeIcon = closeIconAt([0, 0]).calls
    out.draw_closeIcon_hovering = closeIconAt([0, 0], { ...closeIconProps, hovering: true }).calls

    // dấu ✕ nằm sau chữ: 20 + 10 + 42 (bề rộng chữ giả) + 5 + 5 + 4
    const closeIconX = 86
    out.closeIcon_hover = {
        onTheCross: closeIconAt([closeIconX, alertY]).hovering,
        onTheUpperLeftTip: closeIconAt([closeIconX - 4, alertY - 4]).hovering,
        // ngay ngoài đầu nét: dấu ✕ hữu hạn, không phải hai đường thẳng vô hạn
        justPastTheCross: closeIconAt([closeIconX + 6, alertY]).hovering,
        wellAway: closeIconAt([closeIconX + 30, alertY]).hovering,
    }

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
