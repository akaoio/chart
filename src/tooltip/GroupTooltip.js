import { format } from "d3-format"
import { last, withDefaults } from "../core/utils/index.js"
import { GenericChartComponent } from "../core/GenericChartComponent.js"
import { defineProperties, define } from "../core/element.js"
import { ToolTipText } from "./ToolTipText.js"
import { renderSingleTooltip } from "./SingleTooltip.js"

export const groupTooltipDefaults = {
    className: "chart-tooltip chart-group-tooltip",
    layout: "horizontal",
    displayFormat: format(".2f"),
    displayInit: "",
    displayValuesFor: (props, moreProps) => moreProps.currentItem,
    origin: [0, 0],
    width: 60,
    verticalSize: 13,
    options: undefined,
    position: undefined,
    onClick: undefined,
    fontFamily: undefined,
    fontSize: undefined,
    fontWeight: undefined,
}

/** Anchor the group to a corner of the pane, if asked. */
const getPosition = (position, moreProps) => {
    const { height, width } = moreProps.chartConfig
    const dx = 20
    const dy = 40

    switch (position) {
        case "topRight":
            return { xyPos: [width - dx, null], textAnchor: "end" }
        case "bottomLeft":
            return { xyPos: [null, height - dy], textAnchor: undefined }
        case "bottomRight":
            return { xyPos: [width - dx, height - dy], textAnchor: "end" }
        default:
            return { xyPos: [null, null], textAnchor: undefined }
    }
}

/** Several labelled values as one block; the layout decides how they are arranged. */
export const renderGroupTooltip = (moreProps, props) => {
    const resolved = withDefaults(groupTooltipDefaults, props)
    const { chartId, fullData } = moreProps

    const {
        className,
        displayInit,
        displayValuesFor,
        onClick,
        width,
        verticalSize,
        fontFamily,
        fontSize,
        fontWeight,
        layout,
        origin,
        displayFormat,
        options,
        position,
    } = resolved

    const currentItem = displayValuesFor(resolved, moreProps) ?? last(fullData)
    const { xyPos, textAnchor } = getPosition(position, moreProps)

    const xPos = xyPos != null && xyPos[0] != null ? xyPos[0] : origin[0]
    const yPos = xyPos != null && xyPos[1] != null ? xyPos[1] : origin[1]

    const singleTooltip = options.map((each, index) => {
        const yValue = currentItem && each.yAccessor(currentItem)

        const at = () => {
            if (layout === "horizontal" || layout === "horizontalRows") return [width * index, 0]
            if (layout === "vertical") return [0, verticalSize * index]
            if (layout === "verticalRows") return [0, verticalSize * 2.3 * index]
            return [0, 0]
        }

        return renderSingleTooltip({
            layout,
            origin: at(),
            yLabel: each.yLabel,
            yValue: yValue ? displayFormat(yValue) : displayInit,
            options: each,
            forChart: chartId,
            onClick,
            fontFamily,
            fontSize,
            labelFill: each.labelFill,
            valueFill: each.valueFill,
            withShape: each.withShape,
        })
    })

    return {
        tag: "g",
        attrs: { transform: `translate(${xPos}, ${yPos})`, className, textAnchor },
        children:
            layout === "horizontalInline"
                ? [ToolTipText({ x: 0, y: 0, fontFamily, fontSize, fontWeight }, singleTooltip)]
                : singleTooltip,
    }
}

export class GroupTooltip extends GenericChartComponent {
    #props
    constructor() {
        super()
        this.#props = defineProperties(this, groupTooltipDefaults)
    }
    get clip() {
        return false
    }
    get drawOn() {
        return ["mousemove"]
    }
    svgDraw(moreProps) {
        return renderGroupTooltip(moreProps, this.#props)
    }
}

define("chart-group-tooltip", GroupTooltip)
