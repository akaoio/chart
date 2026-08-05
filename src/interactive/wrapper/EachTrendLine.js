import { ascending } from "d3-array"
import { getXValue } from "../../core/utils/ChartDataUtil.js"
import { ElementBase, define, defineProperties } from "../../core/element.js"
import { isHover, saveNodeType } from "../utils.js"

/**
 * Where a dragged handle lands, in data terms.
 *
 * The y value is clamped to the pane's domain, so a handle dragged off the top of the
 * chart sticks to the top rather than flying to an unreachable price.
 */
export const getNewXY = moreProps => {
    const {
        xScale,
        chartConfig: { yScale },
        xAccessor,
        plotData,
        mouseXY,
    } = moreProps

    const x = getXValue(xScale, xAccessor, mouseXY, plotData)

    const [small, big] = yScale.domain().slice().sort(ascending)
    const y = yScale.invert(mouseXY[1])

    return [x, Math.min(Math.max(y, small), big)]
}

export const eachTrendLineDefaults = {
    index: undefined,
    type: "XLINE",
    selected: false,
    x1Value: undefined,
    y1Value: undefined,
    x2Value: undefined,
    y2Value: undefined,
    strokeStyle: "#000000",
    strokeWidth: 1,
    strokeDasharray: "Solid",
    edgeStroke: "#000000",
    edgeFill: "#FFFFFF",
    edgeStrokeWidth: 2,
    r: 5,
    hoverText: { enable: false },
    edgeInteractiveCursor: "chart-move-cursor",
    lineInteractiveCursor: "chart-move-cursor",
    onDrag: () => {},
    onDragComplete: () => {},
}

/**
 * One trendline, and the machinery that lets it be adjusted.
 *
 * Three draggable parts: the line itself moves the whole thing, and each end handle moves
 * one end. The handles only appear once the line is hovered or selected — a chart with a
 * dozen trendlines would be unusable with two dozen dots permanently on it.
 *
 * `anchor` records which *other* end is being held still during an end-drag, so that end
 * can be drawn in the line colour and read as fixed.
 */
export class EachTrendLine extends ElementBase {
    #props
    #dragStart
    #hover = false
    #anchor

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, eachTrendLineDefaults)
        this.isHover = isHover.bind(this)
        this.saveNodeType = saveNodeType.bind(this)
    }

    #children = null

    connectedCallback() {
        this.style.display = "none"
        this.#build()
    }

    /**
     * Update the child elements in place; create them only once.
     *
     * Tearing them down and rebuilding would be simpler, and wrong: hover and drag state
     * live *on* those elements, so replacing an element mid-gesture throws away the very
     * state the gesture depends on — the line would forget it was hovered the instant it
     * became hovered, and could then never be grabbed. React keeps instances across
     * re-renders; this does the same thing by hand.
     */
    #build() {
        const props = this.#props
        const { enable: hoverTextEnabled, selectedText, text: unselectedText, ...restHoverText } = props.hoverText

        const showHandles = props.selected || this.#hover

        if (this.#children === null) {
            this.#children = {
                line: document.createElement("chart-interactive-straight-line"),
                edge1: document.createElement("chart-clickable-circle"),
                edge2: document.createElement("chart-clickable-circle"),
                hoverText: document.createElement("chart-hover-text"),
            }

            this.append(
                this.#children.line,
                this.#children.edge1,
                this.#children.edge2,
                this.#children.hoverText,
            )

            this.nodes = [this.#children.line, this.#children.edge1, this.#children.edge2]
        }

        const { line, edge1, edge2, hoverText } = this.#children

        Object.assign(line, {
            selected: showHandles,
            x1Value: props.x1Value,
            y1Value: props.y1Value,
            x2Value: props.x2Value,
            y2Value: props.y2Value,
            type: props.type,
            strokeStyle: props.strokeStyle,
            strokeWidth: showHandles ? props.strokeWidth + 1 : props.strokeWidth,
            strokeDasharray: props.strokeDasharray,
            interactiveCursorClass: props.lineInteractiveCursor,
            onHover: this.#handleHover,
            onUnHover: this.#handleHover,
            onDragStart: this.#handleLineDragStart,
            onDrag: this.#handleLineDrag,
            onDragComplete: props.onDragComplete,
        })

        const dressEdge = (circle, which, cx, cy, onDragStart, onDrag) =>
            Object.assign(circle, {
                show: showHandles,
                cx,
                cy,
                r: props.r,
                fillStyle: props.edgeFill,
                strokeStyle: this.#anchor === which ? props.strokeStyle : props.edgeStroke,
                strokeWidth: props.edgeStrokeWidth,
                interactiveCursorClass: props.edgeInteractiveCursor,
                onDragStart,
                onDrag,
                onDragComplete: this.#handleDragComplete,
            })

        dressEdge(edge1, "edge1", props.x1Value, props.y1Value, this.#handleEdge1DragStart, this.#handleEdge1Drag)
        dressEdge(edge2, "edge2", props.x2Value, props.y2Value, this.#handleEdge2DragStart, this.#handleEdge2Drag)

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

    #handleEdge1DragStart = () => {
        this.#anchor = "edge2"
        this.update()
    }

    #handleEdge2DragStart = () => {
        this.#anchor = "edge1"
        this.update()
    }

    #handleEdge1Drag = (event, moreProps) => {
        const [x1Value, y1Value] = getNewXY(moreProps)
        this.#props.onDrag(event, this.#props.index, {
            x1Value,
            y1Value,
            x2Value: this.#props.x2Value,
            y2Value: this.#props.y2Value,
        })
    }

    #handleEdge2Drag = (event, moreProps) => {
        const [x2Value, y2Value] = getNewXY(moreProps)
        this.#props.onDrag(event, this.#props.index, {
            x1Value: this.#props.x1Value,
            y1Value: this.#props.y1Value,
            x2Value,
            y2Value,
        })
    }

    #handleDragComplete = (event, moreProps) => {
        this.#anchor = undefined
        this.update()
        this.#props.onDragComplete?.(event, moreProps)
    }

    #handleLineDragStart = () => {
        const { x1Value, y1Value, x2Value, y2Value } = this.#props
        this.#dragStart = { x1Value, y1Value, x2Value, y2Value }
    }

    /**
     * Moving the whole line: both ends shift by the same pixel delta, then convert back
     * to data. Working in pixels keeps the line's *shape* while it moves — converting
     * each end independently through a non-linear x scale would distort it.
     */
    #handleLineDrag = (event, moreProps) => {
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

define("chart-each-trend-line", EachTrendLine)
