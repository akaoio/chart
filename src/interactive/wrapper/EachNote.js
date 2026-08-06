import { isNotDefined } from "../../core/utils/index.js"
import { ElementBase, define, defineProperties } from "../../core/element.js"
import { isHover, saveNodeType } from "../utils.js"
import { getNewXY } from "./EachTrendLine.js"

export const eachNoteDefaults = {
    index: undefined,
    interactive: true,
    selected: false,
    at: undefined,
    text: undefined,
    kind: "note",
    appearance: {
        noteFill: "#FFF3B0",
        commentFill: "#FFFFFF",
        bgStroke: "#000000",
        strokeWidth: 1,
        textFill: "#000000",
        fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
        fontSize: 12,
    },
    hoverText: { enable: false },
    onDrag: () => {},
    onDragComplete: () => {},
}

/**
 * One note or comment: a text box riding an InteractiveText — note mang nền
 * giấy nhớ, comment mang nền phẳng; chữ là của người dùng, kéo là dời hộp.
 */
export class EachNote extends ElementBase {
    #props
    #hover = false
    #children = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, eachNoteDefaults)
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
        const { at, text, kind, interactive, appearance, hoverText, selected } = props
        const { enable: hoverTextEnabled, selectedText, text: unselectedText, ...restHoverText } = hoverText

        if (isNotDefined(at)) return

        const showHandles = selected || this.#hover

        if (this.#children === null) {
            this.#children = {
                box: document.createElement("chart-interactive-text"),
                hoverText: document.createElement("chart-hover-text"),
            }
            this.append(this.#children.box, this.#children.hoverText)
            this.nodes = [this.#children.box]
        }

        Object.assign(this.#children.box, {
            selected: showHandles,
            position: at,
            text: text ?? (kind === "comment" ? "Comment" : "Note"),
            bgFillStyle: kind === "comment" ? appearance.commentFill : appearance.noteFill,
            bgStroke: appearance.bgStroke,
            bgStrokeWidth: showHandles ? appearance.strokeWidth + 1 : appearance.strokeWidth,
            textFill: appearance.textFill,
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

define("chart-each-note", EachNote)
