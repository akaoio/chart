import { withDefaults } from "../core/utils/index.js"
import { drawAreaOnlySeries } from "./AreaOnlySeries.js"
import { drawLineSeries } from "./LineSeries.js"
import { Series } from "./Series.js"
import { define } from "../core/element.js"

export const bollingerSeriesDefaults = {
    fillStyle: "rgba(38, 166, 153, 0.05)",
    strokeStyle: { top: "#26a69a", middle: "#812828", bottom: "#26a69a" },
    yAccessor: datum => datum.bb,
}

/**
 * Three lines and the band between them: a moving average with a channel drawn a fixed
 * number of standard deviations either side.
 *
 * Lines first, band last — the band is nearly transparent, so painting it over the lines
 * softens them rather than hiding them.
 */
export const drawBollingerSeries = (context, moreProps, props) => {
    const { yAccessor, strokeStyle, fillStyle } = withDefaults(bollingerSeriesDefaults, props)

    const band = datum => yAccessor(datum)
    const at = key => datum => band(datum)?.[key]

    drawLineSeries(context, moreProps, { yAccessor: at("top"), strokeStyle: strokeStyle.top })
    drawLineSeries(context, moreProps, { yAccessor: at("middle"), strokeStyle: strokeStyle.middle })
    drawLineSeries(context, moreProps, { yAccessor: at("bottom"), strokeStyle: strokeStyle.bottom })

    drawAreaOnlySeries(context, moreProps, {
        yAccessor: at("top"),
        base: (scale, datum) => {
            const value = band(datum)
            return value === undefined ? undefined : scale(value.bottom)
        },
        fillStyle,
    })
}

export class BollingerSeries extends Series {
    static defaults = bollingerSeriesDefaults

    canvasDraw(context, moreProps) {
        drawBollingerSeries(context, moreProps, this.seriesProps)
    }
}

define("chart-bollinger-series", BollingerSeries)
