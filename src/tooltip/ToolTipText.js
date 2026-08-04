import { withDefaults } from "../core/utils/index.js"

/**
 * The shared look of tooltip text.
 *
 * Both are plain description builders rather than components: a tooltip is only ever a
 * `<text>` with `<tspan>`s inside, and wrapping that in class machinery bought the
 * original nothing but a default props object.
 */
export const toolTipTextDefaults = {
    className: "chart-tooltip",
    fontFamily: "-apple-system, system-ui, 'Helvetica Neue', Ubuntu, sans-serif",
    fontSize: 11,
}

export const ToolTipText = (attrs, children) => ({
    tag: "text",
    attrs: withDefaults(toolTipTextDefaults, attrs),
    children,
})

export const toolTipTSpanLabelDefaults = { className: "chart-tooltip-label", fill: "#4682B4" }

export const ToolTipTSpanLabel = (attrs, children) => ({
    tag: "tspan",
    attrs: withDefaults(toolTipTSpanLabelDefaults, attrs),
    children,
})
