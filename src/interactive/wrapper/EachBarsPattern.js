import { isDefined } from "../../core/utils/index.js"
import { getXValue } from "../../core/utils/ChartDataUtil.js"
import { ElementBase, define, defineProperties } from "../../core/element.js"
import { isHover, saveNodeType } from "../utils.js"

export const eachBarsPatternDefaults = {
    index: undefined,
    interactive: true,
    selected: false,
    mode: "copy",
    from: undefined,
    to: undefined,
    at: undefined,
    hoverText: { enable: false },
    appearance: {
        upStyle: "rgba(106, 185, 117, 0.6)",
        downStyle: "rgba(224, 122, 122, 0.6)",
        edgeStroke: "#000000",
        edgeFill: "#FFFFFF",
        edgeStrokeWidth: 1,
        r: 5,
    },
    onDrag: () => {},
    onDragComplete: () => {},
}

/**
 * One bars-pattern ghost, with one grab point — the paste anchor. The source range
 * is what the ghost IS; only where it sits is negotiable, so body and handle both
 * drag the anchor and nothing else.
 */
export class EachBarsPattern extends ElementBase {
    #props
    #dragStart
    #hover = false
    #children = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, eachBarsPatternDefaults)
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
        const { mode, from, to, at, appearance, selected, hoverText } = props
        const { upStyle, downStyle, edgeStroke, edgeFill, edgeStrokeWidth, r } = appearance
        const { enable: hoverTextEnabled, ...restHoverText } = hoverText

        const showHandles = selected || this.#hover

        if (this.#children === null) {
            this.#children = {
                ghost: document.createElement("chart-interactive-bars-pattern"),
                edge: document.createElement("chart-clickable-circle"),
                hoverText: document.createElement("chart-hover-text"),
            }
            this.append(...Object.values(this.#children))
            this.nodes = [this.#children.ghost, this.#children.edge]
        }

        const { ghost, edge, hoverText: hoverNode } = this.#children

        Object.assign(ghost, {
            mode,
            selected: showHandles,
            from,
            to,
            at,
            upStyle,
            downStyle,
            interactiveCursorClass: "chart-move-cursor",
            onHover: props.interactive ? this.#handleHover : undefined,
            onUnHover: props.interactive ? this.#handleHover : undefined,
            onDragStart: this.#handleDragStart,
            onDrag: this.#handleAnchorDrag,
            onDragComplete: props.onDragComplete,
        })

        Object.assign(edge, {
            show: isDefined(at) && showHandles,
            cx: at?.[0],
            cy: at?.[1],
            r,
            fillStyle: edgeFill,
            strokeStyle: edgeStroke,
            strokeWidth: edgeStrokeWidth,
            interactiveCursorClass: "chart-move-cursor",
            onDragStart: this.#handleDragStart,
            onDrag: this.#handleAnchorDrag,
            onDragComplete: props.onDragComplete,
        })

        Object.assign(hoverNode, { ...restHoverText, show: hoverTextEnabled && this.#hover && !selected })
    }

    #handleHover = (event, moreProps) => {
        if (this.#hover === moreProps.hovering) return
        this.#hover = moreProps.hovering
        this.update()
    }

    #handleDragStart = () => {
        this.#dragStart = { at: this.#props.at }
    }

    #handleAnchorDrag = (event, moreProps) => {
        const {
            startPos,
            mouseXY,
            xAccessor,
            xScale,
            fullData,
            chartConfig: { yScale },
        } = moreProps

        const [atX, atY] = this.#dragStart.at
        const dx = startPos[0] - mouseXY[0]
        const dy = startPos[1] - mouseXY[1]
        const x = xScale(atX)
        const y = yScale(atY)

        this.#props.onDrag(event, this.#props.index, {
            at: [getXValue(xScale, xAccessor, [x - dx, y - dy], fullData), yScale.invert(y - dy)],
        })
    }
}

define("chart-each-bars-pattern", EachBarsPattern)
