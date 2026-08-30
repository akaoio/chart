import { isNotDefined } from "../../core/utils/index.js"
import { ElementBase, define, defineProperties } from "../../core/element.js"
import { isHover, saveNodeType } from "../utils.js"
import { getNewXY } from "./EachTrendLine.js"

export const eachStickerDefaults = {
    index: undefined,
    interactive: true,
    selected: false,
    at: undefined,
    src: undefined,
    size: 32,
    opacity: 1,
    appearance: {
        strokeStyle: "#2962FF",
        strokeWidth: 1,
        edgeStroke: "#2962FF",
        edgeFill: "#FFFFFF",
        edgeStrokeWidth: 1,
        r: 5,
    },
    hoverText: { enable: false },
    onDrag: () => {},
    onDragComplete: () => {},
}

/**
 * One placed sticker: the stamp and its single anchor handle.
 *
 * MỘT tay cầm, và con số ấy là giao ước giữa hai kho: cổng `check:drawn-icons`
 * bên akao đếm `createElement("chart-clickable-circle")` ngay trong wrapper để
 * biết icon phải vẽ mấy vành. Nên lời gọi ấy nằm thẳng ở thân hàm, đúng một
 * lần, không trong nhánh điều kiện nào — `EachImage` có hai vì hộp ảnh co giãn
 * giữa hai góc; con dấu không co giãn nên nó chỉ cần một.
 */
export class EachSticker extends ElementBase {
    #props
    #hover = false
    #children = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, eachStickerDefaults)
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
        const { at, src, size, opacity, interactive, hoverText, selected } = props
        const appearance = { ...eachStickerDefaults.appearance, ...props.appearance }
        const { enable: hoverTextEnabled, selectedText, text: unselectedText, ...restHoverText } = hoverText

        if (isNotDefined(at)) return

        const showHandles = selected || this.#hover

        if (this.#children === null) {
            this.#children = {
                body: document.createElement("chart-interactive-sticker"),
                anchor: document.createElement("chart-clickable-circle"),
                hoverText: document.createElement("chart-hover-text"),
            }
            this.append(this.#children.body, this.#children.anchor, this.#children.hoverText)
            this.nodes = [this.#children.body, this.#children.anchor]
        }

        Object.assign(this.#children.body, {
            selected: showHandles,
            xValue: at[0],
            yValue: at[1],
            src,
            size,
            opacity,
            strokeStyle: appearance.strokeStyle,
            strokeWidth: appearance.strokeWidth,
            interactiveCursorClass: "chart-move-cursor",
            onHover: interactive ? this.#handleHover : undefined,
            onUnHover: interactive ? this.#handleHover : undefined,
            onDragStart: () => {},
            onDrag: this.#handleDrag,
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

    /** Kéo thân hay kéo vành đều là dời cái neo — con dấu không có gì khác để đổi. */
    #handleDrag = (event, moreProps) => {
        this.#props.onDrag(event, this.#props.index, { at: getNewXY(moreProps) })
    }
}

define("chart-each-sticker", EachSticker)
