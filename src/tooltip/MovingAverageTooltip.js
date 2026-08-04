import { format } from "d3-format"
import { functor, last, withDefaults } from "../core/utils/index.js"
import { GenericChartComponent } from "../core/GenericChartComponent.js"
import { defineProperties, define } from "../core/element.js"
import { ToolTipText, ToolTipTSpanLabel } from "./ToolTipText.js"

/**
 * One moving average in the legend: a colour swatch, its name, and its value.
 *
 * The invisible rectangle on top is the click target — it covers the whole cell so the
 * gap between the label and the value is clickable too, rather than only the glyphs.
 */
export const renderSingleMAToolTip = props => {
    const { color, displayName, fontSize, fontFamily, fontWeight, textFill, labelFill, labelFontWeight, value, origin } =
        props

    const handleClick = props.onClick
        ? event => props.onClick(event, { chartId: props.forChart, ...props.options })
        : undefined

    return {
        tag: "g",
        attrs: { transform: `translate(${origin[0]}, ${origin[1]})` },
        children: [
            { tag: "line", attrs: { x1: 0, y1: 2, x2: 0, y2: 28, stroke: color, strokeWidth: 4 } },
            ToolTipText({ x: 5, y: 11, fontFamily, fontSize, fontWeight }, [
                ToolTipTSpanLabel({ fill: labelFill, fontWeight: labelFontWeight }, [displayName]),
                { tag: "tspan", attrs: { x: 5, dy: 15, fill: textFill }, children: [value] },
            ]),
            {
                tag: "rect",
                attrs: { x: 0, y: 0, width: 55, height: 30, onClick: handleClick, fill: "none", stroke: "none" },
            },
        ],
    }
}

export const movingAverageTooltipDefaults = {
    className: "chart-tooltip chart-moving-average-tooltip",
    displayFormat: format(".2f"),
    displayInit: "n/a",
    displayValuesFor: (props, moreProps) => moreProps.currentItem,
    origin: [0, 10],
    width: 65,
    options: undefined,
    onClick: undefined,
    textFill: undefined,
    labelFill: undefined,
    fontFamily: undefined,
    fontSize: undefined,
    fontWeight: undefined,
}

/** The legend of moving averages, laid out left to right. */
export const renderMovingAverageTooltip = (moreProps, props) => {
    const resolved = withDefaults(movingAverageTooltipDefaults, props)
    const { chartId, chartConfig, fullData } = moreProps
    const height = chartConfig?.height ?? 0

    const {
        className,
        displayInit,
        onClick,
        width,
        fontFamily,
        fontSize,
        fontWeight,
        textFill,
        labelFill,
        origin,
        displayFormat,
        displayValuesFor,
        options,
    } = resolved

    const currentItem = displayValuesFor(resolved, moreProps) ?? last(fullData)

    const [x, y] = functor(origin)(width, height)
    const [ox, oy] = chartConfig.origin

    return {
        tag: "g",
        attrs: { transform: `translate(${ox + x}, ${oy + y})`, className },
        children: options.map((each, index) => {
            const yValue = currentItem && each.yAccessor(currentItem)

            return renderSingleMAToolTip({
                origin: [width * index, 0],
                color: each.stroke,
                displayName: `${each.type} (${each.windowSize})`,
                value: yValue ? displayFormat(yValue) : displayInit,
                options: each,
                forChart: chartId,
                onClick,
                fontFamily,
                fontSize,
                fontWeight,
                textFill,
                labelFill,
            })
        }),
    }
}

export class MovingAverageTooltip extends GenericChartComponent {
    #props
    constructor() {
        super()
        this.#props = defineProperties(this, movingAverageTooltipDefaults)
    }
    get clip() {
        return false
    }
    get drawOn() {
        return ["mousemove"]
    }
    svgDraw(moreProps) {
        return renderMovingAverageTooltip(moreProps, this.#props)
    }
}

define("chart-moving-average-tooltip", MovingAverageTooltip)
