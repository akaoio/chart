import { withDefaults } from "../core/utils/index.js"
import { ToolTipText, ToolTipTSpanLabel } from "./ToolTipText.js"

export const singleTooltipDefaults = {
    labelFill: "#4682B4",
    valueFill: "#000000",
    withShape: false,
    layout: "horizontal",
    origin: [0, 0],
    yLabel: undefined,
    yValue: undefined,
    fontSize: undefined,
    fontFamily: undefined,
    fontWeight: undefined,
    onClick: undefined,
    forChart: undefined,
    options: undefined,
}

/**
 * One label-and-value pair inside a group tooltip.
 *
 * Three layouts, and they are not interchangeable: `horizontalInline` returns a `<tspan>`
 * because it has to live inside somebody else's `<text>` — put it anywhere else and it
 * renders nothing at all.
 */
export const renderSingleTooltip = props => {
    const resolved = withDefaults(singleTooltipDefaults, props)
    const { origin, yLabel, yValue, labelFill, valueFill, withShape, fontSize, fontFamily, fontWeight, layout } =
        resolved

    const handleClick = resolved.onClick
        ? event => resolved.onClick(event, { chartId: resolved.forChart, ...resolved.options })
        : undefined

    if (layout === "horizontalInline") {
        return {
            tag: "tspan",
            attrs: { onClick: handleClick, fontFamily, fontSize, fontWeight },
            children: [
                // Nhãn và dấu hai chấm là hai node rời, đúng như JSX bản gốc sinh ra.
                // Trông y hệt, nhưng cây DOM khác — và cây mới là thứ được so.
                ToolTipTSpanLabel({ fill: labelFill }, [yLabel, ":\u00a0"]),
                { tag: "tspan", attrs: { fill: valueFill }, children: [yValue, "\u00a0\u00a0"] },
            ],
        }
    }

    // value beneath the label
    if (layout === "horizontalRows" || layout === "verticalRows") {
        return {
            tag: "g",
            attrs: { transform: `translate(${origin[0]}, ${origin[1]})`, onClick: handleClick },
            children: [
                withShape
                    ? { tag: "line", attrs: { x1: 0, y1: 2, x2: 0, y2: 28, stroke: valueFill, strokeWidth: "4px" } }
                    : null,
                ToolTipText({ x: 5, y: 11, fontFamily, fontSize, fontWeight }, [
                    ToolTipTSpanLabel({ fill: labelFill }, [yLabel]),
                    { tag: "tspan", attrs: { x: "5", dy: "15", fill: valueFill }, children: [yValue] },
                ]),
            ],
        }
    }

    // value next to the label — also the fallback for an unknown layout
    return {
        tag: "g",
        attrs: { transform: `translate(${origin[0]}, ${origin[1]})`, onClick: handleClick },
        children: [
            withShape ? { tag: "rect", attrs: { x: "0", y: "-6", width: "6", height: "6", fill: valueFill } } : null,
            ToolTipText({ x: withShape ? 8 : 0, y: 0, fontFamily, fontSize, fontWeight }, [
                ToolTipTSpanLabel({ fill: labelFill }, [yLabel, ": "]),
                { tag: "tspan", attrs: { fill: valueFill }, children: [yValue] },
            ]),
        ],
    }
}
