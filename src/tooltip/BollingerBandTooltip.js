import { format } from "d3-format"
import { functor, last, withDefaults } from "../core/utils/index.js"
import { GenericChartComponent } from "../core/GenericChartComponent.js"
import { defineProperties, define } from "../core/element.js"
import { ToolTipText, ToolTipTSpanLabel } from "./ToolTipText.js"

export const bollingerBandTooltipDefaults = {
    className: "chart-tooltip chart-bollingerband-tooltip",
    displayFormat: format(".2f"),
    displayValuesFor: (props, moreProps) => moreProps.currentItem,
    displayInit: "n/a",
    origin: [8, 8],
    yAccessor: datum => datum.bb,
    options: undefined,
    textFill: undefined,
    labelFill: undefined,
    labelFontWeight: undefined,
    fontFamily: undefined,
    fontSize: undefined,
    fontWeight: undefined,
    onClick: undefined,
}

/** The three band values, with the settings that produced them spelled out. */
export const renderBollingerBandTooltip = (moreProps, props) => {
    const resolved = withDefaults(bollingerBandTooltipDefaults, props)
    const {
        onClick,
        displayFormat,
        yAccessor,
        options,
        origin,
        textFill,
        labelFill,
        labelFontWeight,
        className,
        displayValuesFor,
        displayInit,
        fontFamily,
        fontSize,
        fontWeight,
    } = resolved

    const {
        chartConfig: { width, height },
        fullData,
    } = moreProps

    const currentItem = displayValuesFor(resolved, moreProps) ?? last(fullData)

    let top = displayInit
    let middle = displayInit
    let bottom = displayInit

    if (currentItem !== undefined) {
        const item = yAccessor(currentItem)
        if (item !== undefined) {
            top = displayFormat(item.top)
            middle = displayFormat(item.middle)
            bottom = displayFormat(item.bottom)
        }
    }

    const [x, y] = functor(origin)(width, height)
    const { sourcePath, windowSize, multiplier, movingAverageType } = options

    return {
        tag: "g",
        attrs: { transform: `translate(${x}, ${y})`, className, onClick },
        children: [
            ToolTipText({ x: 0, y: 0, fontFamily, fontSize, fontWeight }, [
                ToolTipTSpanLabel({ fill: labelFill, fontWeight: labelFontWeight }, [
                    `BB(${sourcePath}, ${windowSize}, ${multiplier}, ${movingAverageType}): `,
                ]),
                { tag: "tspan", attrs: { fill: textFill }, children: [`${top}, ${middle}, ${bottom}`] },
            ]),
        ],
    }
}

export class BollingerBandTooltip extends GenericChartComponent {
    #props
    constructor() {
        super()
        this.#props = defineProperties(this, bollingerBandTooltipDefaults)
    }
    get clip() {
        return false
    }
    get drawOn() {
        return ["mousemove"]
    }
    svgDraw(moreProps) {
        return renderBollingerBandTooltip(moreProps, this.#props)
    }
}

define("chart-bollinger-band-tooltip", BollingerBandTooltip)
