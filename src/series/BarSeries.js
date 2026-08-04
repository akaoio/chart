import { group } from "d3-array"
import { functor, head, plotDataLengthBarWidth, withDefaults } from "../core/utils/index.js"
import { drawOnCanvasHelper, identityStack } from "./StackedBarSeries.js"
import { Series } from "./Series.js"
import { define } from "../core/element.js"

export const barSeriesDefaults = {
    baseAt: (xScale, yScale) => head(yScale.range()),
    clip: true,
    fillStyle: "rgba(70, 130, 180, 0.5)",
    swapScales: false,
    width: plotDataLengthBarWidth,
    widthRatio: 0.8,
    yAccessor: undefined,
    strokeStyle: undefined,
}

/** Where each bar sits and how tall it is. Negative values grow downward from the base. */
export const getBars = (moreProps, props) => {
    const { baseAt, fillStyle, width, yAccessor } = withDefaults(barSeriesDefaults, props)

    const {
        xScale,
        xAccessor,
        plotData,
        chartConfig: { yScale },
    } = moreProps

    const getFill = functor(fillStyle)
    const getBase = functor(baseAt)
    const getWidth = functor(width)

    const barWidth = getWidth(withDefaults(barSeriesDefaults, props), { xScale, xAccessor, plotData })
    const offset = 0.5 * barWidth

    return plotData
        .map(datum => {
            const yValue = yAccessor(datum)
            if (yValue === undefined) return undefined

            const x = xScale(xAccessor(datum)) - offset

            let y = yScale(yValue)
            let height = getBase(xScale, yScale, datum) - yScale(yValue)

            if (height < 0) {
                y = y + height
                height = -height
            }

            return {
                x,
                y: Math.round(y),
                height: Math.round(height),
                width: offset * 2,
                fillStyle: getFill(datum),
            }
        })
        .filter(bar => bar !== undefined)
}

/**
 * Bars, grouped by fill colour so the canvas state changes once per colour rather than
 * once per bar — which is most of why a thousand-bar volume chart stays fast.
 *
 * A bar narrower than a pixel is drawn as a one-pixel line instead, otherwise it would
 * fade to nothing under antialiasing.
 */
export const drawBarSeries = (context, moreProps, props) => {
    const resolved = withDefaults(barSeriesDefaults, props)

    // Bars along the x axis instead of up from it — the same layout code, with the two
    // scales handed to it the other way round.
    if (resolved.swapScales) {
        drawOnCanvasHelper(context, resolved, moreProps, moreProps.xAccessor, identityStack)
        return
    }

    const { strokeStyle } = resolved
    const bars = getBars(moreProps, props)

    group(bars, bar => bar.fillStyle).forEach((values, key) => {
        if (strokeStyle !== undefined && head(values).width > 1) context.strokeStyle = strokeStyle

        context.fillStyle = key

        values.forEach(bar => {
            if (bar.width <= 1) {
                context.fillRect(bar.x - 0.5, bar.y, 1, bar.height)
            } else {
                context.fillRect(bar.x + 0.5, bar.y + 0.5, bar.width, bar.height)
                if (strokeStyle !== undefined) context.strokeRect(bar.x, bar.y, bar.width, bar.height)
            }
        })
    })
}

export class BarSeries extends Series {
    static defaults = barSeriesDefaults

    get clip() {
        return this.seriesProps.clip
    }

    canvasDraw(context, moreProps) {
        drawBarSeries(context, moreProps, this.seriesProps)
    }
}

define("chart-bar-series", BarSeries)
