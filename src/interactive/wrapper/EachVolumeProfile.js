import { isDefined } from "../../core/utils/index.js"
import { getXValue } from "../../core/utils/ChartDataUtil.js"
import { ElementBase, define, defineProperties } from "../../core/element.js"
import { isHover, saveNodeType } from "../utils.js"

export const eachVolumeProfileDefaults = {
    index: undefined,
    interactive: true,
    selected: false,
    start: undefined,
    end: undefined,
    hoverText: { enable: false },
    appearance: {
        stroke: "#000000",
        strokeWidth: 1,
        fillUp: "rgba(106, 185, 117, 0.5)",
        fillDown: "rgba(224, 122, 122, 0.5)",
        edgeStroke: "#000000",
        edgeFill: "#FFFFFF",
        edgeStrokeWidth: 1,
        r: 5,
    },
    onDrag: () => {},
    onDragComplete: () => {},
}

/**
 * One fixed-range volume profile, with two grab points — the range's anchors.
 * Dragging the box's edge moves the whole range; the histogram inside is the
 * data's business and follows on its own.
 */
export class EachVolumeProfile extends ElementBase {
    #props
    #dragStart
    #hover = false
    #children = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, eachVolumeProfileDefaults)
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
        const { start, end, appearance, selected, hoverText } = props
        const { stroke, strokeWidth, fillUp, fillDown, edgeStroke, edgeFill, edgeStrokeWidth, r } = appearance
        const { enable: hoverTextEnabled, ...restHoverText } = hoverText

        const showHandles = selected || this.#hover

        if (this.#children === null) {
            this.#children = {
                profile: document.createElement("chart-interactive-volume-profile"),
                edge1: document.createElement("chart-clickable-circle"),
                edge2: document.createElement("chart-clickable-circle"),
                hoverText: document.createElement("chart-hover-text"),
            }
            this.append(...Object.values(this.#children))
            this.nodes = [this.#children.profile, this.#children.edge1, this.#children.edge2]
        }

        const { profile, edge1, edge2, hoverText: hoverNode } = this.#children

        Object.assign(profile, {
            selected: showHandles,
            start,
            end,
            strokeStyle: stroke,
            strokeWidth: showHandles ? strokeWidth + 1 : strokeWidth,
            fillUp,
            fillDown,
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
                interactiveCursorClass: "chart-ew-resize-cursor",
                onDragStart: this.#handleDragStart,
                onDrag: dragHandler,
                onDragComplete: props.onDragComplete,
            })

        dressEdge(edge1, start, this.#anchorDrag("start"))
        dressEdge(edge2, end, this.#anchorDrag("end"))

        Object.assign(hoverNode, { ...restHoverText, show: hoverTextEnabled && this.#hover && !selected })
    }

    #handleHover = (event, moreProps) => {
        if (this.#hover === moreProps.hovering) return
        this.#hover = moreProps.hovering
        this.update()
    }

    #handleDragStart = () => {
        const { start, end } = this.#props
        this.#dragStart = { start, end }
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
        const { start, end } = this.#dragStart
        this.#props.onDrag(event, this.#props.index, {
            start: this.#movedPoint(start, moreProps),
            end: this.#movedPoint(end, moreProps),
        })
    }
}

define("chart-each-volume-profile", EachVolumeProfile)
