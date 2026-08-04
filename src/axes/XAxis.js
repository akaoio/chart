import { drawAxis } from "./Axis.js"
import { Series } from "../series/Series.js"
import { define } from "../core/element.js"

/** Fewer ticks on a narrow chart, or the labels collide into mush. */
const ticksForWidth = width => (width < 400 ? 2 : width < 500 ? 6 : 8)

export const xAxisDefaults = {
    axisAt: "bottom",
    orient: "bottom",
    fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
    fontSize: 12,
    fontWeight: 400,
    getMouseDelta: (startXY, mouseXY) => startXY[0] - mouseXY[0],
    gridLinesStrokeStyle: "#E2E4EC",
    gridLinesStrokeWidth: 1,
    gridLinesStrokeDasharray: undefined,
    outerTickSize: 0,
    innerTickSize: 4,
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
    xZoomHeight: 25,
    zoomEnabled: true,
    edgeClip: false,
}

/**
 * The time axis: `<chart-x-axis>`.
 *
 * Its scale is rebuilt from the pane's full width rather than reused as-is, so ticks
 * still appear in the margin beyond the last data point instead of stopping dead at it.
 */
export class XAxis extends Series {
    static defaults = xAxisDefaults

    get clip() {
        return false
    }

    get axisProps() {
        const config = this.chartConfig
        if (!config) return null

        const { width, height } = config
        const { axisAt, orient, ticks, xZoomHeight } = this.seriesProps

        const axisLocation =
            axisAt === "top" ? 0 : axisAt === "bottom" ? height : axisAt === "middle" ? height / 2 : axisAt

        return {
            ...this.seriesProps,
            transform: [0, axisLocation],
            range: [0, width],
            bg: { x: 0, y: orient === "top" ? -xZoomHeight : 0, h: xZoomHeight, w: width },
            ticks: ticks ?? ticksForWidth(width),
            getScale: moreProps => {
                const { xScale, width: chartWidth } = moreProps
                if (!xScale.invert) return xScale

                const trueRange = [0, chartWidth]
                return xScale.copy().domain(trueRange.map(xScale.invert)).range(trueRange)
            },
        }
    }

    canvasDraw(context, moreProps) {
        const props = this.axisProps
        if (props !== null) drawAxis(context, moreProps, props)
    }
}

define("chart-x-axis", XAxis)
