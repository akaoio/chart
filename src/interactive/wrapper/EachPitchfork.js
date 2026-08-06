import { getXValue } from "../../core/utils/ChartDataUtil.js"
import { ElementBase, define, defineProperties } from "../../core/element.js"
import { isHover, saveNodeType } from "../utils.js"
import { getNewXY } from "./EachTrendLine.js"

export const eachPitchforkDefaults = {
    index: undefined,
    variant: "standard",
    selected: false,
    p1: undefined,
    p2: undefined,
    p3: undefined,
    strokeStyle: "#000000",
    strokeWidth: 1,
    medianStrokeStyle: undefined,
    fillStyle: "rgba(138, 175, 226, 0.2)",
    edgeStroke: "#000000",
    edgeFill: "#FFFFFF",
    edgeStrokeWidth: 2,
    r: 5,
    hoverText: { enable: false },
    edgeInteractiveCursor: "chart-move-cursor",
    bodyInteractiveCursor: "chart-move-cursor",
    onDrag: () => {},
    onDragComplete: () => {},
}

/**
 * One pitchfork, its three point handles, and whole-body drag.
 *
 * Each handle moves its own point and the fork re-derives; the body moves all three by
 * the same pixel delta — the shape must not distort while it moves, so the arithmetic
 * is pixels-then-convert, like every other wrapper.
 */
export class EachPitchfork extends ElementBase {
    #props
    #dragStart
    #hover = false

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, eachPitchforkDefaults)
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

        if (this.#children === null) {
            this.#children = {
                body: document.createElement("chart-interactive-pitchfork"),
                handle1: document.createElement("chart-clickable-circle"),
                handle2: document.createElement("chart-clickable-circle"),
                handle3: document.createElement("chart-clickable-circle"),
                hoverText: document.createElement("chart-hover-text"),
            }

            this.append(
                this.#children.body,
                this.#children.handle1,
                this.#children.handle2,
                this.#children.handle3,
                this.#children.hoverText,
            )

            this.nodes = [this.#children.body, this.#children.handle1, this.#children.handle2, this.#children.handle3]
        }

        const { body, handle1, handle2, handle3, hoverText } = this.#children

        Object.assign(body, {
            selected: showHandles,
            variant: props.variant,
            p1: props.p1,
            p2: props.p2,
            p3: props.p3,
            strokeStyle: props.strokeStyle,
            strokeWidth: showHandles ? props.strokeWidth + 1 : props.strokeWidth,
            medianStrokeStyle: props.medianStrokeStyle,
            fillStyle: props.fillStyle,
            interactiveCursorClass: props.bodyInteractiveCursor,
            onHover: this.#handleHover,
            onUnHover: this.#handleHover,
            onDragStart: this.#handleBodyDragStart,
            onDrag: this.#handleBodyDrag,
            onDragComplete: props.onDragComplete,
        })

        const dress = (circle, point, onDrag) =>
            Object.assign(circle, {
                show: showHandles,
                cx: point?.[0],
                cy: point?.[1],
                r: props.r,
                fillStyle: props.edgeFill,
                strokeStyle: props.edgeStroke,
                strokeWidth: props.edgeStrokeWidth,
                interactiveCursorClass: props.edgeInteractiveCursor,
                onDragStart: () => {},
                onDrag,
                onDragComplete: props.onDragComplete,
            })

        dress(handle1, props.p1, this.#handlePointDrag("p1"))
        dress(handle2, props.p2, this.#handlePointDrag("p2"))
        dress(handle3, props.p3, this.#handlePointDrag("p3"))

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

    #handlePointDrag = which => (event, moreProps) => {
        const { p1, p2, p3 } = this.#props
        const moved = getNewXY(moreProps)
        this.#props.onDrag(event, this.#props.index, { p1, p2, p3, [which]: moved })
    }

    #handleBodyDragStart = () => {
        const { p1, p2, p3 } = this.#props
        this.#dragStart = { p1, p2, p3 }
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

        this.#props.onDrag(event, this.#props.index, {
            p1: move(this.#dragStart.p1),
            p2: move(this.#dragStart.p2),
            p3: move(this.#dragStart.p3),
        })
    }
}

define("chart-each-pitchfork", EachPitchfork)
