import { isNotDefined } from "../../core/utils/index.js"
import { getXValue } from "../../core/utils/ChartDataUtil.js"
import { ElementBase, define, defineProperties } from "../../core/element.js"
import { isHover, saveNodeType } from "../utils.js"
import { getNewXY } from "./EachTrendLine.js"

export const eachCalloutDefaults = {
    index: undefined,
    interactive: true,
    selected: false,
    anchor: undefined,
    at: undefined,
    text: "Callout",
    appearance: {
        strokeStyle: "#000000",
        strokeWidth: 1,
        bgFill: "#FFFFFF",
        bgStroke: "#000000",
        textFill: "#000000",
        fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
        fontSize: 12,
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
 * One callout: a text box, a leg from the box to the anchor, and a handle on
 * the anchor. Dragging the box moves where the words sit; dragging the anchor
 * moves what they point at — the two halves of "a note about THIS bar".
 */
export class EachCallout extends ElementBase {
    #props
    #hover = false
    #children = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, eachCalloutDefaults)
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
        const { anchor, at, text, interactive, appearance, hoverText, selected } = props
        const { enable: hoverTextEnabled, selectedText, text: unselectedText, ...restHoverText } = hoverText

        // connectedCallback chay truoc khi tool kip gan diem — chua du thi chua dung gi
        if (isNotDefined(anchor) || isNotDefined(at)) return

        const showHandles = selected || this.#hover

        if (this.#children === null) {
            this.#children = {
                leg: document.createElement("chart-interactive-straight-line"),
                box: document.createElement("chart-interactive-text"),
                tip: document.createElement("chart-clickable-circle"),
                hoverText: document.createElement("chart-hover-text"),
            }
            this.append(this.#children.leg, this.#children.box, this.#children.tip, this.#children.hoverText)
            this.nodes = [this.#children.box, this.#children.leg, this.#children.tip]
        }

        const { leg, box, tip, hoverText: hover } = this.#children

        Object.assign(leg, {
            selected: showHandles,
            type: "LINE",
            x1Value: anchor[0],
            y1Value: anchor[1],
            x2Value: at[0],
            y2Value: at[1],
            strokeStyle: appearance.strokeStyle,
            strokeWidth: showHandles ? appearance.strokeWidth + 1 : appearance.strokeWidth,
            interactiveCursorClass: "chart-move-cursor",
            onHover: interactive ? this.#handleHover : undefined,
            onUnHover: interactive ? this.#handleHover : undefined,
            onDragStart: this.#handleLegStart,
            onDrag: this.#handleLegDrag,
            onDragComplete: props.onDragComplete,
        })

        Object.assign(box, {
            selected: showHandles,
            position: at,
            text,
            bgFillStyle: appearance.bgFill,
            bgStroke: appearance.bgStroke,
            bgStrokeWidth: appearance.strokeWidth,
            textFill: appearance.textFill,
            fontFamily: appearance.fontFamily,
            fontSize: appearance.fontSize,
            interactiveCursorClass: "chart-move-cursor",
            onHover: interactive ? this.#handleHover : undefined,
            onUnHover: interactive ? this.#handleHover : undefined,
            onDragStart: () => {},
            onDrag: this.#handleBoxDrag,
            onDragComplete: props.onDragComplete,
        })

        Object.assign(tip, {
            show: showHandles,
            cx: anchor[0],
            cy: anchor[1],
            r: appearance.r,
            fillStyle: appearance.edgeFill,
            strokeStyle: appearance.edgeStroke,
            strokeWidth: appearance.edgeStrokeWidth,
            interactiveCursorClass: "chart-move-cursor",
            onDragStart: () => {},
            onDrag: this.#handleTipDrag,
            onDragComplete: props.onDragComplete,
        })

        Object.assign(hover, {
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

    #handleBoxDrag = (event, moreProps) => {
        this.#props.onDrag(event, this.#props.index, { anchor: this.#props.anchor, at: getNewXY(moreProps) })
    }

    #handleTipDrag = (event, moreProps) => {
        this.#props.onDrag(event, this.#props.index, { anchor: getNewXY(moreProps), at: this.#props.at })
    }

    #dragStart
    #handleLegStart = () => {
        const { anchor, at } = this.#props
        this.#dragStart = { anchor, at }
    }

    /** Kéo chân: cả neo lẫn hộp dời cùng một quãng pixel. */
    #handleLegDrag = (event, moreProps) => {
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
        this.#props.onDrag(event, this.#props.index, { anchor: move(this.#dragStart.anchor), at: move(this.#dragStart.at) })
    }
}

define("chart-each-callout", EachCallout)
