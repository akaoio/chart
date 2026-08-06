import { isNotDefined } from "../../core/utils/index.js"
import { getXValue } from "../../core/utils/ChartDataUtil.js"
import { ElementBase, define, defineProperties } from "../../core/element.js"
import { isHover, saveNodeType } from "../utils.js"
import { getNewXY } from "./EachTrendLine.js"

export const eachWaveDefaults = {
    index: undefined,
    interactive: true,
    selected: false,
    start: undefined,
    end: undefined,
    mode: "cycles",
    appearance: {
        strokeStyle: "#000000",
        strokeWidth: 1,
        edgeStroke: "#000000",
        edgeFill: "#FFFFFF",
        edgeStrokeWidth: 1,
        r: 5,
    },
    hoverText: { enable: false },
    onDrag: () => {},
    onDragComplete: () => {},
}

/** One time wave and its two anchors: drag a handle to retime it, drag the body to move the whole thing. */
export class EachWave extends ElementBase {
    #props
    #dragStart
    #hover = false
    #children = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, eachWaveDefaults)
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
        const { start, end, mode, interactive, appearance, hoverText, selected } = props
        const { enable: hoverTextEnabled, selectedText, text: unselectedText, ...restHoverText } = hoverText

        if (isNotDefined(start) || isNotDefined(end)) return

        const showHandles = selected || this.#hover

        if (this.#children === null) {
            this.#children = {
                body: document.createElement("chart-interactive-wave"),
                first: document.createElement("chart-clickable-circle"),
                second: document.createElement("chart-clickable-circle"),
                hoverText: document.createElement("chart-hover-text"),
            }
            this.append(this.#children.body, this.#children.first, this.#children.second, this.#children.hoverText)
            this.nodes = [this.#children.body, this.#children.first, this.#children.second]
        }

        Object.assign(this.#children.body, {
            selected: showHandles,
            x1Value: start[0],
            y1Value: start[1],
            x2Value: end[0],
            y2Value: end[1],
            mode,
            strokeStyle: appearance.strokeStyle,
            strokeWidth: showHandles ? appearance.strokeWidth + 1 : appearance.strokeWidth,
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

        dress(this.#children.first, start, this.#handleFirstDrag)
        dress(this.#children.second, end, this.#handleSecondDrag)

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

    #handleFirstDrag = (event, moreProps) => {
        this.#props.onDrag(event, this.#props.index, { start: getNewXY(moreProps), end: this.#props.end })
    }

    #handleSecondDrag = (event, moreProps) => {
        this.#props.onDrag(event, this.#props.index, { start: this.#props.start, end: getNewXY(moreProps) })
    }

    #handleBodyStart = () => {
        const { start, end } = this.#props
        this.#dragStart = { start, end }
    }

    /** Kéo thân: cả hai neo dời cùng quãng pixel — chu kỳ và biên độ giữ nguyên. */
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

define("chart-each-wave", EachWave)
