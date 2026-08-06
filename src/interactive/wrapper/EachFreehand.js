import { isNotDefined } from "../../core/utils/index.js"
import { getXValue } from "../../core/utils/ChartDataUtil.js"
import { ElementBase, define, defineProperties } from "../../core/element.js"
import { isHover, saveNodeType } from "../utils.js"

export const eachFreehandDefaults = {
    index: undefined,
    interactive: true,
    selected: false,
    points: undefined,
    mode: "brush",
    appearance: {
        strokeStyle: "#000000",
        strokeWidth: 2,
        highlighterWidth: 14,
        highlighterOpacity: 0.35,
    },
    hoverText: { enable: false },
    onDrag: () => {},
    onDragComplete: () => {},
}

/**
 * One freehand stroke: chỉ có thân, không tay cầm đỉnh — một nét vẽ tay có
 * hàng trăm điểm, cho kéo từng đỉnh là vô nghĩa (TradingView cũng thế).
 * Kéo thân là dời cả nét giữ nguyên dáng.
 */
export class EachFreehand extends ElementBase {
    #props
    #dragStart
    #hover = false
    #children = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, eachFreehandDefaults)
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
        const { points, mode, interactive, appearance, hoverText, selected } = props
        const { enable: hoverTextEnabled, selectedText, text: unselectedText, ...restHoverText } = hoverText

        if (isNotDefined(points) || points.length < 2) return

        const showSelected = selected || this.#hover

        if (this.#children === null) {
            this.#children = {
                body: document.createElement("chart-interactive-freehand"),
                hoverText: document.createElement("chart-hover-text"),
            }
            this.append(this.#children.body, this.#children.hoverText)
            this.nodes = [this.#children.body]
        }

        Object.assign(this.#children.body, {
            selected: showSelected,
            points,
            mode,
            strokeStyle: appearance.strokeStyle,
            strokeWidth: showSelected ? appearance.strokeWidth + 1 : appearance.strokeWidth,
            highlighterWidth: appearance.highlighterWidth,
            highlighterOpacity: appearance.highlighterOpacity,
            interactiveCursorClass: "chart-move-cursor",
            onHover: interactive ? this.#handleHover : undefined,
            onUnHover: interactive ? this.#handleHover : undefined,
            onDragStart: this.#handleBodyStart,
            onDrag: this.#handleBodyDrag,
            onDragComplete: props.onDragComplete,
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

    #handleBodyStart = () => {
        this.#dragStart = { points: this.#props.points }
    }

    /** Kéo thân: mọi điểm dời cùng một quãng pixel — nét giữ nguyên dáng. */
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
        const points = this.#dragStart.points.map(([xValue, yValue]) => [
            getXValue(xScale, xAccessor, [xScale(xValue) - dx, yScale(yValue) - dy], fullData),
            yScale.invert(yScale(yValue) - dy),
        ])
        this.#props.onDrag(event, this.#props.index, { points })
    }
}

define("chart-each-freehand", EachFreehand)
