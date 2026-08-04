import { withDefaults } from "../core/utils/index.js"
import { drawAreaOnlySeries } from "./AreaOnlySeries.js"
import { drawLineSeries } from "./LineSeries.js"
import { Series } from "./Series.js"
import { define } from "../core/element.js"

export const areaSeriesDefaults = {
    fillStyle: "rgba(33, 150, 243, 0.1)",
    strokeStyle: "#2196f3",
    strokeWidth: 3,
    strokeDasharray: "Solid",
    yAccessor: undefined,
    baseAt: undefined,
    connectNulls: undefined,
    curve: undefined,
    canvasClip: undefined,
}

/** A line with the region beneath it filled. Fill first, so the line sits on top. */
export const drawAreaSeries = (context, moreProps, props) => {
    const { baseAt, connectNulls, strokeStyle, strokeWidth, strokeDasharray, fillStyle, curve, canvasClip, yAccessor } =
        withDefaults(areaSeriesDefaults, props)

    drawAreaOnlySeries(context, moreProps, {
        connectNulls,
        yAccessor,
        curve,
        base: baseAt,
        fillStyle,
        canvasClip,
    })

    drawLineSeries(context, moreProps, {
        connectNulls,
        yAccessor,
        strokeStyle,
        strokeWidth,
        strokeDasharray,
        curve,
        canvasClip,
        highlightOnHover: false,
    })
}

export class AreaSeries extends Series {
    static defaults = areaSeriesDefaults

    canvasDraw(context, moreProps) {
        drawAreaSeries(context, moreProps, this.seriesProps)
    }
}

define("chart-area-series", AreaSeries)
