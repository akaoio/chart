import { isNotDefined } from "../../core/utils/index.js"
import { getXValue } from "../../core/utils/ChartDataUtil.js"
import { ElementBase, define, defineProperties } from "../../core/element.js"
import { isHover, saveNodeType } from "../utils.js"
import { getNewXY } from "./EachTrendLine.js"

export const eachInfoLineDefaults = {
    index: undefined,
    interactive: true,
    selected: false,
    start: undefined,
    end: undefined,
    yDisplayFormat: value => value.toFixed(2),
    appearance: {
        strokeStyle: "#000000",
        strokeWidth: 1,
        fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
        fontSize: 11,
        fontFill: "#000000",
        edgeStroke: "#000000",
        edgeFill: "#FFFFFF",
        edgeStrokeWidth: 1,
        r: 5,
    },
    hoverText: { enable: false },
    onDrag: () => {},
    onDragComplete: () => {},
}

/**
 * One info line: a bounded trend segment whose midpoint label reads the
 * measurement out — price change, percent, bar count. All three derive from
 * data values, so the label needs no pixel arithmetic and cannot go stale.
 */
export class EachInfoLine extends ElementBase {
    #props
    #dragStart
    #hover = false
    #children = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, eachInfoLineDefaults)
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
        const { start, end, interactive, yDisplayFormat, appearance, hoverText, selected } = props
        const { enable: hoverTextEnabled, selectedText, text: unselectedText, ...restHoverText } = hoverText

        if (isNotDefined(start) || isNotDefined(end)) return

        const showHandles = selected || this.#hover

        if (this.#children === null) {
            this.#children = {
                line: document.createElement("chart-interactive-straight-line"),
                label: document.createElement("chart-interactive-label"),
                first: document.createElement("chart-clickable-circle"),
                second: document.createElement("chart-clickable-circle"),
                hoverText: document.createElement("chart-hover-text"),
            }
            this.append(this.#children.line, this.#children.label, this.#children.first, this.#children.second, this.#children.hoverText)
            this.nodes = [this.#children.line, this.#children.first, this.#children.second]
        }

        Object.assign(this.#children.line, {
            selected: showHandles,
            type: "LINE",
            x1Value: start[0],
            y1Value: start[1],
            x2Value: end[0],
            y2Value: end[1],
            strokeStyle: appearance.strokeStyle,
            strokeWidth: showHandles ? appearance.strokeWidth + 1 : appearance.strokeWidth,
            interactiveCursorClass: "chart-move-cursor",
            onHover: interactive ? this.#handleHover : undefined,
            onUnHover: interactive ? this.#handleHover : undefined,
            onDragStart: this.#handleBodyStart,
            onDrag: this.#handleBodyDrag,
            onDragComplete: props.onDragComplete,
        })

        // Số đo suy từ giá trị dữ liệu — không dính pixel nên không bao giờ cũ
        const change = end[1] - start[1]
        const percent = start[1] === 0 ? 0 : (change / Math.abs(start[1])) * 100
        const bars = Math.round(end[0] - start[0])
        const middle = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2]

        Object.assign(this.#children.label, {
            selected: showHandles,
            fontFamily: appearance.fontFamily,
            fontSize: appearance.fontSize,
            fillStyle: appearance.fontFill,
            text: `${yDisplayFormat(change)} (${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%) · ${bars} bars`,
            xyProvider: ({ xScale, chartConfig }) => [xScale(middle[0]), chartConfig.yScale(middle[1]) - 10],
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

define("chart-each-info-line", EachInfoLine)
