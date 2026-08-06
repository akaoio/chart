import { isNotDefined } from "../../core/utils/index.js"
import { getXValue } from "../../core/utils/ChartDataUtil.js"
import { ElementBase, define, defineProperties } from "../../core/element.js"
import { isHover, saveNodeType } from "../utils.js"
import { getNewXY } from "./EachTrendLine.js"

export const eachArrowDefaults = {
    index: undefined,
    interactive: true,
    selected: false,
    start: undefined,
    end: undefined,
    appearance: {
        strokeStyle: "#000000",
        strokeWidth: 2,
        headSize: 10,
        edgeStroke: "#000000",
        edgeFill: "#FFFFFF",
        edgeStrokeWidth: 1,
        r: 5,
    },
    hoverText: { enable: false },
    onDrag: () => {},
    onDragComplete: () => {},
}

/** One arrow: the shaft, a handle at the tail, a handle at the head. */
export class EachArrow extends ElementBase {
    #props
    #dragStart
    #hover = false
    #children = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, eachArrowDefaults)
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
        const { start, end, interactive, appearance, hoverText, selected } = props
        const { enable: hoverTextEnabled, selectedText, text: unselectedText, ...restHoverText } = hoverText

        if (isNotDefined(start) || isNotDefined(end)) return

        const showHandles = selected || this.#hover

        if (this.#children === null) {
            this.#children = {
                body: document.createElement("chart-interactive-arrow"),
                tail: document.createElement("chart-clickable-circle"),
                head: document.createElement("chart-clickable-circle"),
                hoverText: document.createElement("chart-hover-text"),
            }
            this.append(this.#children.body, this.#children.tail, this.#children.head, this.#children.hoverText)
            this.nodes = [this.#children.body, this.#children.tail, this.#children.head]
        }

        Object.assign(this.#children.body, {
            selected: showHandles,
            x1Value: start[0],
            y1Value: start[1],
            x2Value: end[0],
            y2Value: end[1],
            strokeStyle: appearance.strokeStyle,
            strokeWidth: showHandles ? appearance.strokeWidth + 1 : appearance.strokeWidth,
            headSize: appearance.headSize,
            interactiveCursorClass: "chart-move-cursor",
            onHover: interactive ? this.#handleHover : undefined,
            onUnHover: interactive ? this.#handleHover : undefined,
            onDragStart: this.#handleBodyStart,
            onDrag: this.#handleBodyDrag,
            onDragComplete: props.onDragComplete,
        })

        const dress = (circle, point, onDrag) =>
            Object.assign(circle, {
                show: showHandles,
                cx: point[0],
                cy: point[1],
                r: appearance.r,
                fillStyle: appearance.edgeFill,
                strokeStyle: appearance.edgeStroke,
                strokeWidth: appearance.edgeStrokeWidth,
                interactiveCursorClass: "chart-move-cursor",
                onDragStart: () => {},
                onDrag,
                onDragComplete: props.onDragComplete,
            })

        dress(this.#children.tail, start, this.#handleTailDrag)
        dress(this.#children.head, end, this.#handleHeadDrag)

        Object.assign(this.#children.hoverText, {
            ...restHoverText,
            show: hoverTextEnabled && this.#hover,
            text: selected ? selectedText : unselectedText,
        })
    }

    #handleHover = (event, moreProps) => {
        if (this.#hover === moreProps.hovering) return
        this.#hover = moreProps.hovering
        this.update()
    }

    #handleTailDrag = (event, moreProps) => {
        this.#props.onDrag(event, this.#props.index, { start: getNewXY(moreProps), end: this.#props.end })
    }

    #handleHeadDrag = (event, moreProps) => {
        this.#props.onDrag(event, this.#props.index, { start: this.#props.start, end: getNewXY(moreProps) })
    }

    #handleBodyStart = () => {
        const { start, end } = this.#props
        this.#dragStart = { start, end }
    }

    #handleBodyDrag = (event, moreProps) => {
        const {
            xScale,
            chartConfig: { yScale },
            xAccessor,
            fullData,
            startPos,
            mouseXY,
        } = moreProps
        const dx = startPos[0] - mouseXY[0]
        const dy = startPos[1] - mouseXY[1]
        const move = ([xValue, yValue]) => [
            getXValue(xScale, xAccessor, [xScale(xValue) - dx, yScale(yValue) - dy], fullData),
            yScale.invert(yScale(yValue) - dy),
        ]
        this.#props.onDrag(event, this.#props.index, { start: move(this.#dragStart.start), end: move(this.#dragStart.end) })
    }
}

define("chart-each-arrow", EachArrow)
