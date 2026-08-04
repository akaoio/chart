import { format } from "d3-format"
import { functor, isDefined, withDefaults } from "../core/utils/index.js"
import { GenericChartComponent } from "../core/GenericChartComponent.js"
import { defineProperties, define } from "../core/element.js"
import { ToolTipText, ToolTipTSpanLabel } from "./ToolTipText.js"

export const rsiTooltipDefaults = {
    displayFormat: format(".2f"),
    displayInit: "n/a",
    displayValuesFor: (props, moreProps) => moreProps.currentItem,
    origin: [0, 0],
    className: "chart-tooltip",
    yAccessor: undefined,
    options: undefined,
    fontFamily: undefined,
    fontSize: undefined,
    fontWeight: undefined,
    labelFill: undefined,
    labelFontWeight: undefined,
    textFill: undefined,
    onClick: undefined,
}

/** The RSI reading, with its window size in the label. */
export const renderRSITooltip = (moreProps, props) => {
    const resolved = withDefaults(rsiTooltipDefaults, props)
    const {
        onClick,
        displayInit,
        fontFamily,
        fontSize,
        fontWeight,
        yAccessor,
        displayFormat,
        className,
        options,
        labelFill,
        labelFontWeight,
        textFill,
        displayValuesFor,
        origin,
    } = resolved

    const {
        chartConfig: { width, height },
    } = moreProps

    const currentItem = displayValuesFor(resolved, moreProps)
    const rsi = isDefined(currentItem) && yAccessor(currentItem)
    const value = (rsi && displayFormat(rsi)) || displayInit

    const [x, y] = functor(origin)(width, height)

    return {
        tag: "g",
        attrs: { className, transform: `translate(${x}, ${y})`, onClick },
        children: [
            ToolTipText({ x: 0, y: 0, fontFamily, fontSize, fontWeight }, [
                ToolTipTSpanLabel({ fill: labelFill, fontWeight: labelFontWeight }, [`RSI (${options.windowSize}): `]),
                { tag: "tspan", attrs: { fill: textFill }, children: [value] },
            ]),
        ],
    }
}

export class RSITooltip extends GenericChartComponent {
    #props
    constructor() {
        super()
        this.#props = defineProperties(this, rsiTooltipDefaults)
    }
    get clip() {
        return false
    }
    get drawOn() {
        return ["mousemove"]
    }
    svgDraw(moreProps) {
        return renderRSITooltip(moreProps, this.#props)
    }
}

define("chart-rsi-tooltip", RSITooltip)
