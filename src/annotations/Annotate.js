import { withDefaults } from "../core/utils/index.js"
import { GenericChartComponent } from "../core/GenericChartComponent.js"
import { defineProperties, define } from "../core/element.js"

export const annotateDefaults = {
    className: "chart-enable-interaction chart-annotate chart-default-cursor",
    with: undefined,
    when: undefined,
    usingProps: undefined,
}

/**
 * Place an annotation on every data point matching a condition.
 *
 * `when` is a plain predicate over the plotted data, so "mark every day the price gapped
 * up" is one line rather than a pre-computed list — and it re-evaluates as the chart
 * pans, so marks appear and disappear with the data instead of going stale.
 */
export const renderAnnotate = (moreProps, props) => {
    const resolved = withDefaults(annotateDefaults, props)
    const {
        xAccessor,
        xScale,
        chartConfig: { yScale },
        plotData,
    } = moreProps

    const { className, usingProps, with: annotation, when } = resolved

    return {
        tag: "g",
        attrs: { className },
        children: plotData
            .filter(when)
            .map(datum => annotation({ ...usingProps, xScale, yScale, xAccessor, plotData, datum })),
    }
}

export class Annotate extends GenericChartComponent {
    #props

    constructor() {
        super()
        this.#props = defineProperties(this, annotateDefaults)
    }

    get drawOn() {
        return ["pan"]
    }

    svgDraw(moreProps) {
        return renderAnnotate(moreProps, this.#props)
    }
}

define("chart-annotate", Annotate)
