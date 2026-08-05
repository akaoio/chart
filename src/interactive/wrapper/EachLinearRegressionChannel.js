import { getCurrentItem } from "../../core/utils/ChartDataUtil.js"
import { ElementBase, define, defineProperties } from "../../core/element.js"
import { isHover, saveNodeType } from "../utils.js"
import { edge1Provider, edge2Provider } from "../components/LinearRegressionChannelWithArea.js"

/** Where an end handle lands: snapped to a data point, since the fit needs whole bars. */
export const getNewXY = (moreProps, snapTo) => {
    const { xScale, xAccessor, plotData, mouseXY } = moreProps
    const currentItem = getCurrentItem(xScale, xAccessor, mouseXY, plotData)

    return [xAccessor(currentItem), snapTo(currentItem)]
}

export const eachLinearRegressionChannelDefaults = {
    index: undefined,
    interactive: true,
    selected: false,
    x1Value: undefined,
    x2Value: undefined,
    snapTo: datum => datum.close,
    edgeInteractiveCursor: "chart-move-cursor",
    appearance: {
        stroke: "#000000",
        strokeWidth: 1,
        fill: "rgba(138, 175, 226, 0.7)",
        edgeStrokeWidth: 2,
        edgeStroke: "#000000",
        edgeFill: "#FFFFFF",
        r: 5,
    },
    hoverText: { enable: true, bgHeight: 18, bgWidth: 175, text: "Click and drag the edge circles" },
    onDrag: () => {},
    onDragComplete: () => {},
}

/**
 * One regression channel, adjustable only by its two ends.
 *
 * There is no "move the whole thing" here, unlike a trendline: the channel is derived
 * from the data inside its range, so sliding it sideways would not translate the shape —
 * it would recompute an entirely different one. Only the range can be changed.
 */
export class EachLinearRegressionChannel extends ElementBase {
    #props
    #hover = false
    #children = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, eachLinearRegressionChannelDefaults)
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
        const { x1Value, x2Value, appearance, hoverText, selected, interactive } = props
        const { stroke, strokeWidth, fill, r, edgeStrokeWidth, edgeFill, edgeStroke } = appearance
        const { enable: hoverTextEnabled, selectedText, text: unselectedText, ...restHoverText } = hoverText

        const showHandles = selected || this.#hover

        if (this.#children === null) {
            this.#children = {
                area: document.createElement("chart-linear-regression-channel"),
                edge1: document.createElement("chart-clickable-circle"),
                edge2: document.createElement("chart-clickable-circle"),
                hoverText: document.createElement("chart-hover-text"),
            }

            this.append(...Object.values(this.#children))
            this.nodes = [this.#children.area, this.#children.edge1, this.#children.edge2]
        }

        const { area, edge1, edge2, hoverText: hoverNode } = this.#children

        Object.assign(area, {
            selected: showHandles,
            x1Value,
            x2Value,
            fillStyle: fill,
            strokeStyle: stroke,
            strokeWidth: showHandles ? strokeWidth + 1 : strokeWidth,
            onHover: interactive ? this.#handleHover : undefined,
            onUnHover: interactive ? this.#handleHover : undefined,
        })

        const dressEdge = (circle, provider, dragHandler) =>
            Object.assign(circle, {
                show: showHandles,
                xyProvider: provider({ x1Value, x2Value, type: "SD" }),
                r,
                fillStyle: edgeFill,
                strokeStyle: edgeStroke,
                strokeWidth: edgeStrokeWidth,
                interactiveCursorClass: props.edgeInteractiveCursor,
                onDrag: dragHandler,
                onDragComplete: props.onDragComplete,
            })

        dressEdge(edge1, edge1Provider, this.#handleEdge1Drag)
        dressEdge(edge2, edge2Provider, this.#handleEdge2Drag)

        Object.assign(hoverNode, {
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

    #handleEdge1Drag = (event, moreProps) => {
        const [x1Value] = getNewXY(moreProps, this.#props.snapTo)
        this.#props.onDrag(event, this.#props.index, { x1Value, x2Value: this.#props.x2Value })
    }

    #handleEdge2Drag = (event, moreProps) => {
        const [x2Value] = getNewXY(moreProps, this.#props.snapTo)
        this.#props.onDrag(event, this.#props.index, { x1Value: this.#props.x1Value, x2Value })
    }
}

define("chart-each-linear-regression-channel", EachLinearRegressionChannel)
