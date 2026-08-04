import { withDefaults } from "../core/utils/index.js"
import { drawLineSeries } from "./LineSeries.js"
import { drawStraightLine } from "./StraightLine.js"
import { Series } from "./Series.js"
import { define } from "../core/element.js"

export const rsiSeriesDefaults = {
    strokeStyle: {
        line: "#000000",
        top: "#B8C2CC",
        middle: "#8795A1",
        bottom: "#B8C2CC",
        outsideThreshold: "#b300b3",
        insideThreshold: "#ffccff",
    },
    strokeDasharray: { line: "Solid", top: "ShortDash", middle: "ShortDash", bottom: "ShortDash" },
    strokeWidth: { outsideThreshold: 1, insideThreshold: 1, top: 1, middle: 1, bottom: 1 },
    overSold: 70,
    middle: 50,
    overBought: 30,
    yAccessor: undefined,
}

/**
 * RSI, with the line changing colour where it leaves the normal band.
 *
 * The same line is drawn twice under two different clips — once inside the overbought
 * and oversold thresholds, once outside them. Clipping rather than splitting the data
 * means the colour changes exactly at the threshold, not at the nearest data point.
 */
export const drawRSISeries = (context, moreProps, props) => {
    const { strokeStyle, strokeDasharray, strokeWidth, overSold, middle, overBought, yAccessor } = withDefaults(
        rsiSeriesDefaults,
        props,
    )

    drawStraightLine(context, moreProps, {
        strokeStyle: strokeStyle.top,
        yValue: overSold,
        lineDash: strokeDasharray.top,
        lineWidth: strokeWidth.top,
    })
    drawStraightLine(context, moreProps, {
        strokeStyle: strokeStyle.middle,
        yValue: middle,
        lineDash: strokeDasharray.middle,
        lineWidth: strokeWidth.middle,
    })
    drawStraightLine(context, moreProps, {
        strokeStyle: strokeStyle.bottom,
        yValue: overBought,
        lineDash: strokeDasharray.bottom,
        lineWidth: strokeWidth.bottom,
    })

    const insideClip = (clipContext, clipMoreProps) => {
        const { yScale, width } = clipMoreProps.chartConfig
        clipContext.beginPath()
        clipContext.rect(0, yScale(overSold), width, yScale(overBought) - yScale(overSold))
        clipContext.clip()
    }

    const outsideClip = (clipContext, clipMoreProps) => {
        const { yScale, width, height } = clipMoreProps.chartConfig
        clipContext.beginPath()
        clipContext.rect(0, 0, width, yScale(overSold))
        clipContext.rect(0, yScale(overBought), width, height - yScale(overBought))
        clipContext.clip()
    }

    drawLineSeries(context, moreProps, {
        canvasClip: insideClip,
        yAccessor,
        strokeStyle: strokeStyle.insideThreshold || strokeStyle.line,
        strokeWidth: strokeWidth.insideThreshold,
        strokeDasharray: strokeDasharray.line,
    })

    drawLineSeries(context, moreProps, {
        canvasClip: outsideClip,
        yAccessor,
        strokeStyle: strokeStyle.outsideThreshold || strokeStyle.line,
        strokeWidth: strokeWidth.outsideThreshold,
        strokeDasharray: strokeDasharray.line,
    })
}

export class RSISeries extends Series {
    static defaults = rsiSeriesDefaults

    canvasDraw(context, moreProps) {
        drawRSISeries(context, moreProps, this.seriesProps)
    }
}

define("chart-rsi-series", RSISeries)
