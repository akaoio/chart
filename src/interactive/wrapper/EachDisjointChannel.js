import { isDefined } from "../../core/utils/index.js"
import { getXValue } from "../../core/utils/ChartDataUtil.js"
import { ElementBase, define, defineProperties } from "../../core/element.js"
import { isHover, saveNodeType } from "../utils.js"

export const eachDisjointChannelDefaults = {
    index: undefined,
    interactive: true,
    selected: false,
    startXY: undefined,
    endXY: undefined,
    dy: undefined,
    dy2: undefined,
    flat: false,
    hoverText: { enable: false },
    appearance: {
        stroke: "#000000",
        strokeWidth: 1,
        fill: "rgba(138, 175, 226, 0.7)",
        edgeStroke: "#000000",
        edgeFill: "#FFFFFF",
        edgeFill2: "#250B98",
        edgeStrokeWidth: 1,
        r: 5,
    },
    onDrag: () => {},
    onDragComplete: () => {},
}

/**
 * One disjoint channel, with five grab points.
 *
 * The difference from `chart-each-equidistant-channel` is the whole point of the tool:
 * the second line's two handles move INDEPENDENTLY — the near one changes `dy`, the far
 * one changes `dy2` — so the second line may lean away from the first. With `flat: true`
 * the two offsets stay linked so the second line remains horizontal (TV's Flat
 * Top/Bottom): either handle drags the LEVEL, and both offsets are recomputed from it.
 */
export class EachDisjointChannel extends ElementBase {
    #props
    #dragStart
    #hover = false
    #children = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, eachDisjointChannelDefaults)
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
        const { startXY, endXY, dy, dy2, appearance, selected, hoverText } = props
        const { edgeFill, edgeFill2, stroke, strokeWidth, fill, edgeStroke, edgeStrokeWidth, r } = appearance
        const { enable: hoverTextEnabled, ...restHoverText } = hoverText

        const showHandles = selected || this.#hover

        if (this.#children === null) {
            this.#children = {
                channel: document.createElement("chart-channel-with-area"),
                line1edge1: document.createElement("chart-clickable-circle"),
                line1edge2: document.createElement("chart-clickable-circle"),
                line2edge1: document.createElement("chart-clickable-circle"),
                line2edge2: document.createElement("chart-clickable-circle"),
                hoverText: document.createElement("chart-hover-text"),
            }

            this.append(...Object.values(this.#children))
            this.nodes = Object.entries(this.#children)
                .filter(([name]) => name !== "hoverText")
                .map(([, node]) => node)
        }

        const { channel, line1edge1, line1edge2, line2edge1, line2edge2, hoverText: hoverNode } = this.#children

        Object.assign(channel, {
            selected: showHandles,
            startXY,
            endXY,
            dy,
            dy2,
            strokeStyle: stroke,
            strokeWidth: showHandles ? strokeWidth + 1 : strokeWidth,
            fillStyle: fill,
            interactiveCursorClass: "chart-move-cursor",
            onHover: props.interactive ? this.#handleHover : undefined,
            onUnHover: props.interactive ? this.#handleHover : undefined,
            onDragStart: this.#handleDragStart,
            onDrag: this.#handleChannelDrag,
            onDragComplete: props.onDragComplete,
        })

        const dressEdge = (circle, xy, dragHandler, cursor, edgeColour, visible) =>
            Object.assign(circle, {
                show: visible && showHandles,
                cx: xy?.[0],
                cy: xy?.[1],
                r,
                fillStyle: edgeColour,
                strokeStyle: edgeStroke,
                strokeWidth: edgeStrokeWidth,
                interactiveCursorClass: cursor,
                onDragStart: this.#handleDragStart,
                onDrag: dragHandler,
                onDragComplete: props.onDragComplete,
            })

        const lineDefined = isDefined(startXY) && isDefined(endXY)
        const heightDefined = lineDefined && isDefined(dy)

        dressEdge(line1edge1, startXY, this.#handleLine1Edge1Drag, "chart-move-cursor", edgeFill, lineDefined)
        dressEdge(line1edge2, endXY, this.#handleLine1Edge2Drag, "chart-move-cursor", edgeFill, lineDefined)
        dressEdge(
            line2edge1,
            heightDefined ? [startXY[0], startXY[1] + dy] : undefined,
            this.#handleNearOffsetDrag,
            "chart-ns-resize-cursor",
            edgeFill2,
            heightDefined,
        )
        dressEdge(
            line2edge2,
            heightDefined ? [endXY[0], endXY[1] + (isDefined(dy2) ? dy2 : dy)] : undefined,
            this.#handleFarOffsetDrag,
            "chart-ns-resize-cursor",
            edgeFill2,
            heightDefined,
        )

        Object.assign(hoverNode, { ...restHoverText, show: hoverTextEnabled && this.#hover && !selected })
    }

    #handleHover = (event, moreProps) => {
        if (this.#hover === moreProps.hovering) return
        this.#hover = moreProps.hovering
        this.update()
    }

    #handleDragStart = () => {
        const { startXY, endXY, dy, dy2, flat } = this.#props
        this.#dragStart = { startXY, endXY, dy, dy2: isDefined(dy2) ? dy2 : dy, flat }
    }

    /** Pixel delta of this drag, translated back into a y-VALUE delta at `anchor`. */
    #valueDelta(anchor, moreProps) {
        const {
            chartConfig: { yScale },
            startPos,
            mouseXY,
        } = moreProps
        const dragged = startPos[1] - mouseXY[1]
        return yScale.invert(yScale(anchor) - dragged) - anchor
    }

    /** The near handle: `dy` alone — unless flat, where both offsets follow the level. */
    #handleNearOffsetDrag = (event, moreProps) => {
        const { startXY, endXY, dy, dy2, flat } = this.#dragStart
        const delta = this.#valueDelta(startXY[1] + dy, moreProps)

        if (flat) {
            const level = startXY[1] + dy + delta
            this.#props.onDrag(event, this.#props.index, { startXY, endXY, dy: level - startXY[1], dy2: level - endXY[1], flat })
            return
        }
        this.#props.onDrag(event, this.#props.index, { startXY, endXY, dy: dy + delta, dy2, flat })
    }

    /** The far handle: `dy2` alone — same flat rule. */
    #handleFarOffsetDrag = (event, moreProps) => {
        const { startXY, endXY, dy, dy2, flat } = this.#dragStart
        const delta = this.#valueDelta(endXY[1] + dy2, moreProps)

        if (flat) {
            const level = endXY[1] + dy2 + delta
            this.#props.onDrag(event, this.#props.index, { startXY, endXY, dy: level - startXY[1], dy2: level - endXY[1], flat })
            return
        }
        this.#props.onDrag(event, this.#props.index, { startXY, endXY, dy, dy2: dy2 + delta, flat })
    }

    /** Moving a baseline end under `flat` re-derives ITS offset so the level holds. */
    #handleLine1Edge1Drag = (event, moreProps) => {
        const { startXY, endXY, dy, dy2, flat } = this.#dragStart
        const moved = this.#movedPoint(startXY, moreProps)
        const nextDy = flat ? startXY[1] + dy - moved[1] : dy
        this.#props.onDrag(event, this.#props.index, { startXY: moved, endXY, dy: nextDy, dy2, flat })
    }

    #handleLine1Edge2Drag = (event, moreProps) => {
        const { startXY, endXY, dy, dy2, flat } = this.#dragStart
        const moved = this.#movedPoint(endXY, moreProps)
        const nextDy2 = flat ? endXY[1] + dy2 - moved[1] : dy2
        this.#props.onDrag(event, this.#props.index, { startXY, endXY: moved, dy, dy2: nextDy2, flat })
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

    #handleChannelDrag = (event, moreProps) => {
        const { startXY, endXY, dy, dy2, flat } = this.#dragStart

        this.#props.onDrag(event, this.#props.index, {
            startXY: this.#movedPoint(startXY, moreProps),
            endXY: this.#movedPoint(endXY, moreProps),
            dy,
            dy2,
            flat,
        })
    }
}

define("chart-each-disjoint-channel", EachDisjointChannel)
