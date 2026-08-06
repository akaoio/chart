import { isNotDefined } from "../../core/utils/index.js"
import { ElementBase, define, defineProperties } from "../../core/element.js"
import { isHover, saveNodeType } from "../utils.js"

export const eachAnchoredBoxDefaults = {
    index: undefined,
    interactive: true,
    selected: false,
    at: undefined,
    lines: undefined,
    cells: undefined,
    appearance: {
        bgFill: "#FFFFFF",
        bgStroke: "#000000",
        strokeWidth: 1,
        fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
        fontSize: 12,
        fontFill: "#000000",
        padding: 8,
    },
    hoverText: { enable: false },
    onDrag: () => {},
    onDragComplete: () => {},
}

/**
 * One screen-anchored box: kéo là dời theo TỈ LỆ pane — thứ duy nhất một
 * vật neo màn hình cần nhớ. Không có toạ độ dữ liệu nào ở đây cả.
 */
export class EachAnchoredBox extends ElementBase {
    #props
    #dragStart
    #hover = false
    #children = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, eachAnchoredBoxDefaults)
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
        const { at, lines, cells, interactive, appearance, hoverText, selected } = props
        const { enable: hoverTextEnabled, selectedText, text: unselectedText, ...restHoverText } = hoverText

        if (isNotDefined(at)) return

        const showSelected = selected || this.#hover

        if (this.#children === null) {
            this.#children = {
                body: document.createElement("chart-interactive-anchored-box"),
                hoverText: document.createElement("chart-hover-text"),
            }
            this.append(this.#children.body, this.#children.hoverText)
            this.nodes = [this.#children.body]
        }

        Object.assign(this.#children.body, {
            selected: showSelected,
            at,
            lines,
            cells,
            bgFill: appearance.bgFill,
            bgStroke: appearance.bgStroke,
            strokeWidth: showSelected ? appearance.strokeWidth + 1 : appearance.strokeWidth,
            fontFamily: appearance.fontFamily,
            fontSize: appearance.fontSize,
            fontFill: appearance.fontFill,
            padding: appearance.padding,
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
        this.#dragStart = { at: this.#props.at }
    }

    /** Kéo trong pixel, nhớ trong tỉ lệ — resize pane thì hộp giữ chỗ tương đối. */
    #handleBodyDrag = (event, moreProps) => {
        const {
            chartConfig: { width, height },
            startPos,
            mouseXY,
        } = moreProps
        const [fx, fy] = this.#dragStart.at
        this.#props.onDrag(event, this.#props.index, {
            at: [fx + (mouseXY[0] - startPos[0]) / width, fy + (mouseXY[1] - startPos[1]) / height],
        })
    }
}

define("chart-each-anchored-box", EachAnchoredBox)
