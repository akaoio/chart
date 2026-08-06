import { isNotDefined } from "../../core/utils/index.js"
import { getXValue } from "../../core/utils/ChartDataUtil.js"
import { ElementBase, define, defineProperties } from "../../core/element.js"
import { isHover, saveNodeType } from "../utils.js"
import { generateLine } from "../components/InteractiveStraightLine.js"
import { getNewXY } from "./EachTrendLine.js"

/** The projection ratios, drawn from the pull-back point upward through the swing. */
export const EXTENSION_LEVELS = [0, 38.2, 61.8, 100, 161.8, 261.8]

/**
 * Trend-based fib extension: A→B is the swing, C the pull-back; each ratio r
 * projects a level at C + (B − A) · r, running right from C. Three points in,
 * six horizontal rays out — all recomputed here so drag stays exact.
 */
export const fibExtensionLines = ({ p1, p2, p3 }) => {
    const swing = p2[1] - p1[1]
    return EXTENSION_LEVELS.map(percent => ({ percent, x: p3[0], y: p3[1] + (swing * percent) / 100 }))
}

export const eachFibExtensionDefaults = {
    index: undefined,
    interactive: true,
    selected: false,
    p1: undefined,
    p2: undefined,
    p3: undefined,
    yDisplayFormat: value => value.toFixed(2),
    appearance: {
        strokeStyle: "#000000",
        strokeWidth: 1,
        fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
        fontSize: 10,
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
 * One drawn extension: six level rays, their labels, and three point handles.
 *
 * The handles are the three defining points — dragging one re-derives every
 * level; dragging any level line moves the whole shape by pixel delta, the
 * same arithmetic as every other wrapper and for the same reason: a
 * non-linear x scale must not distort the shape while it moves.
 */
export class EachFibExtension extends ElementBase {
    #props
    #dragStart
    #hover = false
    #children = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, eachFibExtensionDefaults)
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
        const { p1, p2, p3, interactive, yDisplayFormat, appearance, hoverText, selected } = props
        const { strokeStyle, strokeWidth, fontFamily, fontSize, fontFill } = appearance
        const { edgeStroke, edgeFill, edgeStrokeWidth, r } = appearance
        const { enable: hoverTextEnabled, selectedText, text: unselectedText, ...restHoverText } = hoverText

        // connectedCallback chay truoc khi tool kip gan ba diem — chua du thi chua dung gi
        if (isNotDefined(p1) || isNotDefined(p2) || isNotDefined(p3)) return

        const showHandles = selected || this.#hover
        const lines = fibExtensionLines({ p1, p2, p3 })

        if (this.#children === null) {
            this.#children = {
                levels: lines.map(() => ({
                    line: document.createElement("chart-interactive-straight-line"),
                    label: document.createElement("chart-interactive-label"),
                })),
                handles: [
                    document.createElement("chart-clickable-circle"),
                    document.createElement("chart-clickable-circle"),
                    document.createElement("chart-clickable-circle"),
                ],
                hoverText: document.createElement("chart-hover-text"),
            }

            for (const level of this.#children.levels) this.append(level.line, level.label)
            this.append(...this.#children.handles, this.#children.hoverText)

            this.nodes = [...this.#children.levels.map(level => level.line), ...this.#children.handles]
        }

        lines.forEach((line, index) => {
            const { line: lineNode, label } = this.#children.levels[index]

            Object.assign(lineNode, {
                selected: showHandles,
                type: "RAY",
                x1Value: line.x,
                y1Value: line.y,
                x2Value: line.x + 1,
                y2Value: line.y,
                strokeStyle,
                strokeWidth: showHandles ? strokeWidth + 1 : strokeWidth,
                interactiveCursorClass: "chart-move-cursor",
                onHover: interactive ? this.#handleHover : undefined,
                onUnHover: interactive ? this.#handleHover : undefined,
                onDragStart: this.#handleMoveStart,
                onDrag: this.#handleMove,
                onDragComplete: props.onDragComplete,
            })

            Object.assign(label, {
                selected: showHandles,
                fontFamily,
                fontSize,
                fillStyle: fontFill,
                text: `${yDisplayFormat(line.y)} (${line.percent.toFixed(1)}%)`,
                xyProvider: ({ xScale, chartConfig }) => {
                    const { yScale } = chartConfig
                    const generated = generateLine({ type: "RAY", start: [line.x, line.y], end: [line.x + 1, line.y], xScale, yScale })
                    return [xScale(Math.min(generated.x1, generated.x2)) + 10, yScale(generated.y1) - 4]
                },
            })
        })

        const points = [p1, p2, p3]
        this.#children.handles.forEach((handle, index) => {
            Object.assign(handle, {
                show: showHandles,
                cx: points[index][0],
                cy: points[index][1],
                r,
                fillStyle: edgeFill,
                strokeStyle: edgeStroke,
                strokeWidth: edgeStrokeWidth,
                interactiveCursorClass: "chart-move-cursor",
                onDragStart: () => {},
                onDrag: this.#handlePointDrag(index),
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

    #handlePointDrag = which => (event, moreProps) => {
        const { p1, p2, p3 } = this.#props
        const points = [p1, p2, p3]
        points[which] = getNewXY(moreProps)
        this.#props.onDrag(event, this.#props.index, { p1: points[0], p2: points[1], p3: points[2] })
    }

    #handleMoveStart = () => {
        const { p1, p2, p3 } = this.#props
        this.#dragStart = { p1, p2, p3 }
    }

    /** Whole-shape move: one pixel delta applied to all three points. */
    #handleMove = (event, moreProps) => {
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

        this.#props.onDrag(event, this.#props.index, {
            p1: move(this.#dragStart.p1),
            p2: move(this.#dragStart.p2),
            p3: move(this.#dragStart.p3),
        })
    }
}

define("chart-each-fib-extension", EachFibExtension)
