import { GenericChartComponent } from "../../core/GenericChartComponent.js"
import { defineProperties, define } from "../../core/element.js"

const PADDING = 8
const MIN_WIDTH = PADDING * 2

export const hoverTextNearMouseDefaults = {
    fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
    fontSize: 12,
    fill: "#000000",
    bgFill: "#FA9325",
    bgOpacity: 0.5,
    bgWidth: "auto",
    bgHeight: "auto",
    text: "",
    show: false,
}

/**
 * The tooltip that follows the cursor while an object is hoverable.
 *
 * It flips to the other side of the pointer near an edge, so the hint never falls off
 * the chart — the same trick `HoverTooltip` uses, and for the same reason.
 */
export const hoverTextLayout = (props, moreProps) => {
    const { show, bgWidth, bgHeight } = props
    const {
        mouseXY,
        chartConfig: { height, width },
        show: mouseInsideCanvas,
    } = moreProps

    if (!show || !mouseInsideCanvas) return undefined

    const [x, y] = mouseXY

    const cx = x < width / 2 ? x + PADDING : x - bgWidth - PADDING
    const cy = y < height / 2 ? y + PADDING : y - bgHeight - PADDING

    return {
        rect: { x: cx, y: cy, width: bgWidth, height: bgHeight },
        text: { text: props.text, x: cx + PADDING / 2, y: cy + bgHeight / 2 },
    }
}

export const renderHoverTextNearMouse = (moreProps, props) => {
    const resolved = { ...hoverTextNearMouseDefaults, ...props }
    const { fontFamily, fontSize, fill, bgFill, bgOpacity } = resolved

    // "auto" needs a measured text node, which only exists once rendered. Until then the
    // box is a minimum size; the browser path re-measures and settles.
    const bgWidth = resolved.bgWidth === "auto" ? (resolved.textWidth ?? 0) + PADDING || MIN_WIDTH : resolved.bgWidth
    const bgHeight =
        resolved.bgHeight === "auto" ? (resolved.textHeight ?? 0) + PADDING || MIN_WIDTH : resolved.bgHeight

    const layout = hoverTextLayout({ ...resolved, bgWidth, bgHeight }, moreProps)
    if (layout === undefined) return null

    const { rect, text } = layout

    return {
        tag: "g",
        children: [
            { tag: "rect", attrs: { fill: bgFill, fillOpacity: bgOpacity, stroke: bgFill, ...rect } },
            {
                tag: "text",
                attrs: {
                    fontSize,
                    fontFamily,
                    textAnchor: "start",
                    alignmentBaseline: "central",
                    fill,
                    x: text.x,
                    y: text.y,
                },
                children: [text.text],
            },
        ],
    }
}

export class HoverTextNearMouse extends GenericChartComponent {
    #props
    #measured = {}

    constructor() {
        super()
        this.#props = defineProperties(this, hoverTextNearMouseDefaults)
    }

    get drawOn() {
        return ["mousemove"]
    }

    svgDraw(moreProps) {
        if (!this.#props.text) return null

        const result = renderHoverTextNearMouse(moreProps, { ...this.#props, ...this.#measured })

        // Measure after the fact and redraw once, which is how "auto" settles on a size
        queueMicrotask(() => this.#measure())

        return result
    }

    #measure() {
        const { bgWidth, bgHeight } = this.#props
        if (bgWidth !== "auto" && bgHeight !== "auto") return

        const node = this.svgParent()?.querySelector("text")
        if (!node) return

        const { width, height } = node.getBBox()
        if (this.#measured.textWidth === width && this.#measured.textHeight === height) return

        this.#measured = { textWidth: width, textHeight: height }
        this.canvas?.redraw()
    }
}

define("chart-hover-text", HoverTextNearMouse)
