import { isNotDefined } from "../../core/utils/index.js"
import { getXValue } from "../../core/utils/ChartDataUtil.js"
import { ElementBase, define, defineProperties } from "../../core/element.js"
import { isHover, saveNodeType } from "../utils.js"
import { getNewXY } from "./EachTrendLine.js"

export const eachPriceNoteDefaults = {
    index: undefined,
    interactive: true,
    selected: false,
    at: undefined,
    label: undefined,
    text: undefined,
    yDisplayFormat: value => value.toFixed(2),
    appearance: {
        strokeStyle: "#000000",
        strokeWidth: 1,
        bgFill: "#FFFFFF",
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
 * One price note: neo đầu ghim GIÁ, neo thứ hai đặt nhãn — đường kẻ nối hai
 * neo, nhãn đọc giá của neo đầu (kèm lời ghi nếu có), suy từ dữ liệu mỗi
 * lần vẽ nên kéo neo giá là chữ đổi theo. Đúng cách Price Note của
 * TradingView: hai neo, đường nối, nhãn giá.
 */
export class EachPriceNote extends ElementBase {
    #props
    #dragStart
    #hover = false
    #children = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, eachPriceNoteDefaults)
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
        const { at, label, text, yDisplayFormat, interactive, appearance, hoverText, selected } = props
        const { enable: hoverTextEnabled, selectedText, text: unselectedText, ...restHoverText } = hoverText

        if (isNotDefined(at) || isNotDefined(label)) return

        const showHandles = selected || this.#hover

        if (this.#children === null) {
            this.#children = {
                line: document.createElement("chart-interactive-straight-line"),
                box: document.createElement("chart-interactive-text"),
                anchor: document.createElement("chart-clickable-circle"),
                hoverText: document.createElement("chart-hover-text"),
            }
            this.append(this.#children.line, this.#children.box, this.#children.anchor, this.#children.hoverText)
            this.nodes = [this.#children.line, this.#children.box, this.#children.anchor]
        }

        Object.assign(this.#children.line, {
            selected: showHandles,
            type: "LINE",
            x1Value: at[0],
            y1Value: at[1],
            x2Value: label[0],
            y2Value: label[1],
            strokeStyle: appearance.strokeStyle,
            strokeWidth: showHandles ? appearance.strokeWidth + 1 : appearance.strokeWidth,
            interactiveCursorClass: "chart-move-cursor",
            onHover: interactive ? this.#handleHover : undefined,
            onUnHover: interactive ? this.#handleHover : undefined,
            onDragStart: this.#handleBodyStart,
            onDrag: this.#handleBodyDrag,
            onDragComplete: props.onDragComplete,
        })

        // Nhãn đọc giá của neo đầu — suy mỗi lần build nên không bao giờ cũ
        const price = yDisplayFormat(at[1])
        Object.assign(this.#children.box, {
            selected: showHandles,
            position: label,
            text: text ? `${price} · ${text}` : price,
            bgFillStyle: appearance.bgFill,
            bgStroke: appearance.strokeStyle,
            bgStrokeWidth: appearance.strokeWidth,
            textFill: appearance.textFill,
            fontFamily: appearance.fontFamily,
            fontSize: appearance.fontSize,
            interactiveCursorClass: "chart-move-cursor",
            onDragStart: () => {},
            onDrag: this.#handleLabelDrag,
            onDragComplete: props.onDragComplete,
        })

        Object.assign(this.#children.anchor, {
            show: showHandles,
            cx: at[0],
            cy: at[1],
            r: appearance.r,
            fillStyle: appearance.edgeFill,
            strokeStyle: appearance.edgeStroke,
            strokeWidth: appearance.edgeStrokeWidth,
            interactiveCursorClass: "chart-move-cursor",
            onDragStart: () => {},
            onDrag: this.#handleAnchorDrag,
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

    #handleAnchorDrag = (event, moreProps) => {
        this.#props.onDrag(event, this.#props.index, { at: getNewXY(moreProps), label: this.#props.label })
    }

    #handleLabelDrag = (event, moreProps) => {
        this.#props.onDrag(event, this.#props.index, { at: this.#props.at, label: getNewXY(moreProps) })
    }

    #handleBodyStart = () => {
        const { at, label } = this.#props
        this.#dragStart = { at, label }
    }

    /** Kéo thân: cả neo giá lẫn nhãn dời cùng quãng pixel. */
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
        this.#props.onDrag(event, this.#props.index, { at: move(this.#dragStart.at), label: move(this.#dragStart.label) })
    }
}

define("chart-each-price-note", EachPriceNote)
