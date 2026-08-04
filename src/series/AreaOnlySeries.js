import { area } from "d3-shape"
import { first, functor, withDefaults } from "../core/utils/index.js"
import { Series } from "./Series.js"
import { define } from "../core/element.js"

export const areaOnlySeriesDefaults = {
    connectNulls: false,
    defined: value => value !== undefined && !isNaN(value),
    base: yScale => first(yScale.range()),
    yAccessor: undefined,
    curve: undefined,
    canvasClip: undefined,
    fillStyle: undefined,
}

/**
 * The filled region between the data and a baseline.
 *
 * `base` defaults to the bottom of the y range, but takes a function, which is what lets
 * an area be filled towards a moving reference — zero, a previous close, another series.
 */
export const drawAreaOnlySeries = (context, moreProps, props) => {
    const { connectNulls, fillStyle, curve, canvasClip, yAccessor, defined, base } = withDefaults(
        areaOnlySeriesDefaults,
        props,
    )

    const {
        xScale,
        chartConfig: { yScale },
        plotData,
        xAccessor,
    } = moreProps

    if (canvasClip !== undefined) {
        context.save()
        canvasClip(context, moreProps)
    }

    if (fillStyle !== undefined) {
        context.fillStyle = typeof fillStyle === "string" ? fillStyle : fillStyle(context, moreProps)
    }

    const newBase = functor(base)

    const areaSeries = area()
        .x(datum => Math.round(xScale(xAccessor(datum))))
        .y0(datum => newBase(yScale, datum, moreProps))
        .y1(datum => Math.round(yScale(yAccessor(datum))))

    if (curve !== undefined) areaSeries.curve(curve)
    if (!connectNulls) areaSeries.defined(datum => defined(yAccessor(datum)))

    context.beginPath()
    areaSeries.context(context)(plotData)
    context.fill()

    if (canvasClip !== undefined) context.restore()
}

export class AreaOnlySeries extends Series {
    static defaults = areaOnlySeriesDefaults

    canvasDraw(context, moreProps) {
        drawAreaOnlySeries(context, moreProps, this.seriesProps)
    }
}

define("chart-area-only-series", AreaOnlySeries)
