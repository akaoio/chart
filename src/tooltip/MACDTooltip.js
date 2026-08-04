import { format } from "d3-format"
import { functor, last, withDefaults } from "../core/utils/index.js"
import { GenericChartComponent } from "../core/GenericChartComponent.js"
import { defineProperties, define } from "../core/element.js"
import { ToolTipText, ToolTipTSpanLabel } from "./ToolTipText.js"

export const macdTooltipDefaults = {
    className: "chart-tooltip",
    displayFormat: format(".2f"),
    displayInit: "n/a",
    displayValuesFor: (props, moreProps) => moreProps.currentItem,
    origin: [0, 0],
    yAccessor: undefined,
    options: undefined,
    appearance: undefined,
    labelFill: undefined,
    labelFontWeight: undefined,
    fontFamily: undefined,
    fontSize: undefined,
    fontWeight: undefined,
    onClick: undefined,
}

/** Each number is coloured to match the line it came from, so the legend is the tooltip. */
export const renderMACDTooltip = (moreProps, props) => {
    const resolved = withDefaults(macdTooltipDefaults, props)
    const {
        onClick,
        displayInit,
        fontFamily,
        fontSize,
        fontWeight,
        displayValuesFor,
        displayFormat,
        className,
        yAccessor,
        options,
        origin,
        appearance,
        labelFill,
        labelFontWeight,
    } = resolved

    const {
        chartConfig: { width, height },
        fullData,
    } = moreProps

    const currentItem = displayValuesFor(resolved, moreProps) ?? last(fullData)
    const macdValue = currentItem && yAccessor(currentItem)

    const macd = (macdValue?.macd && displayFormat(macdValue.macd)) || displayInit
    const signal = (macdValue?.signal && displayFormat(macdValue.signal)) || displayInit
    const divergence = (macdValue?.divergence && displayFormat(macdValue.divergence)) || displayInit

    const [x, y] = functor(origin)(width, height)

    // Từng mẩu chữ giữ nguyên cách bản gốc chia thành nhiều node — trông y hệt, nhưng
    // cây DOM khác, và cây mới là thứ được so.
    const label = (...parts) => ToolTipTSpanLabel({ fill: labelFill, fontWeight: labelFontWeight }, parts)

    return {
        tag: "g",
        attrs: { className, transform: `translate(${x}, ${y})`, onClick },
        children: [
            ToolTipText({ x: 0, y: 0, fontFamily, fontSize, fontWeight }, [
                label("MACD ("),
                { tag: "tspan", attrs: { fill: appearance.strokeStyle.macd }, children: [options.slow] },
                label(",", " "),
                { tag: "tspan", attrs: { fill: appearance.strokeStyle.macd }, children: [options.fast] },
                label("):", " "),
                { tag: "tspan", attrs: { fill: appearance.strokeStyle.macd }, children: [macd] },
                label(" ", "Signal ("),
                { tag: "tspan", attrs: { fill: appearance.strokeStyle.signal }, children: [options.signal] },
                label("):", " "),
                { tag: "tspan", attrs: { fill: appearance.strokeStyle.signal }, children: [signal] },
                label(" ", "Divergence:", " "),
                { tag: "tspan", attrs: { fill: appearance.fillStyle.divergence }, children: [divergence] },
            ]),
        ],
    }
}

export class MACDTooltip extends GenericChartComponent {
    #props
    constructor() {
        super()
        this.#props = defineProperties(this, macdTooltipDefaults)
    }
    get clip() {
        return false
    }
    get drawOn() {
        return ["mousemove"]
    }
    svgDraw(moreProps) {
        return renderMACDTooltip(moreProps, this.#props)
    }
}

define("chart-macd-tooltip", MACDTooltip)
