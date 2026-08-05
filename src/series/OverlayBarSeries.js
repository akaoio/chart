import { merge } from "d3-array"
import { first, functor, plotDataLengthBarWidth, withDefaults } from "../core/utils/index.js"
import { drawOnCanvas2 } from "./StackedBarSeries.js"
import { Series } from "./Series.js"
import { define } from "../core/element.js"

export const overlayBarSeriesDefaults = {
    baseAt: (xScale, yScale) => first(yScale.range()),
    clip: true,
    direction: "up",
    stroke: false,
    fillStyle: "#4682B4",
    widthRatio: 0.5,
    width: plotDataLengthBarWidth,
    yAccessor: undefined,
}

/**
 * Bars sharing one x position, each starting where the previous one ended.
 *
 * Stacked from the last accessor backwards, so the first accessor ends up nearest the
 * baseline — which is what makes the front bar the one you read first.
 */
export const getOverlayBars = (moreProps, props) => {
    const {
        xScale,
        xAccessor,
        chartConfig: { yScale },
        plotData,
    } = moreProps

    const { baseAt, fillStyle, stroke, yAccessor, width } = withDefaults(overlayBarSeriesDefaults, props)

    const getFill = functor(fillStyle)
    const getBase = functor(baseAt)
    const barWidth = functor(width)(withDefaults(overlayBarSeriesDefaults, props), moreProps)
    const offset = Math.floor(0.5 * barWidth)

    const bars = plotData.map(datum => {
        const innerBars = yAccessor
            .map((eachYAccessor, index) => {
                const yValue = eachYAccessor(datum)
                if (yValue === undefined) return undefined

                return {
                    height: 0,
                    width: offset * 2,
                    x: Math.round(xScale(xAccessor(datum))) - offset,
                    y: yScale(yValue),
                    stroke: stroke ? getFill(datum, index) : "none",
                    fillStyle: getFill(datum, index),
                    i: index,
                }
            })
            .filter(bar => bar !== undefined)

        let base = getBase(xScale, yScale, datum)

        for (let index = innerBars.length - 1; index >= 0; index--) {
            let height = base - innerBars[index].y
            if (height < 0) {
                innerBars[index].y = base
                height = -1 * height
            }
            innerBars[index].height = height
            base = innerBars[index].y
        }

        return innerBars
    })

    return merge(bars)
}

export const drawOverlayBarSeries = (context, moreProps, props) => {
    drawOnCanvas2(withDefaults(overlayBarSeriesDefaults, props), context, getOverlayBars(moreProps, props))
}

/** Several bars sharing one x, drawn over one another from the last accessor backwards. */
export class OverlayBarSeries extends Series {
    static defaults = overlayBarSeriesDefaults

    get clip() {
        return this.seriesProps.clip
    }

    canvasDraw(context, moreProps) {
        drawOverlayBarSeries(context, moreProps, this.seriesProps)
    }
}

define("chart-overlay-bar-series", OverlayBarSeries)
