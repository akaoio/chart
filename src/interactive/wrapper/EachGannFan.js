import { isDefined } from "../../core/utils/index.js"
import { getXValue } from "../../core/utils/ChartDataUtil.js"
import { ElementBase, define, defineProperties } from "../../core/element.js"
import { isHover, saveNodeType } from "../utils.js"

export const eachGannFanDefaults = {
    index: undefined,
    interactive: true,
    selected: false,
    startXY: undefined,
    endXY: undefined,
    appearance: {
        stroke: "#000000",
        strokeWidth: 1,
        edgeStroke: "#000000",
        edgeFill: "#FFFFFF",
        edgeStrokeWidth: 1,
        r: 5,
        fill: [
            "rgba(31, 119, 180, 0.2)",
            "rgba(255, 126, 14, 0.2)",
            "rgba(44, 160, 44, 0.2)",
            "rgba(214, 39, 39, 0.2)",
            "rgba(148, 103, 189, 0.2)",
            "rgba(140, 86, 75, 0.2)",
            "rgba(227, 119, 194, 0.2)",
            "rgba(127, 127, 127, 0.2)",
        ],
        fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
        fontSize: 10,
        fontFill: "#000000",
    },
    hoverText: { enable: true, bgHeight: 18, bgWidth: 120, text: "Click to select object" },
    onDrag: () => {},
    onDragComplete: () => {},
}

/** One Gann fan, adjustable by the two points that define its 1/1 ray. */
export class EachGannFan extends ElementBase {
    #props
    #dragStart
    #hover = false
    #children = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, eachGannFanDefaults)
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
        const { startXY, endXY, appearance, hoverText, selected, interactive } = props
        const { edgeFill, stroke, strokeWidth, fill, fontFamily, fontSize, fontFill } = appearance
        const { edgeStroke, edgeStrokeWidth, r } = appearance
        const { enable: hoverTextEnabled, ...restHoverText } = hoverText

        const showHandles = selected || this.#hover

        if (this.#children === null) {
            this.#children = {
                fan: document.createElement("chart-gann-fan"),
                edge1: document.createElement("chart-clickable-circle"),
                edge2: document.createElement("chart-clickable-circle"),
                hoverText: document.createElement("chart-hover-text"),
            }

            this.append(...Object.values(this.#children))
            this.nodes = [this.#children.fan, this.#children.edge1, this.#children.edge2]
        }

        const { fan, edge1, edge2, hoverText: hoverNode } = this.#children

        Object.assign(fan, {
            selected: showHandles,
            startXY,
            endXY,
            strokeStyle: stroke,
            strokeWidth: showHandles ? strokeWidth + 1 : strokeWidth,
            fillStyle: fill,
            fontFamily,
            fontSize,
            fontFill,
            interactiveCursorClass: "chart-move-cursor",
            onHover: interactive ? this.#handleHover : undefined,
            onUnHover: interactive ? this.#handleHover : undefined,
            onDragStart: this.#handleDragStart,
            onDrag: this.#handleFanDrag,
            onDragComplete: props.onDragComplete,
        })

        const visible = isDefined(startXY) && isDefined(endXY)

        const dressEdge = (circle, xy, dragHandler) =>
            Object.assign(circle, {
                show: visible && showHandles,
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

        dressEdge(edge1, startXY, this.#handleEdge1Drag)
        dressEdge(edge2, endXY, this.#handleEdge2Drag)

        Object.assign(hoverNode, { ...restHoverText, show: hoverTextEnabled && this.#hover && !selected })
    }

    #handleHover = (event, moreProps) => {
        if (this.#hover === moreProps.hovering) return
        this.#hover = moreProps.hovering
        this.update()
    }

    #handleDragStart = () => {
        const { startXY, endXY } = this.#props
        this.#dragStart = { startXY, endXY }
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

    #handleEdge1Drag = (event, moreProps) => {
        this.#props.onDrag(event, this.#props.index, {
            startXY: this.#movedPoint(this.#dragStart.startXY, moreProps),
            endXY: this.#dragStart.endXY,
        })
    }

    #handleEdge2Drag = (event, moreProps) => {
        this.#props.onDrag(event, this.#props.index, {
            startXY: this.#dragStart.startXY,
            endXY: this.#movedPoint(this.#dragStart.endXY, moreProps),
        })
    }

    #handleFanDrag = (event, moreProps) => {
        this.#props.onDrag(event, this.#props.index, {
            startXY: this.#movedPoint(this.#dragStart.startXY, moreProps),
            endXY: this.#movedPoint(this.#dragStart.endXY, moreProps),
        })
    }
}

define("chart-each-gann-fan", EachGannFan)
