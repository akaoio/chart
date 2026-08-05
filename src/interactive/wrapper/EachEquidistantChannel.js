import { isDefined } from "../../core/utils/index.js"
import { getXValue } from "../../core/utils/ChartDataUtil.js"
import { ElementBase, define, defineProperties } from "../../core/element.js"
import { isHover, saveNodeType } from "../utils.js"

export const eachEquidistantChannelDefaults = {
    index: undefined,
    interactive: true,
    selected: false,
    startXY: undefined,
    endXY: undefined,
    dy: undefined,
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
 * One equidistant channel, with five grab points.
 *
 * Two handles move the first line's ends; two more change the channel's *height* and are
 * given a vertical resize cursor, because they can only move that way — the second line
 * is defined as an offset, so dragging it sideways would mean nothing.
 */
export class EachEquidistantChannel extends ElementBase {
    #props
    #dragStart
    #hover = false
    #children = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, eachEquidistantChannelDefaults)
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
        const { startXY, endXY, dy, appearance, selected, hoverText } = props
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
        const heightDefined = lineDefined && dy !== undefined && isDefined(dy)

        dressEdge(line1edge1, startXY, this.#handleLine1Edge1Drag, "chart-move-cursor", edgeFill, lineDefined)
        dressEdge(line1edge2, endXY, this.#handleLine1Edge2Drag, "chart-move-cursor", edgeFill, lineDefined)
        dressEdge(
            line2edge1,
            heightDefined ? [startXY[0], startXY[1] + dy] : undefined,
            this.#handleChannelHeightChange,
            "chart-ns-resize-cursor",
            edgeFill2,
            heightDefined,
        )
        dressEdge(
            line2edge2,
            heightDefined ? [endXY[0], endXY[1] + dy] : undefined,
            this.#handleChannelHeightChange,
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
        const { startXY, endXY, dy } = this.#props
        this.#dragStart = { startXY, endXY, dy }
    }

    /** Only `dy` changes — the first line stays exactly where it is. */
    #handleChannelHeightChange = (event, moreProps) => {
        const { startXY, endXY } = this.#dragStart
        const {
            chartConfig: { yScale },
            startPos,
            mouseXY,
        } = moreProps

        const y2 = yScale(endXY[1])
        const dy = startPos[1] - mouseXY[1]
        const newY2Value = yScale.invert(y2 - dy)

        this.#props.onDrag(event, this.#props.index, {
            startXY,
            endXY,
            dy: newY2Value - endXY[1] + this.#dragStart.dy,
        })
    }

    #handleLine1Edge1Drag = (event, moreProps) => {
        const { startXY } = this.#dragStart
        const [x, y] = this.#movedPoint(startXY, moreProps)

        this.#props.onDrag(event, this.#props.index, {
            startXY: [x, y],
            endXY: this.#dragStart.endXY,
            dy: this.#dragStart.dy,
        })
    }

    #handleLine1Edge2Drag = (event, moreProps) => {
        const { endXY } = this.#dragStart
        const [x, y] = this.#movedPoint(endXY, moreProps)

        this.#props.onDrag(event, this.#props.index, {
            startXY: this.#dragStart.startXY,
            endXY: [x, y],
            dy: this.#dragStart.dy,
        })
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
        const { startXY, endXY } = this.#dragStart

        this.#props.onDrag(event, this.#props.index, {
            startXY: this.#movedPoint(startXY, moreProps),
            endXY: this.#movedPoint(endXY, moreProps),
            dy: this.#dragStart.dy,
        })
    }
}

define("chart-each-equidistant-channel", EachEquidistantChannel)
