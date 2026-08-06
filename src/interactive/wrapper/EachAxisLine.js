import { ElementBase, define, defineProperties } from "../../core/element.js"
import { isHover, saveNodeType } from "../utils.js"
import { getNewXY } from "./EachTrendLine.js"

export const eachAxisLineDefaults = {
    index: undefined,
    mode: "horizontal",
    selected: false,
    xValue: undefined,
    yValue: undefined,
    strokeStyle: "#000000",
    strokeWidth: 1,
    strokeDasharray: "Solid",
    edgeStroke: "#000000",
    edgeFill: "#FFFFFF",
    edgeStrokeWidth: 2,
    r: 5,
    hoverText: { enable: false },
    edgeInteractiveCursor: "chart-move-cursor",
    lineInteractiveCursor: "chart-move-cursor",
    onDrag: () => {},
    onDragComplete: () => {},
}

/**
 * One axis-anchored line and the machinery that lets it be adjusted.
 *
 * A single anchor point defines everything: `horizontal` and `horizontalRay` only
 * really use its y, `vertical` only its x, `cross` uses both. The line children are
 * plain `chart-interactive-straight-line`s — a horizontal line is an `XLINE` whose two
 * ends share a y, a vertical one an `XLINE` whose two ends share an x, and the ray
 * variant is the `RAY` type pointed to the right. `cross` composes two of them.
 *
 * Kéo đường nào cũng chỉ là kéo cái neo: mọi biến thể đều quy về một điểm, nên không
 * có chuyện hai đầu lệch nhau như trendline — không cần override từng đầu.
 */
export class EachAxisLine extends ElementBase {
    #props
    #hover = false

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, eachAxisLineDefaults)
        this.isHover = isHover.bind(this)
        this.saveNodeType = saveNodeType.bind(this)
    }

    #children = null

    connectedCallback() {
        this.style.display = "none"
        this.#build()
    }

    /** Update the child elements in place; create them only once (see EachTrendLine). */
    #build() {
        const props = this.#props
        const { enable: hoverTextEnabled, selectedText, text: unselectedText, ...restHoverText } = props.hoverText

        const showHandles = props.selected || this.#hover

        if (this.#children === null) {
            this.#children = {
                first: document.createElement("chart-interactive-straight-line"),
                second: document.createElement("chart-interactive-straight-line"),
                anchor: document.createElement("chart-clickable-circle"),
                hoverText: document.createElement("chart-hover-text"),
            }

            this.append(this.#children.first, this.#children.second, this.#children.anchor, this.#children.hoverText)
        }

        const { first, second, anchor, hoverText } = this.#children
        const crossed = props.mode === "cross"

        // Hit testing walks `nodes`; the second line only counts when it is drawn.
        this.nodes = crossed ? [first, second, anchor] : [first, anchor]

        const shared = {
            selected: showHandles,
            strokeStyle: props.strokeStyle,
            strokeWidth: showHandles ? props.strokeWidth + 1 : props.strokeWidth,
            strokeDasharray: props.strokeDasharray,
            interactiveCursorClass: props.lineInteractiveCursor,
            onHover: this.#handleHover,
            onUnHover: this.#handleHover,
            onDragStart: () => {},
            onDrag: this.#handleLineDrag,
            onDragComplete: props.onDragComplete,
        }

        Object.assign(first, shared, this.#firstLine())

        // The unused second line parks as a zero-hit shape: no onHover → no hit test.
        if (crossed) Object.assign(second, shared, this.#verticalLine())
        else
            Object.assign(second, {
                x1Value: props.xValue,
                y1Value: props.yValue,
                x2Value: props.xValue,
                y2Value: props.yValue,
                type: "LINE",
                strokeWidth: 0,
                onHover: undefined,
                onUnHover: undefined,
            })

        Object.assign(anchor, {
            show: showHandles,
            cx: props.xValue,
            cy: props.yValue,
            r: props.r,
            fillStyle: props.edgeFill,
            strokeStyle: props.edgeStroke,
            strokeWidth: props.edgeStrokeWidth,
            interactiveCursorClass: props.edgeInteractiveCursor,
            onDragStart: () => {},
            onDrag: this.#handleLineDrag,
            onDragComplete: props.onDragComplete,
        })

        Object.assign(hoverText, {
            ...restHoverText,
            show: hoverTextEnabled && this.#hover,
            text: props.selected ? selectedText : unselectedText,
        })
    }

    #firstLine() {
        const props = this.#props
        if (props.mode === "vertical") return this.#verticalLine()
        return {
            x1Value: props.xValue,
            y1Value: props.yValue,
            x2Value: props.xValue + 1,
            y2Value: props.yValue,
            type: props.mode === "horizontalRay" ? "RAY" : "XLINE",
        }
    }

    #verticalLine() {
        const props = this.#props
        // start[0] === end[0]: generateLine takes its vertical branch.
        return {
            x1Value: props.xValue,
            y1Value: props.yValue,
            x2Value: props.xValue,
            y2Value: props.yValue + 1,
            type: "XLINE",
        }
    }

    /** Rebuild on any property change, so handles appear and disappear with selection. */
    update() {
        if (this.isConnected) this.#build()
    }

    #handleHover = (event, moreProps) => {
        if (this.#hover === moreProps.hovering) return

        this.#hover = moreProps.hovering
        this.update()
    }

    /** Every part drags the same one anchor — the line follows the pointer. */
    #handleLineDrag = (event, moreProps) => {
        const [xValue, yValue] = getNewXY(moreProps)
        this.#props.onDrag(event, this.#props.index, { xValue, yValue })
    }
}

define("chart-each-axis-line", EachAxisLine)
