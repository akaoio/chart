import { ElementBase, define, defineProperties } from "../../core/element.js"
import { isHover, saveNodeType } from "../utils.js"

export const eachInteractiveYCoordinateDefaults = {
    index: undefined,
    draggable: false,
    selected: false,
    strokeWidth: 1,
    yValue: undefined,
    bgFill: undefined,
    stroke: undefined,
    strokeDasharray: undefined,
    textFill: undefined,
    fontFamily: undefined,
    fontStyle: undefined,
    fontWeight: undefined,
    fontSize: undefined,
    text: undefined,
    edge: undefined,
    textBox: undefined,
    onDrag: () => {},
    onDragComplete: () => {},
    onDelete: () => {},
}

/**
 * One price alert: a line across the pane, a label at the left, and a ✕ to remove it.
 *
 * The ✕ sits inside the label, so hovering it also hovers the label. Selection is
 * suppressed while the ✕ is hovered — otherwise clicking to delete would first select.
 */
export class EachInteractiveYCoordinate extends ElementBase {
    #props
    #dragStart
    #hover = false
    #closeIconHover = false
    #children = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, eachInteractiveYCoordinateDefaults)
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
        const { yValue, bgFill, textFill, text, selected, stroke, strokeDasharray, strokeWidth } = props
        const { fontFamily, fontSize, fontStyle, fontWeight, edge, textBox, draggable } = props

        if (this.#children === null) {
            this.#children = {
                priceCoordinate: document.createElement("chart-interactive-y-coordinate"),
                closeIcon: document.createElement("chart-clickable-shape"),
            }
            this.append(...Object.values(this.#children))
            this.nodes = [this.#children.priceCoordinate]
        }

        const { priceCoordinate, closeIcon } = this.#children

        Object.assign(priceCoordinate, {
            selected: selected && !this.#closeIconHover,
            hovering: this.#hover || this.#closeIconHover,
            interactiveCursorClass: "chart-move-cursor",
            onHover: this.#handleHover,
            onUnHover: this.#handleHover,
            // Không kéo được thì cũng không gắn tay kéo — bản gốc bỏ hẳn ba prop này
            onDragStart: draggable ? this.#handleDragStart : undefined,
            onDrag: draggable ? this.#handleDrag : undefined,
            onDragComplete: draggable ? props.onDragComplete : undefined,
            yValue,
            bgFillStyle: bgFill,
            textFill,
            fontFamily,
            fontStyle,
            fontWeight,
            fontSize,
            strokeStyle: stroke,
            strokeDasharray,
            strokeWidth,
            text,
            textBox,
            edge,
        })

        Object.assign(closeIcon, {
            show: true,
            hovering: this.#closeIconHover,
            text,
            yValue,
            fontFamily,
            fontStyle,
            fontWeight,
            fontSize,
            textBox,
            strokeStyle: stroke,
            onHover: this.#handleCloseIconHover,
            onUnHover: this.#handleCloseIconHover,
            onClick: this.#handleDelete,
        })
    }

    #handleCloseIconHover = (event, moreProps) => {
        if (this.#closeIconHover === moreProps.hovering) return
        this.#closeIconHover = moreProps.hovering
        this.update()
    }

    #handleHover = (event, moreProps) => {
        if (this.#hover === moreProps.hovering) return
        this.#hover = moreProps.hovering
        // Rời khỏi nhãn thì cũng rời khỏi dấu ✕ nằm trong nhãn
        if (!moreProps.hovering) this.#closeIconHover = false
        this.update()
    }

    #handleDelete = (event, moreProps) => {
        this.#props.onDelete(event, this.#props.index, moreProps)
    }

    #handleDragStart = (event, moreProps) => {
        const {
            mouseXY: [, mouseY],
            chartConfig: { yScale },
        } = moreProps

        this.#dragStart = { yValue: this.#props.yValue, dy: mouseY - yScale(this.#props.yValue) }
    }

    #handleDrag = (event, moreProps) => {
        const {
            mouseXY: [, mouseY],
            chartConfig: { yScale },
        } = moreProps

        this.#props.onDrag(event, this.#props.index, yScale.invert(mouseY - this.#dragStart.dy))
    }
}

define("chart-each-interactive-y-coordinate", EachInteractiveYCoordinate)
