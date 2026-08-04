import { withDefaults } from "../core/utils/index.js"
import { drawOnCanvasHelper, identityStack, stackedBarSeriesDefaults } from "./StackedBarSeries.js"
import { Series } from "./Series.js"
import { define } from "../core/element.js"

export const groupedBarSeriesDefaults = {
    ...stackedBarSeriesDefaults,
    spaceBetweenBar: 5,
    widthRatio: 0.8,
}

/** Slide each bar sideways into its own slot instead of stacking them. */
const sideBySide = array =>
    array.map(each => ({ ...each, x: each.x + each.offset - each.groupOffset, width: each.groupWidth }))

export const drawGroupedBarSeries = (context, moreProps, props) => {
    drawOnCanvasHelper(
        context,
        withDefaults(groupedBarSeriesDefaults, props),
        moreProps,
        moreProps.xAccessor,
        identityStack,
        sideBySide,
    )
}

export class GroupedBarSeries extends Series {
    static defaults = groupedBarSeriesDefaults

    canvasDraw(context, moreProps) {
        drawGroupedBarSeries(context, moreProps, this.seriesProps)
    }
}

define("chart-grouped-bar-series", GroupedBarSeries)
