import { format } from "d3-format"
import { functor, identity, last, noop, withDefaults } from "../core/utils/index.js"
import { GenericChartComponent } from "../core/GenericChartComponent.js"
import { defineProperties, define } from "../core/element.js"
import { ToolTipText, ToolTipTSpanLabel } from "./ToolTipText.js"

export const singleValueTooltipDefaults = {
    className: "chart-tooltip",
    displayValuesFor: (props, moreProps) => moreProps.currentItem,
    labelFill: "#4682B4",
    origin: [0, 0],
    valueFill: "#000000",
    xAccessor: noop,
    xDisplayFormat: identity,
    xInitDisplay: "n/a",
    yAccessor: identity,
    yDisplayFormat: format(".2f"),
    yInitDisplay: "n/a",
    xLabel: undefined,
    yLabel: undefined,
    fontFamily: undefined,
    fontSize: undefined,
    fontWeight: undefined,
    labelFontWeight: undefined,
    onClick: undefined,
}

/**
 * One labelled value, following the cursor.
 *
 * Falls back to the last point when the cursor is elsewhere, so the readout is never
 * blank — a tooltip that empties as soon as you look away is worse than one showing the
 * latest value.
 */
export const renderSingleValueTooltip = (moreProps, props) => {
    const resolved = withDefaults(singleValueTooltipDefaults, props)
    const {
        onClick,
        fontFamily,
        fontSize,
        fontWeight,
        labelFill,
        labelFontWeight,
        valueFill,
        className,
        displayValuesFor,
        origin,
        xDisplayFormat,
        yDisplayFormat,
        xLabel,
        yLabel,
        xAccessor,
        yAccessor,
        xInitDisplay,
        yInitDisplay,
    } = resolved

    const {
        chartConfig: { width, height },
        fullData,
    } = moreProps

    const currentItem = displayValuesFor(resolved, moreProps) ?? last(fullData)

    let xDisplayValue = xInitDisplay
    let yDisplayValue = yInitDisplay

    if (currentItem !== undefined) {
        const xItem = xAccessor(currentItem)
        if (xItem !== undefined) xDisplayValue = xDisplayFormat(xItem)

        const yItem = yAccessor(currentItem)
        if (yItem !== undefined) yDisplayValue = yDisplayFormat(yItem)
    }

    const [x, y] = functor(origin)(width, height)

    return {
        tag: "g",
        attrs: { className, transform: `translate(${x}, ${y})`, onClick },
        children: [
            ToolTipText({ x: 0, y: 0, fontFamily, fontSize, fontWeight }, [
                xLabel ? ToolTipTSpanLabel({ x: 0, dy: "5", fill: labelFill }, [`${xLabel}: `]) : null,
                xLabel ? { tag: "tspan", attrs: { fill: valueFill }, children: [`${xDisplayValue} `] } : null,
                ToolTipTSpanLabel({ fill: labelFill, fontWeight: labelFontWeight }, [`${yLabel} `]),
                { tag: "tspan", attrs: { fill: valueFill }, children: [yDisplayValue] },
            ]),
        ],
    }
}

export class SingleValueTooltip extends GenericChartComponent {
    #props

    constructor() {
        super()
        this.#props = defineProperties(this, singleValueTooltipDefaults)
    }

    get clip() {
        return false
    }

    get drawOn() {
        return ["mousemove"]
    }

    svgDraw(moreProps) {
        return renderSingleValueTooltip(moreProps, this.#props)
    }
}

define("chart-single-value-tooltip", SingleValueTooltip)
