import { isDefined } from "../../core/utils/index.js"
import { getXValue } from "../../core/utils/ChartDataUtil.js"
import { ElementBase, define, defineProperties } from "../../core/element.js"
import { isHover, saveNodeType } from "../utils.js"

export const eachRotatedRectDefaults = {
    index: undefined,
    interactive: true,
    selected: false,
    p1: undefined,
    p2: undefined,
    p3: undefined,
    hoverText: { enable: false },
    appearance: {
        stroke: "#000000",
        strokeWidth: 1,
        fill: "rgba(138, 175, 226, 0.35)",
        edgeStroke: "#000000",
        edgeFill: "#FFFFFF",
        edgeStrokeWidth: 1,
        r: 5,
    },
    onDrag: () => {},
    onDragComplete: () => {},
}

/**
 * One rotated rectangle, with three grab points — its three data anchors. Dragging
 * an anchor reshapes; dragging the body carries all three. There is no fourth
 * handle: the fourth corner is derived, and a handle on a derived point would
 * either fight the anchors or lie about being one.
 */
export class EachRotatedRect extends ElementBase {
    #props
    #dragStart
    #hover = false
    #children = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, eachRotatedRectDefaults)
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
        const { p1, p2, p3, appearance, selected, hoverText } = props
        const { stroke, strokeWidth, fill, edgeStroke, edgeFill, edgeStrokeWidth, r } = appearance
        const { enable: hoverTextEnabled, ...restHoverText } = hoverText

        const showHandles = selected || this.#hover

        if (this.#children === null) {
            this.#children = {
                rect: document.createElement("chart-interactive-rotated-rect"),
                edge1: document.createElement("chart-clickable-circle"),
                edge2: document.createElement("chart-clickable-circle"),
                edge3: document.createElement("chart-clickable-circle"),
                hoverText: document.createElement("chart-hover-text"),
            }
            this.append(...Object.values(this.#children))
            this.nodes = Object.entries(this.#children)
                .filter(([name]) => name !== "hoverText")
                .map(([, node]) => node)
        }

        const { rect, edge1, edge2, edge3, hoverText: hoverNode } = this.#children

        Object.assign(rect, {
            selected: showHandles,
            p1,
            p2,
            p3,
            strokeStyle: stroke,
            strokeWidth: showHandles ? strokeWidth + 1 : strokeWidth,
            fillStyle: fill,
            interactiveCursorClass: "chart-move-cursor",
            onHover: props.interactive ? this.#handleHover : undefined,
            onUnHover: props.interactive ? this.#handleHover : undefined,
            onDragStart: this.#handleDragStart,
            onDrag: this.#handleBodyDrag,
            onDragComplete: props.onDragComplete,
        })

        const dressEdge = (circle, xy, dragHandler) =>
            Object.assign(circle, {
                show: isDefined(xy) && showHandles,
                cx: xy?.[0],
                cy: xy?.[1],
                r,
                fillStyle: edgeFill,
                strokeStyle: edgeStroke,
                strokeWidth: edgeStrokeWidth,
                interactiveCursorClass: "chart-move-cursor",
                onDragStart: this.#handleDragStart,
                onDrag: dragHandler,
                onDragComplete: props.onDragComplete,
            })

        dressEdge(edge1, p1, this.#anchorDrag("p1"))
        dressEdge(edge2, p2, this.#anchorDrag("p2"))
        dressEdge(edge3, p3, this.#anchorDrag("p3"))

        Object.assign(hoverNode, { ...restHoverText, show: hoverTextEnabled && this.#hover && !selected })
    }

    #handleHover = (event, moreProps) => {
        if (this.#hover === moreProps.hovering) return
        this.#hover = moreProps.hovering
        this.update()
    }

    #handleDragStart = () => {
        const { p1, p2, p3 } = this.#props
        this.#dragStart = { p1, p2, p3 }
    }

    #anchorDrag(which) {
        return (event, moreProps) => {
            const moved = this.#movedPoint(this.#dragStart[which], moreProps)
            this.#props.onDrag(event, this.#props.index, { ...this.#dragStart, [which]: moved })
        }
    }

    #movedPoint(point, moreProps) {
        const {
            startPos,
            mouseXY,
            xAccessor,
            xScale,
            fullData,
            chartConfig: { yScale },
        } = moreProps

        const dx = startPos[0] - mouseXY[0]
        const dy = startPos[1] - mouseXY[1]

        const x = xScale(point[0])
        const y = yScale(point[1])

        return [getXValue(xScale, xAccessor, [x - dx, y - dy], fullData), yScale.invert(y - dy)]
    }

    #handleBodyDrag = (event, moreProps) => {
        const { p1, p2, p3 } = this.#dragStart
        this.#props.onDrag(event, this.#props.index, {
            p1: this.#movedPoint(p1, moreProps),
            p2: this.#movedPoint(p2, moreProps),
            p3: this.#movedPoint(p3, moreProps),
        })
    }
}

define("chart-each-rotated-rect", EachRotatedRect)
