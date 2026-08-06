import { isNotDefined } from "../../core/utils/index.js"
import { ElementBase, define, defineProperties } from "../../core/element.js"
import { isHover, saveNodeType } from "../utils.js"
import { getNewXY } from "./EachTrendLine.js"

export const eachArrowMarkDefaults = {
    index: undefined,
    interactive: true,
    selected: false,
    at: undefined,
    mode: "up",
    appearance: {
        upFill: "#26A69A",
        downFill: "#EF5350",
        bgFill: "rgba(0, 0, 0, 0)",
        fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
        fontSize: 18,
    },
    hoverText: { enable: false },
    onDrag: () => {},
    onDragComplete: () => {},
}

/** One arrow mark: a ▲ or ▼ glyph riding an InteractiveText box — draggable like any label. */
export class EachArrowMark extends ElementBase {
    #props
    #hover = false
    #children = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, eachArrowMarkDefaults)
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
        const { at, mode, interactive, appearance, hoverText, selected } = props
        const { enable: hoverTextEnabled, selectedText, text: unselectedText, ...restHoverText } = hoverText

        if (isNotDefined(at)) return

        const showHandles = selected || this.#hover

        if (this.#children === null) {
            this.#children = {
                glyph: document.createElement("chart-interactive-text"),
                hoverText: document.createElement("chart-hover-text"),
            }
            this.append(this.#children.glyph, this.#children.hoverText)
            this.nodes = [this.#children.glyph]
        }

        Object.assign(this.#children.glyph, {
            selected: showHandles,
            position: at,
            text: mode === "down" ? "▼" : "▲",
            bgFillStyle: appearance.bgFill,
            bgStroke: appearance.bgFill,
            bgStrokeWidth: 0.001,
            textFill: mode === "down" ? appearance.downFill : appearance.upFill,
            fontFamily: appearance.fontFamily,
            fontSize: appearance.fontSize,
            interactiveCursorClass: "chart-move-cursor",
            onHover: interactive ? this.#handleHover : undefined,
            onUnHover: interactive ? this.#handleHover : undefined,
            onDragStart: () => {},
            onDrag: this.#handleDrag,
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

    #handleDrag = (event, moreProps) => {
        this.#props.onDrag(event, this.#props.index, { at: getNewXY(moreProps) })
    }
}

define("chart-each-arrow-mark", EachArrowMark)
