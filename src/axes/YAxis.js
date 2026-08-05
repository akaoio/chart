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
    yZoomWidth: 40,
    zoomEnabled: true,
    onDoubleClick: undefined,
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

    connectedCallback() {
        super.connectedCallback()

        if (this.#zoomCapture === null) {
            this.#zoomCapture = document.createElement("chart-axis-zoom-capture")
            this.#zoomCapture.axis = this
            this.append(this.#zoomCapture)
        }
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

    get axisProps() {
        const config = this.chartConfig
        if (!config) return null

        const { width, height } = config
        const { axisAt, orient, ticks, yZoomWidth } = this.seriesProps

        const axisLocation =
            axisAt === "left" ? 0 : axisAt === "right" ? width : axisAt === "middle" ? width / 2 : axisAt

        return {
            ...this.seriesProps,
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
        const props = this.axisProps
        if (props !== null) drawAxis(context, moreProps, props)
    }
}

define("chart-y-axis", YAxis)
