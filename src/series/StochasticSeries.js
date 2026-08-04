import { withDefaults } from "../core/utils/index.js"
import { drawLineSeries } from "./LineSeries.js"
import { drawStraightLine } from "./StraightLine.js"
import { Series } from "./Series.js"
import { define } from "../core/element.js"

export const stochasticSeriesDefaults = {
    strokeStyle: {
        top: "rgba(150, 75, 0, 0.3)",
        middle: "rgba(0, 0, 0, 0.3)",
        bottom: "rgba(150, 75, 0, 0.3)",
        dLine: "#EA2BFF",
        kLine: "#74D400",
    },
    overSold: 80,
    middle: 50,
    overBought: 20,
    yAccessor: undefined,
}

/** %K against its own average %D, with the two threshold levels marked. */
export const drawStochasticSeries = (context, moreProps, props) => {
    const { strokeStyle, overSold, middle, overBought, yAccessor } = withDefaults(stochasticSeriesDefaults, props)

    const at = key => datum => yAccessor(datum) && yAccessor(datum)[key]

    drawLineSeries(context, moreProps, { yAccessor: at("D"), strokeStyle: strokeStyle.dLine })
    drawLineSeries(context, moreProps, { yAccessor: at("K"), strokeStyle: strokeStyle.kLine })

    drawStraightLine(context, moreProps, { strokeStyle: strokeStyle.top, yValue: overSold })
    drawStraightLine(context, moreProps, { strokeStyle: strokeStyle.middle, yValue: middle })
    drawStraightLine(context, moreProps, { strokeStyle: strokeStyle.bottom, yValue: overBought })
}

export class StochasticSeries extends Series {
    static defaults = stochasticSeriesDefaults

    canvasDraw(context, moreProps) {
        drawStochasticSeries(context, moreProps, this.seriesProps)
    }
}

define("chart-stochastic-series", StochasticSeries)
