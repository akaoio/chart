import { getXValue } from "../../core/utils/ChartDataUtil.js"
import { ElementBase, define, defineProperties } from "../../core/element.js"
import { isHover, saveNodeType } from "../utils.js"
import { getNewXY } from "./EachTrendLine.js"

export const eachPositionDefaults = {
    index: undefined,
    selected: false,
    x1Value: undefined,
    x2Value: undefined,
    entry: undefined,
    target: undefined,
    stop: undefined,
    profitFill: "rgba(38, 166, 154, 0.2)",
    lossFill: "rgba(239, 83, 80, 0.2)",
    strokeStyle: "#787B86",
    strokeWidth: 1,
    textFill: "#FFFFFF",
    profitLabelFill: "#26A69A",
    lossLabelFill: "#EF5350",
    fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
    fontSize: 11,
    formatPrice: undefined,
    edgeStroke: "#787B86",
    edgeFill: "#FFFFFF",
    edgeStrokeWidth: 2,
    r: 5,
    hoverText: { enable: false },
    edgeInteractiveCursor: "chart-ns-resize-cursor",
    spanInteractiveCursor: "chart-ew-resize-cursor",
    bodyInteractiveCursor: "chart-move-cursor",
    onDrag: () => {},
    onDragComplete: () => {},
}

/**
 * One position plan and its five draggable parts.
 *
 * Target and stop handles sit mid-box on their levels and move only that level; the
 * two span handles sit on the entry line's ends and move only their x; the body moves
 * everything together. Long flips to short by dragging the target below the entry —
 * the geometry is the mode.
 */
export class EachPosition extends ElementBase {
    #props
    #dragStart
    #hover = false

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, eachPositionDefaults)
        this.isHover = isHover.bind(this)
        this.saveNodeType = saveNodeType.bind(this)
    }

    #children = null

    connectedCallback() {
        this.style.display = "none"
        this.#build()
    }

    /** Update the child elements in place; create them only once (see EachTrendLine). */
    #build() {
        const props = this.#props
        const { enable: hoverTextEnabled, selectedText, text: unselectedText, ...restHoverText } = props.hoverText

        const showHandles = props.selected || this.#hover
        const centerX = (props.x1Value + props.x2Value) / 2

        if (this.#children === null) {
            this.#children = {
                body: document.createElement("chart-interactive-position"),
                targetHandle: document.createElement("chart-clickable-circle"),
                stopHandle: document.createElement("chart-clickable-circle"),
                spanLeft: document.createElement("chart-clickable-circle"),
                spanRight: document.createElement("chart-clickable-circle"),
                hoverText: document.createElement("chart-hover-text"),
            }

            this.append(
                this.#children.body,
                this.#children.targetHandle,
                this.#children.stopHandle,
                this.#children.spanLeft,
                this.#children.spanRight,
                this.#children.hoverText,
            )

            this.nodes = [
                this.#children.body,
                this.#children.targetHandle,
                this.#children.stopHandle,
                this.#children.spanLeft,
                this.#children.spanRight,
            ]
        }

        const { body, targetHandle, stopHandle, spanLeft, spanRight, hoverText } = this.#children

        Object.assign(body, {
            selected: showHandles,
            x1Value: props.x1Value,
            x2Value: props.x2Value,
            entry: props.entry,
            target: props.target,
            stop: props.stop,
            profitFill: props.profitFill,
            lossFill: props.lossFill,
            strokeStyle: props.strokeStyle,
            strokeWidth: props.strokeWidth,
            textFill: props.textFill,
            profitLabelFill: props.profitLabelFill,
            lossLabelFill: props.lossLabelFill,
            fontFamily: props.fontFamily,
            fontSize: props.fontSize,
            ...(props.formatPrice !== undefined ? { formatPrice: props.formatPrice } : {}),
            interactiveCursorClass: props.bodyInteractiveCursor,
            onHover: this.#handleHover,
            onUnHover: this.#handleHover,
            onDragStart: this.#handleBodyDragStart,
            onDrag: this.#handleBodyDrag,
            onDragComplete: props.onDragComplete,
        })

        const dress = (circle, cx, cy, cursor, onDrag) =>
            Object.assign(circle, {
                show: showHandles,
                cx,
                cy,
                r: props.r,
                fillStyle: props.edgeFill,
                strokeStyle: props.edgeStroke,
                strokeWidth: props.edgeStrokeWidth,
                interactiveCursorClass: cursor,
                onDragStart: () => {},
                onDrag,
                onDragComplete: props.onDragComplete,
            })

        dress(targetHandle, centerX, props.target, props.edgeInteractiveCursor, this.#handleTargetDrag)
        dress(stopHandle, centerX, props.stop, props.edgeInteractiveCursor, this.#handleStopDrag)
        dress(spanLeft, props.x1Value, props.entry, props.spanInteractiveCursor, this.#handleSpanLeftDrag)
        dress(spanRight, props.x2Value, props.entry, props.spanInteractiveCursor, this.#handleSpanRightDrag)

        Object.assign(hoverText, {
            ...restHoverText,
            show: hoverTextEnabled && this.#hover,
            text: props.selected ? selectedText : unselectedText,
        })
    }

    /** Rebuild on any property change, so handles appear and disappear with selection. */
    update() {
        if (this.isConnected) this.#build()
    }

    #handleHover = (event, moreProps) => {
        if (this.#hover === moreProps.hovering) return

        this.#hover = moreProps.hovering
        this.update()
    }

    #report(changes) {
        const { x1Value, x2Value, entry, target, stop } = this.#props
        return { x1Value, x2Value, entry, target, stop, ...changes }
    }

    #handleTargetDrag = (event, moreProps) => {
        const [, target] = getNewXY(moreProps)
        this.#props.onDrag(event, this.#props.index, this.#report({ target }))
    }

    #handleStopDrag = (event, moreProps) => {
        const [, stop] = getNewXY(moreProps)
        this.#props.onDrag(event, this.#props.index, this.#report({ stop }))
    }

    #handleSpanLeftDrag = (event, moreProps) => {
        const [x1Value] = getNewXY(moreProps)
        this.#props.onDrag(event, this.#props.index, this.#report({ x1Value }))
    }

    #handleSpanRightDrag = (event, moreProps) => {
        const [x2Value] = getNewXY(moreProps)
        this.#props.onDrag(event, this.#props.index, this.#report({ x2Value }))
    }

    #handleBodyDragStart = () => {
        const { x1Value, x2Value, entry, target, stop } = this.#props
        this.#dragStart = { x1Value, x2Value, entry, target, stop }
    }

    /** Whole-plan move: one pixel delta applied to every level and both ends. */
    #handleBodyDrag = (event, moreProps) => {
        const { x1Value, x2Value, entry, target, stop } = this.#dragStart

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

        const moveX = value => getXValue(xScale, xAccessor, [xScale(value) - dx, 0], fullData)
        const moveY = value => yScale.invert(yScale(value) - dy)

        this.#props.onDrag(event, this.#props.index, {
            x1Value: moveX(x1Value),
            x2Value: moveX(x2Value),
            entry: moveY(entry),
            target: moveY(target),
            stop: moveY(stop),
        })
    }
}

define("chart-each-position", EachPosition)
