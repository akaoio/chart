import { withDefaults } from "../core/utils/index.js"
import { drawOverlayBarSeries } from "./OverlayBarSeries.js"
import { drawStraightLine } from "./StraightLine.js"
import { Series } from "./Series.js"
import { define } from "../core/element.js"

export const elderRaySeriesDefaults = {
    fillStyle: { bearPower: "rgba(239, 83, 80, 0.7)", bullPower: "rgba(38, 166, 153, 0.7)" },
    clip: true,
    stroke: true,
    straightLineStrokeStyle: "rgba(0, 0, 0, 0.7)",
    straightLineStrokeDasharray: "Dash",
    widthRatio: 0.8,
    yAccessor: undefined,
}

/**
 * Bull power and bear power as bars either side of zero.
 *
 * Four accessors rather than two: each power gets a "top" and a "bottom" accessor, and
 * each returns `undefined` when it does not apply. That is how one overlay-bar layout
 * draws bars going up and bars going down in the same pass — the ones that do not belong
 * simply drop out.
 */
export const drawElderRaySeries = (context, moreProps, props) => {
    const { fillStyle, clip, stroke, straightLineStrokeStyle, straightLineStrokeDasharray, widthRatio, yAccessor } =
        withDefaults(elderRaySeriesDefaults, props)

    const power = datum => yAccessor(datum)

    const bullTop = datum => power(datum) && (power(datum).bullPower > 0 ? power(datum).bullPower : undefined)
    const bearTop = datum => power(datum) && (power(datum).bearPower > 0 ? power(datum).bearPower : undefined)
    const bullBottom = datum => power(datum) && (power(datum).bullPower < 0 ? 0 : undefined)
    const bearBottom = datum =>
        power(datum) &&
        // bullPower positive and bearPower negative straddles zero, so it needs a bar too
        (power(datum).bullPower < 0 || power(datum).bullPower * power(datum).bearPower < 0
            ? Math.min(0, power(datum).bullPower)
            : undefined)

    drawOverlayBarSeries(context, moreProps, {
        baseAt: (xScale, yScale, datum) => yScale(power(datum) && Math.min(power(datum).bearPower, 0)),
        stroke,
        fillStyle: (datum, index) => (index % 2 === 0 ? fillStyle.bullPower : fillStyle.bearPower),
        widthRatio,
        clip,
        yAccessor: [bullTop, bearTop, bullBottom, bearBottom],
    })

    drawStraightLine(context, moreProps, {
        yValue: 0,
        strokeStyle: straightLineStrokeStyle,
        lineDash: straightLineStrokeDasharray,
    })
}

export class ElderRaySeries extends Series {
    static defaults = elderRaySeriesDefaults

    get clip() {
        return this.seriesProps.clip
    }

    canvasDraw(context, moreProps) {
        drawElderRaySeries(context, moreProps, this.seriesProps)
    }
}

define("chart-elder-ray-series", ElderRaySeries)
