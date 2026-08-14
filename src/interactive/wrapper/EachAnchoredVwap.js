import { isDefined } from "../../core/utils/index.js"
import { getXValue } from "../../core/utils/ChartDataUtil.js"
import { ElementBase, define, defineProperties } from "../../core/element.js"
import { isHover, saveNodeType } from "../utils.js"

export const eachAnchoredVwapDefaults = {
    index: undefined,
    interactive: true,
    selected: false,
    anchor: undefined,
    hoverText: { enable: false },
    appearance: {
        stroke: "#2962ff",
        strokeWidth: 2,
        edgeStroke: "#000000",
        edgeFill: "#FFFFFF",
        edgeStrokeWidth: 1,
        r: 5,
    },
    onDrag: () => {},
    onDragComplete: () => {},
}

/**
 * One anchored VWAP, with one grab point — the anchor itself. Dragging the line's
 * body drags the anchor too: the line has no shape of its own to move, every y is
 * the data's, so the only thing a drag can honestly change is where it starts.
 */
export class EachAnchoredVwap extends ElementBase {
    #props
    #dragStart
    #hover = false
    #children = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, eachAnchoredVwapDefaults)
        this.isHover = isHover.bind(this)
        this.saveNodeType = saveNodeType.bind(this)
    }

    connectedCallback() {
        this.style.display = "none"
        this.#build()
    }

    update() {
        if (this.isConnected) this.#build()
    }

    #build() {
        const props = this.#props
        const { anchor, appearance, selected, hoverText } = props
        const { stroke, strokeWidth, edgeStroke, edgeFill, edgeStrokeWidth, r } = appearance
        const { enable: hoverTextEnabled, ...restHoverText } = hoverText

        const showHandles = selected || this.#hover

        if (this.#children === null) {
            this.#children = {
                vwap: document.createElement("chart-interactive-anchored-vwap"),
                edge: document.createElement("chart-clickable-circle"),
                hoverText: document.createElement("chart-hover-text"),
            }
            this.append(...Object.values(this.#children))
            this.nodes = [this.#children.vwap, this.#children.edge]
        }

        const { vwap, edge, hoverText: hoverNode } = this.#children

        Object.assign(vwap, {
            selected: showHandles,
            anchor,
            strokeStyle: stroke,
            strokeWidth: showHandles ? strokeWidth + 1 : strokeWidth,
            interactiveCursorClass: "chart-ew-resize-cursor",
            onHover: props.interactive ? this.#handleHover : undefined,
            onUnHover: props.interactive ? this.#handleHover : undefined,
            onDragStart: this.#handleDragStart,
            onDrag: this.#handleAnchorDrag,
            onDragComplete: props.onDragComplete,
        })

        Object.assign(edge, {
            show: isDefined(anchor) && showHandles,
            cx: anchor?.[0],
            cy: anchor?.[1],
            r,
            fillStyle: edgeFill,
            strokeStyle: edgeStroke,
            strokeWidth: edgeStrokeWidth,
            interactiveCursorClass: "chart-move-cursor",
            onDragStart: this.#handleDragStart,
            onDrag: this.#handleAnchorDrag,
            onDragComplete: props.onDragComplete,
        })

        Object.assign(hoverNode, { ...restHoverText, show: hoverTextEnabled && this.#hover && !selected })
    }

    #handleHover = (event, moreProps) => {
        if (this.#hover === moreProps.hovering) return
        this.#hover = moreProps.hovering
        this.update()
    }

    #handleDragStart = () => {
        this.#dragStart = { anchor: this.#props.anchor }
    }

    #handleAnchorDrag = (event, moreProps) => {
        const {
            startPos,
            mouseXY,
            xAccessor,
            xScale,
            fullData,
            chartConfig: { yScale },
        } = moreProps

        const [anchorXValue, anchorYValue] = this.#dragStart.anchor
        const dx = startPos[0] - mouseXY[0]
        const dy = startPos[1] - mouseXY[1]
        const x = xScale(anchorXValue)
        const y = yScale(anchorYValue)

        this.#props.onDrag(event, this.#props.index, {
            anchor: [getXValue(xScale, xAccessor, [x - dx, y - dy], fullData), yScale.invert(y - dy)],
        })
    }
}

define("chart-each-anchored-vwap", EachAnchoredVwap)
