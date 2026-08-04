import { withDefaults } from "../core/utils/index.js"
import { drawAreaSeries } from "./AreaSeries.js"
import { Series } from "./Series.js"
import { define } from "../core/element.js"

export const alternatingFillAreaSeriesDefaults = {
    connectNulls: false,
    baseAt: undefined,
    yAccessor: undefined,
    curve: undefined,
    fillStyle: { top: "rgba(38, 166, 154, 0.1)", bottom: "rgba(239, 83, 80, 0.1)" },
    strokeStyle: { top: "#26a69a", bottom: "#ef5350" },
    strokeWidth: { top: 2, bottom: 2 },
    strokeDasharray: { top: "Solid", bottom: "Solid" },
}

/**
 * One area drawn twice, in two colours, clipped above and below a reference level.
 *
 * This is how a chart shows profit green and loss red without splitting the data: the
 * same line is drawn twice with the canvas clipped to one half each time, so the colour
 * changes exactly where the line crosses the base — not at the nearest data point.
 */
export const drawAlternatingFillAreaSeries = (context, moreProps, props) => {
    const { connectNulls, yAccessor, curve, baseAt, fillStyle, strokeStyle, strokeWidth, strokeDasharray } =
        withDefaults(alternatingFillAreaSeriesDefaults, props)

    const base = yScale => yScale(baseAt)

    const clipTo = (top) => (clipContext, clipMoreProps) => {
        const { yScale, width, height } = clipMoreProps.chartConfig
        const level = yScale(baseAt)

        clipContext.beginPath()
        if (top) clipContext.rect(0, 0, width, level)
        else clipContext.rect(0, level, width, height - level)
        clipContext.clip()
    }

    for (const side of ["top", "bottom"]) {
        drawAreaSeries(context, moreProps, {
            canvasClip: clipTo(side === "top"),
            connectNulls,
            yAccessor,
            curve,
            baseAt: base,
            fillStyle: fillStyle[side],
            strokeStyle: strokeStyle[side],
            strokeDasharray: strokeDasharray[side],
            strokeWidth: strokeWidth[side],
        })
    }
}

export class AlternatingFillAreaSeries extends Series {
    static defaults = alternatingFillAreaSeriesDefaults

    canvasDraw(context, moreProps) {
        drawAlternatingFillAreaSeries(context, moreProps, this.seriesProps)
    }
}

define("chart-alternating-fill-area-series", AlternatingFillAreaSeries)
