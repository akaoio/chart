import { format } from "d3-format"
import { functor, withDefaults } from "../core/utils/index.js"
import { GenericChartComponent } from "../core/GenericChartComponent.js"
import { defineProperties, define } from "../core/element.js"
import { ToolTipText, ToolTipTSpanLabel } from "./ToolTipText.js"

export const stochasticTooltipDefaults = {
    className: "chart-tooltip",
    displayFormat: format(".2f"),
    displayInit: "n/a",
    displayValuesFor: (props, moreProps) => moreProps.currentItem,
    label: "STO",
    origin: [0, 0],
    yAccessor: undefined,
    options: undefined,
    appearance: undefined,
    labelFill: undefined,
    fontFamily: undefined,
    fontSize: undefined,
    fontWeight: undefined,
    onClick: undefined,
}

/** %K and %D, each in its own line colour. */
export const renderStochasticTooltip = (moreProps, props) => {
    const resolved = withDefaults(stochasticTooltipDefaults, props)
    const {
        onClick,
        fontFamily,
        fontSize,
        fontWeight,
        yAccessor,
        displayFormat,
        origin,
        label,
        className,
        displayInit,
        displayValuesFor,
        options,
        appearance,
        labelFill,
    } = resolved

    const {
        chartConfig: { width, height },
        fullData,
    } = moreProps

    const currentItem = displayValuesFor(resolved, moreProps) ?? fullData[fullData.length - 1]
    const stochastic = currentItem && yAccessor(currentItem)

    const K = (stochastic?.K && displayFormat(stochastic.K)) ?? displayInit
    const D = (stochastic?.D && displayFormat(stochastic.D)) ?? displayInit

    const [x, y] = functor(origin)(width, height)
    const { stroke } = appearance

    return {
        tag: "g",
        attrs: { className, transform: `translate(${x}, ${y})`, onClick },
        children: [
            ToolTipText({ x: 0, y: 0, fontFamily, fontSize, fontWeight }, [
                ToolTipTSpanLabel({ fill: labelFill }, [`${label} %K(`]),
                {
                    tag: "tspan",
                    attrs: { fill: stroke.kLine },
                    children: [`${options.windowSize}, ${options.kWindowSize}`],
                },
                ToolTipTSpanLabel({ fill: labelFill }, ["): "]),
                { tag: "tspan", attrs: { fill: stroke.kLine }, children: [K] },
                ToolTipTSpanLabel({ fill: labelFill }, [" %D ("]),
                { tag: "tspan", attrs: { fill: stroke.dLine }, children: [options.dWindowSize] },
                ToolTipTSpanLabel({ fill: labelFill }, ["): "]),
                { tag: "tspan", attrs: { fill: stroke.dLine }, children: [D] },
            ]),
        ],
    }
}

export class StochasticTooltip extends GenericChartComponent {
    #props
    constructor() {
        super()
        this.#props = defineProperties(this, stochasticTooltipDefaults)
    }
    get clip() {
        return false
    }
    get drawOn() {
        return ["mousemove"]
    }
    svgDraw(moreProps) {
        return renderStochasticTooltip(moreProps, this.#props)
    }
}

define("chart-stochastic-tooltip", StochasticTooltip)
