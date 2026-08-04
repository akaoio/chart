import { plotDataLengthBarWidth, withDefaults } from "../core/utils/index.js"
import { drawBarSeries } from "./BarSeries.js"
import { drawLineSeries } from "./LineSeries.js"
import { drawStraightLine } from "./StraightLine.js"
import { Series } from "./Series.js"
import { define } from "../core/element.js"

export const macdSeriesDefaults = {
    clip: true,
    fillStyle: { divergence: "rgba(70, 130, 180, 0.6)" },
    strokeStyle: { macd: "#0093FF", signal: "#D84315", zero: "rgba(0, 0, 0, 0.3)" },
    widthRatio: 0.5,
    width: plotDataLengthBarWidth,
    yAccessor: undefined,
}

/**
 * MACD: two moving averages turned into a momentum reading.
 *
 * The bars are the gap between the MACD line and its signal line, growing from zero in
 * both directions — which is why the baseline is `yScale(0)` rather than the bottom of
 * the pane, and why the zero line is drawn at all.
 */
export const drawMACDSeries = (context, moreProps, props) => {
    const { clip, fillStyle, strokeStyle, widthRatio, width, yAccessor } = withDefaults(macdSeriesDefaults, props)

    const at = key => datum => yAccessor(datum)?.[key]

    drawBarSeries(context, moreProps, {
        baseAt: (xScale, yScale) => yScale(0),
        width,
        widthRatio,
        fillStyle: fillStyle.divergence,
        clip,
        yAccessor: at("divergence"),
    })

    drawLineSeries(context, moreProps, { yAccessor: at("macd"), strokeStyle: strokeStyle.macd })
    drawLineSeries(context, moreProps, { yAccessor: at("signal"), strokeStyle: strokeStyle.signal })
    drawStraightLine(context, moreProps, { strokeStyle: strokeStyle.zero, yValue: 0 })
}

export class MACDSeries extends Series {
    static defaults = macdSeriesDefaults

    get clip() {
        return this.seriesProps.clip
    }

    canvasDraw(context, moreProps) {
        drawMACDSeries(context, moreProps, this.seriesProps)
    }
}

define("chart-macd-series", MACDSeries)
