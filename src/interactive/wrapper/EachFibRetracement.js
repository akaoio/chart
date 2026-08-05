import { head, last } from "../../core/utils/index.js"
import { getXValue } from "../../core/utils/ChartDataUtil.js"
import { ElementBase, define, defineProperties } from "../../core/element.js"
import { isHover, saveNodeType } from "../utils.js"
import { generateLine } from "../components/InteractiveStraightLine.js"
import { getNewXY } from "./EachTrendLine.js"

/** The Fibonacci ratios, in the order they are drawn from the low. */
export const RETRACEMENT_LEVELS = [100, 61.8, 50, 38.2, 23.6, 0]

export const fibLines = ({ x1, y1, x2, y2 }) => {
    const dy = y2 - y1

    return RETRACEMENT_LEVELS.map(percent => ({ percent, x1, x2, y: y2 - (percent / 100) * dy }))
}

export const eachFibRetracementDefaults = {
    index: undefined,
    interactive: true,
    selected: false,
    type: "RETRACEMENT",
    x1: undefined,
    y1: undefined,
    x2: undefined,
    y2: undefined,
    yDisplayFormat: value => value.toFixed(2),
    appearance: {
        strokeStyle: "#000000",
        strokeWidth: 1,
        fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
        fontSize: 10,
        fontFill: "#000000",
        edgeStroke: "#000000",
        edgeFill: "#FFFFFF",
        nsEdgeFill: "#000000",
        edgeStrokeWidth: 1,
        r: 5,
    },
    hoverText: { enable: false },
    onDrag: () => {},
    onDragComplete: () => {},
}

/**
 * One Fibonacci retracement: six levels between a high and a low.
 *
 * The two outer levels resize the whole thing vertically — they *are* the high and the
 * low — while the four inside only move it. Each gets a different cursor so the
 * difference is visible before clicking, which matters because the levels look identical.
 */
export class EachFibRetracement extends ElementBase {
    #props
    #dragStart
    #hover = false
    #children = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, eachFibRetracementDefaults)
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
        const { x1, x2, y1, y2, interactive, yDisplayFormat, type, appearance, hoverText, selected } = props
        const { strokeStyle, strokeWidth, fontFamily, fontSize, fontFill } = appearance
        const { edgeStroke, edgeFill, nsEdgeFill, edgeStrokeWidth, r } = appearance
        const { enable: hoverTextEnabled, selectedText, text: unselectedText, ...restHoverText } = hoverText

        const showHandles = selected || this.#hover
        const lines = fibLines({ x1, x2, y1, y2 })

        const lineType = type === "EXTEND" ? "XLINE" : type === "BOUND" ? "LINE" : "RAY"
        // labels sit below the line when the retracement runs downward, above when up
        const labelOffset = head(lines).y1 > last(lines).y1 ? 3 : -1.3

        if (this.#children === null) {
            this.#children = {
                levels: lines.map(() => ({
                    line: document.createElement("chart-interactive-straight-line"),
                    label: document.createElement("chart-interactive-label"),
                    edge1: document.createElement("chart-clickable-circle"),
                    edge2: document.createElement("chart-clickable-circle"),
                })),
                hoverText: document.createElement("chart-hover-text"),
            }

            for (const level of this.#children.levels) {
                this.append(level.line, level.label, level.edge1, level.edge2)
            }
            this.append(this.#children.hoverText)

            this.nodes = this.#children.levels.flatMap(level => [level.line, level.edge1, level.edge2])
        }

        lines.forEach((line, index) => {
            const { line: lineNode, label, edge1, edge2 } = this.#children.levels[index]
            const firstOrLast = index === 0 || index === lines.length - 1

            const dragHandler = firstOrLast
                ? index === 0
                    ? this.#handleResizeTop
                    : this.#handleResizeBottom
                : this.#handleLineMove

            Object.assign(lineNode, {
                selected: showHandles,
                onHover: interactive ? this.#handleHover : undefined,
                onUnHover: interactive ? this.#handleHover : undefined,
                type: lineType,
                x1Value: line.x1,
                y1Value: line.y,
                x2Value: line.x2,
                y2Value: line.y,
                strokeStyle,
                strokeWidth: showHandles ? strokeWidth + 1 : strokeWidth,
                interactiveCursorClass: firstOrLast ? "chart-ns-resize-cursor" : "chart-move-cursor",
                onDragStart: this.#handleLineDragStart,
                onDrag: dragHandler,
                onDragComplete: props.onDragComplete,
            })

            Object.assign(label, {
                selected,
                fontFamily,
                fontSize,
                fillStyle: fontFill,
                text: `${yDisplayFormat(line.y)} (${line.percent.toFixed(2)}%)`,
                xyProvider: ({ xScale, chartConfig }) => {
                    const { yScale } = chartConfig
                    const generated = generateLine({
                        type: lineType,
                        start: [line.x1, line.y],
                        end: [line.x2, line.y],
                        xScale,
                        yScale,
                    })

                    return [
                        xScale(Math.min(generated.x1, generated.x2)) + 10,
                        yScale(generated.y1) + labelOffset * 4,
                    ]
                },
            })

            const edgeDrag = firstOrLast ? dragHandler : null

            Object.assign(edge1, {
                show: showHandles,
                cx: line.x1,
                cy: line.y,
                r,
                fillStyle: firstOrLast ? nsEdgeFill : edgeFill,
                strokeStyle: edgeStroke,
                strokeWidth: edgeStrokeWidth,
                interactiveCursorClass: firstOrLast ? "chart-ns-resize-cursor" : "chart-ew-resize-cursor",
                onDrag: edgeDrag ?? this.#handleEdge1Drag,
                onDragComplete: props.onDragComplete,
            })

            Object.assign(edge2, {
                show: showHandles,
                cx: line.x2,
                cy: line.y,
                r,
                fillStyle: firstOrLast ? nsEdgeFill : edgeFill,
                strokeStyle: edgeStroke,
                strokeWidth: edgeStrokeWidth,
                interactiveCursorClass: firstOrLast ? "chart-ns-resize-cursor" : "chart-ew-resize-cursor",
                onDrag: edgeDrag ?? this.#handleEdge2Drag,
                onDragComplete: props.onDragComplete,
            })
        })

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

    #report(changes) {
        const { x1, y1, x2, y2, index, onDrag } = this.#props
        return event => onDrag(event, index, { x1, y1, x2, y2, ...changes })
    }

    #handleEdge1Drag = (event, moreProps) => {
        const [x1] = getNewXY(moreProps)
        this.#report({ x1 })(event)
    }

    #handleEdge2Drag = (event, moreProps) => {
        const [x2] = getNewXY(moreProps)
        this.#report({ x2 })(event)
    }

    #handleResizeTop = (event, moreProps) => {
        const [, y1] = getNewXY(moreProps)
        this.#report({ y1 })(event)
    }

    #handleResizeBottom = (event, moreProps) => {
        const [, y2] = getNewXY(moreProps)
        this.#report({ y2 })(event)
    }

    #handleLineDragStart = () => {
        const { x1, y1, x2, y2 } = this.#props
        this.#dragStart = { x1, y1, x2, y2 }
    }

    #handleLineMove = (event, moreProps) => {
        const { x1: x1Value, y1: y1Value, x2: x2Value, y2: y2Value } = this.#dragStart

        const {
            xScale,
            chartConfig: { yScale },
            xAccessor,
            fullData,
            startPos,
            mouseXY,
        } = moreProps

        const x1 = xScale(x1Value)
        const y1 = yScale(y1Value)
        const x2 = xScale(x2Value)
        const y2 = yScale(y2Value)

        const dx = startPos[0] - mouseXY[0]
        const dy = startPos[1] - mouseXY[1]

        this.#props.onDrag(event, this.#props.index, {
            x1: getXValue(xScale, xAccessor, [x1 - dx, y1 - dy], fullData),
            y1: yScale.invert(y1 - dy),
            x2: getXValue(xScale, xAccessor, [x2 - dx, y2 - dy], fullData),
            y2: yScale.invert(y2 - dy),
        })
    }
}

define("chart-each-fib-retracement", EachFibRetracement)
