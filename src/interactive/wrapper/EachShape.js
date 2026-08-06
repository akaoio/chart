import { getXValue } from "../../core/utils/ChartDataUtil.js"
import { ElementBase, define, defineProperties } from "../../core/element.js"
import { isHover, saveNodeType } from "../utils.js"
import { getNewXY } from "./EachTrendLine.js"

export const eachShapeDefaults = {
    index: undefined,
    shape: "rectangle",
    selected: false,
    x1Value: undefined,
    y1Value: undefined,
    x2Value: undefined,
    y2Value: undefined,
    strokeStyle: "#000000",
    strokeWidth: 1,
    strokeDasharray: "Solid",
    fillStyle: "rgba(138, 175, 226, 0.35)",
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
 * One drawn shape, its two corner handles, and whole-body drag.
 *
 * The two handles are the shape's defining corners — dragging one reshapes, dragging
 * the body moves both corners by the same pixel delta and converts back to data, the
 * same arithmetic as `EachTrendLine` and for the same reason: a non-linear x scale must
 * not distort the shape while it moves.
 */
export class EachShape extends ElementBase {
    #props
    #dragStart
    #hover = false

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, eachShapeDefaults)
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
                body: document.createElement("chart-interactive-shape"),
                corner1: document.createElement("chart-clickable-circle"),
                corner2: document.createElement("chart-clickable-circle"),
                hoverText: document.createElement("chart-hover-text"),
            }

            this.append(this.#children.body, this.#children.corner1, this.#children.corner2, this.#children.hoverText)

            this.nodes = [this.#children.body, this.#children.corner1, this.#children.corner2]
        }

        const { body, corner1, corner2, hoverText } = this.#children

        Object.assign(body, {
            selected: showHandles,
            shape: props.shape,
            x1Value: props.x1Value,
            y1Value: props.y1Value,
            x2Value: props.x2Value,
            y2Value: props.y2Value,
            strokeStyle: props.strokeStyle,
            strokeWidth: showHandles ? props.strokeWidth + 1 : props.strokeWidth,
            strokeDasharray: props.strokeDasharray,
            fillStyle: props.fillStyle,
            interactiveCursorClass: props.bodyInteractiveCursor,
            onHover: this.#handleHover,
            onUnHover: this.#handleHover,
            onDragStart: this.#handleBodyDragStart,
            onDrag: this.#handleBodyDrag,
            onDragComplete: props.onDragComplete,
        })

        const dressCorner = (circle, cx, cy, onDrag) =>
            Object.assign(circle, {
                show: showHandles,
                cx,
                cy,
                r: props.r,
                fillStyle: props.edgeFill,
                strokeStyle: props.edgeStroke,
                strokeWidth: props.edgeStrokeWidth,
                interactiveCursorClass: props.edgeInteractiveCursor,
                onDragStart: () => {},
                onDrag,
                onDragComplete: props.onDragComplete,
            })

        dressCorner(corner1, props.x1Value, props.y1Value, this.#handleCorner1Drag)
        dressCorner(corner2, props.x2Value, props.y2Value, this.#handleCorner2Drag)

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

    #handleCorner1Drag = (event, moreProps) => {
        const [x1Value, y1Value] = getNewXY(moreProps)
        this.#props.onDrag(event, this.#props.index, {
            x1Value,
            y1Value,
            x2Value: this.#props.x2Value,
            y2Value: this.#props.y2Value,
        })
    }

    #handleCorner2Drag = (event, moreProps) => {
        const [x2Value, y2Value] = getNewXY(moreProps)
        this.#props.onDrag(event, this.#props.index, {
            x1Value: this.#props.x1Value,
            y1Value: this.#props.y1Value,
            x2Value,
            y2Value,
        })
    }

    #handleBodyDragStart = () => {
        const { x1Value, y1Value, x2Value, y2Value } = this.#props
        this.#dragStart = { x1Value, y1Value, x2Value, y2Value }
    }

    #handleBodyDrag = (event, moreProps) => {
        const { x1Value, y1Value, x2Value, y2Value } = this.#dragStart

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
            x1Value: getXValue(xScale, xAccessor, [x1 - dx, y1 - dy], fullData),
            y1Value: yScale.invert(y1 - dy),
            x2Value: getXValue(xScale, xAccessor, [x2 - dx, y2 - dy], fullData),
            y2Value: yScale.invert(y2 - dy),
        })
    }
}

define("chart-each-shape", EachShape)
