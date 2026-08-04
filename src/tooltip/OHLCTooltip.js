import { format } from "d3-format"
import { functor, last, withDefaults } from "../core/utils/index.js"
import { GenericChartComponent } from "../core/GenericChartComponent.js"
import { defineProperties, define } from "../core/element.js"
import { ToolTipText, ToolTipTSpanLabel } from "./ToolTipText.js"

const displayTextsDefault = { o: "O: ", h: " H: ", l: " L: ", c: " C: ", na: "n/a" }

export const ohlcTooltipDefaults = {
    accessor: datum => datum,
    changeFormat: format("+.2f"),
    className: "chart-tooltip-hover",
    displayTexts: displayTextsDefault,
    displayValuesFor: (props, moreProps) => moreProps.currentItem,
    fontFamily: "-apple-system, system-ui, 'Helvetica Neue', Ubuntu, sans-serif",
    ohlcFormat: format(".2f"),
    origin: [0, 0],
    percentFormat: format("+.2%"),
    fontSize: undefined,
    fontWeight: undefined,
    labelFill: undefined,
    labelFontWeight: undefined,
    textFill: undefined,
    onClick: undefined,
}

/** Open, high, low, close and the change — the header line of nearly every price chart. */
export const renderOHLCTooltip = (moreProps, props) => {
    const resolved = withDefaults(ohlcTooltipDefaults, props)
    const {
        accessor,
        changeFormat,
        className,
        displayTexts,
        displayValuesFor,
        fontFamily,
        fontSize,
        fontWeight,
        labelFill,
        labelFontWeight,
        ohlcFormat,
        onClick,
        percentFormat,
        textFill,
        origin,
    } = resolved

    const {
        chartConfig: { width, height },
        fullData,
    } = moreProps

    const currentItem = displayValuesFor(resolved, moreProps) ?? last(fullData)

    let open = displayTexts.na
    let high = displayTexts.na
    let low = displayTexts.na
    let close = displayTexts.na
    let change = displayTexts.na

    if (currentItem !== undefined && accessor !== undefined) {
        const item = accessor(currentItem)
        if (item !== undefined) {
            open = ohlcFormat(item.open)
            high = ohlcFormat(item.high)
            low = ohlcFormat(item.low)
            close = ohlcFormat(item.close)
            change = `${changeFormat(item.close - item.open)} (${percentFormat((item.close - item.open) / item.open)})`
        }
    }

    const [x, y] = functor(origin)(width, height)
    const valueFill = functor(textFill)(currentItem)

    const label = text => ToolTipTSpanLabel({ fill: labelFill, fontWeight: labelFontWeight }, [text])
    const value = text => ({ tag: "tspan", attrs: { fill: valueFill }, children: [text] })

    return {
        tag: "g",
        attrs: { className, transform: `translate(${x}, ${y})`, onClick },
        children: [
            ToolTipText({ x: 0, y: 0, fontFamily, fontSize, fontWeight }, [
                label(displayTexts.o),
                value(open),
                label(displayTexts.h),
                value(high),
                label(displayTexts.l),
                value(low),
                label(displayTexts.c),
                value(close),
                value(` ${change}`),
            ]),
        ],
    }
}

export class OHLCTooltip extends GenericChartComponent {
    #props

    constructor() {
        super()
        this.#props = defineProperties(this, ohlcTooltipDefaults)
    }

    get clip() {
        return false
    }

    get drawOn() {
        return ["mousemove"]
    }

    svgDraw(moreProps) {
        return renderOHLCTooltip(moreProps, this.#props)
    }
}

define("chart-ohlc-tooltip", OHLCTooltip)
