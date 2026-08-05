import { getXValue } from "../../core/utils/ChartDataUtil.js"
import { ElementBase, define, defineProperties } from "../../core/element.js"
import { isHover, saveNodeType } from "../utils.js"

export const eachTextDefaults = {
    index: undefined,
    position: undefined,
    bgFill: undefined,
    bgStroke: undefined,
    bgStrokeWidth: 1,
    textFill: undefined,
    fontFamily: undefined,
    fontStyle: undefined,
    fontWeight: undefined,
    fontSize: undefined,
    text: undefined,
    selected: false,
    hoverText: { enable: true, bgHeight: "auto", bgWidth: "auto", text: "Click to select object" },
    onDrag: () => {},
    onDragComplete: () => {},
}

/** One label on the chart, draggable by its box. */
export class EachText extends ElementBase {
    #props
    #dragStart
    #hover = false
    #children = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, eachTextDefaults)
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
        const { position, bgFill, bgStroke, bgStrokeWidth, textFill, text, selected, hoverText } = props
        const { fontFamily, fontSize, fontStyle, fontWeight } = props

        const {
            enable: hoverTextEnabled,
            selectedText: hoverTextSelected,
            text: hoverTextUnselected,
            ...restHoverText
        } = hoverText

        if (this.#children === null) {
            this.#children = {
                text: document.createElement("chart-interactive-text"),
                hoverText: document.createElement("chart-hover-text"),
            }
            this.append(...Object.values(this.#children))
            this.nodes = [this.#children.text]
        }

        Object.assign(this.#children.text, {
            selected: selected || this.#hover,
            interactiveCursorClass: "chart-move-cursor",
            onHover: this.#handleHover,
            onUnHover: this.#handleHover,
            onDragStart: this.#handleDragStart,
            onDrag: this.#handleDrag,
            onDragComplete: props.onDragComplete,
            position,
            bgFillStyle: bgFill,
            // Không có viền riêng thì viền lấy màu chữ, để hộp không biến mất trên nền tối
            bgStroke: bgStroke || textFill,
            bgStrokeWidth,
            textFill,
            fontFamily,
            fontStyle,
            fontWeight,
            fontSize,
            text,
        })

        Object.assign(this.#children.hoverText, {
            ...restHoverText,
            show: hoverTextEnabled && this.#hover,
            text: selected ? hoverTextSelected : hoverTextUnselected,
        })
    }

    #handleHover = (event, moreProps) => {
        if (this.#hover === moreProps.hovering) return
        this.#hover = moreProps.hovering
        this.update()
    }

    #handleDragStart = (event, moreProps) => {
        const { position } = this.#props
        const {
            mouseXY: [mouseX, mouseY],
            chartConfig: { yScale },
            xScale,
        } = moreProps

        const [textCX, textCY] = position

        // Nhớ chỗ cầm so với tâm chữ, để chữ không nhảy về dưới con trỏ khi bắt đầu kéo
        this.#dragStart = { position, dx: mouseX - xScale(textCX), dy: mouseY - yScale(textCY) }
    }

    #handleDrag = (event, moreProps) => {
        const {
            mouseXY,
            mouseXY: [, mouseY],
            chartConfig: { yScale },
            xAccessor,
            plotData,
            xScale,
        } = moreProps

        const { dx, dy } = this.#dragStart

        const xValue = xScale.invert(xScale(getXValue(xScale, xAccessor, mouseXY, plotData)) - dx)

        this.#props.onDrag(event, this.#props.index, [xValue, yScale.invert(mouseY - dy)])
    }
}

define("chart-each-text", EachText)
