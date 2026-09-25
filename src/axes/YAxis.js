import { drawAxis } from "./Axis.js"
import { Series } from "../series/Series.js"
import { define } from "../core/element.js"
import "./AxisZoomCapture.js"

/** Fewer ticks on a short pane — a 100px volume pane cannot carry eight labels. */
const ticksForHeight = height => (height < 300 ? 2 : height < 500 ? 6 : 8)

export const yAxisDefaults = {
    axisAt: "right",
    orient: "right",
    fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
    fontSize: 12,
    fontWeight: 400,
    getMouseDelta: (startXY, mouseXY) => startXY[1] - mouseXY[1],
    gridLinesStrokeStyle: "#E2E4EC",
    gridLinesStrokeWidth: 1,
    gridLinesStrokeDasharray: undefined,
    innerTickSize: 4,
    outerTickSize: 0,
    showDomain: true,
    showGridLines: false,
    showTicks: true,
    showTickLabel: true,
    strokeStyle: "#000000",
    strokeWidth: 1,
    tickPadding: 4,
    tickLabelFill: "#000000",
    tickStrokeStyle: "#000000",
    tickStrokeWidth: 1,
    tickStrokeDasharray: undefined,
    tickFormat: undefined,
    tickValues: undefined,
    tickInterval: undefined,
    tickIntervalFunction: undefined,
    ticks: undefined,
    abbreviate: true,
    yZoomWidth: 40,
    zoomEnabled: true,
    onDoubleClick: undefined,
    onContextMenu: undefined,
    zoomCursorClassName: "chart-ns-resize-cursor",
}

/**
 * The price axis: `<chart-y-axis>`.
 *
 * Always `edgeClip`, so a label sitting at the very top or bottom of the pane is not
 * sliced in half by the pane's own clip rectangle.
 */
export class YAxis extends Series {
    static defaults = yAxisDefaults

    #zoomCapture = null
    #watching = null
    #hovering = false

    connectedCallback() {
        super.connectedCallback()

        if (this.#zoomCapture === null) {
            this.#zoomCapture = document.createElement("chart-axis-zoom-capture")
            this.#zoomCapture.axis = this
            this.append(this.#zoomCapture)
        }
    }

    disconnectedCallback() {
        this.#unwatchPointer()
        super.disconnectedCallback()
    }

    get clip() {
        return false
    }

    /**
     * Pane nào khoá trục giá thì trục ấy cũng không kéo giãn được — nếu không, kéo trục
     * sẽ đổi domain rồi khung hình sau lại tính lại về chỗ cũ, và trục giật ngược lại.
     */
    get axisZoomEnabled() {
        const { zoomEnabled } = this.seriesProps
        return Boolean(zoomEnabled && this.chartConfig?.yPan)
    }

    axisZoomCallback(domain) {
        this.canvas?.yAxisZoom(this.chartId, domain)
    }

    /**
     * Kéo dọc trên dải này là giãn thang giá.
     *
     * Bản gốc chọn đúng con trỏ này (`zoomCursorClassName` mặc định là `ns-resize`) nhưng
     * chỉ áp nó trong lúc đang kéo. Ở đây nó là con trỏ lúc nghỉ.
     */
    get axisCursorClass() {
        return "chart-ns-resize-cursor"
    }

    /**
     * Nhấp đúp lên cột giá: về tự-vừa-khung.
     *
     * `resetYDomain` đưa thang giá của pane này về `realYDomain` và tắt `yPanEnabled` —
     * nên nó cũng là đường ra khỏi chế độ kéo dọc. Không có cử chỉ này thì chạm vào cột
     * giá một lần là kẹt ở chế độ thủ công mãi.
     */
    axisDoubleClick(event, position) {
        const { onDoubleClick } = this.seriesProps
        if (onDoubleClick !== undefined) return onDoubleClick(event, position)

        this.canvas?.resetYDomain(this.chartId)
    }

    get edgeClip() {
        return true
    }

    // ── rê chuột lên cột giá thì số trở lại đầy đủ ────────────────────────────────

    /**
     * Cột giá, tính bằng toạ độ của chính `<chart-canvas>`.
     *
     * Nó nằm trong **margin**, tức ngoài vùng `EventCapture` bắt chuột — vùng ấy chỉ rộng
     * bằng phần vẽ. Nên chuột đi qua cột giá không sinh ra `mousemove` nào của thư viện,
     * và dải này phải tự hỏi lấy phần tử canvas.
     *
     * Bề ngang là cả cột chứ không phải `yZoomWidth`: người ta rê chuột lên "chỗ có mấy
     * con số", không lên một dải 40px vô hình bên trong nó. Bề dọc là của riêng pane này —
     * xếp ba pane chồng lên nhau thì mỗi trục chỉ nhận phần cột ngang tầm nó.
     */
    #priceColumn() {
        const config = this.chartConfig
        const margin = this.canvas?.margin
        if (!config || !margin) return null

        const { axisAt, yZoomWidth } = this.seriesProps
        const { width, height, origin } = config

        const axisLocation =
            axisAt === "left" ? 0 : axisAt === "right" ? width : axisAt === "middle" ? width / 2 : axisAt
        if (typeof axisLocation !== "number") return null

        const left = margin.left + axisLocation
        const top = margin.top + (origin?.[1] ?? 0)

        if (axisAt === "left") return { left: left - margin.left, right: left, top, bottom: top + height }
        if (axisAt === "right") return { left, right: left + margin.right, top, bottom: top + height }

        return { left, right: left + yZoomWidth, top, bottom: top + height }
    }

    #handlePointerMove = event => {
        const canvas = this.canvas
        const column = this.#priceColumn()
        if (canvas === null || column === null) return

        const box = canvas.getBoundingClientRect()
        const x = event.clientX - box.left
        const y = event.clientY - box.top

        this.#setHovering(x >= column.left && x <= column.right && y >= column.top && y <= column.bottom)
    }

    #handlePointerLeave = () => this.#setHovering(false)

    /**
     * Vẽ lại CẢ biểu đồ, không vẽ lại riêng trục.
     *
     * Trục dùng chung canvas với series, mà một lần vẽ lẻ không xoá gì cả — nhãn cũ sẽ
     * còn nguyên dưới nhãn mới. Đổi trạng thái chỉ xảy ra lúc chuột vào và lúc chuột ra,
     * mỗi lần một cú vẽ, nên đây không phải chuyện của mỗi bước chuột.
     */
    #setHovering(hovering) {
        if (hovering === this.#hovering) return

        this.#hovering = hovering
        this.canvas?.requestRedraw?.()
    }

    #watchPointer() {
        const canvas = this.canvas

        if (canvas === null || !this.seriesProps.abbreviate) return this.#unwatchPointer()
        if (this.#watching === canvas) return

        this.#unwatchPointer()
        canvas.addEventListener("mousemove", this.#handlePointerMove)
        canvas.addEventListener("mouseleave", this.#handlePointerLeave)
        this.#watching = canvas
    }

    #unwatchPointer() {
        this.#watching?.removeEventListener("mousemove", this.#handlePointerMove)
        this.#watching?.removeEventListener("mouseleave", this.#handlePointerLeave)
        this.#watching = null
        this.#hovering = false
    }

    get axisProps() {
        const config = this.chartConfig
        if (!config) return null

        const { width, height } = config
        const { abbreviate, axisAt, orient, ticks, yZoomWidth } = this.seriesProps

        const axisLocation =
            axisAt === "left" ? 0 : axisAt === "right" ? width : axisAt === "middle" ? width / 2 : axisAt

        return {
            ...this.seriesProps,
            locale: this.context?.locale,
            // Rê chuột lên cột là hỏi con số thật: viết tắt tắt đi trong lúc chuột còn ở đó.
            abbreviate: abbreviate && !this.#hovering,
            transform: [axisLocation, 0],
            range: [0, height],
            bg: { x: orient === "left" ? -yZoomWidth : 0, y: 0, h: height, w: yZoomWidth },
            ticks: ticks ?? ticksForHeight(height),
            getScale: moreProps => {
                const { yScale, flipYScale, height: paneHeight } = moreProps.chartConfig
                if (!yScale.invert) return yScale

                const trueRange = flipYScale ? [0, paneHeight] : [paneHeight, 0]
                return yScale.copy().domain(trueRange.map(yScale.invert)).range(trueRange)
            },
        }
    }

    canvasDraw(context, moreProps) {
        this.#watchPointer()

        const props = this.axisProps
        if (props !== null) drawAxis(context, moreProps, props)
    }
}

define("chart-y-axis", YAxis)
