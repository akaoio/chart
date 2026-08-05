import { isDefined } from "../core/utils/index.js"
import { ElementBase, define, defineProperties, batched } from "../core/element.js"
import { getValueFromOverride, isHoverForInteractiveType, saveNodeType, terminate, toolChartId } from "./utils.js"

export const interactiveTextToolDefaults = {
    enabled: true,
    textList: [],
    onChoosePosition: undefined,
    onDragComplete: undefined,
    onSelect: undefined,
    defaultText: {
        bgFill: "#D3D3D3",
        bgOpacity: 1,
        bgStrokeWidth: 1,
        textFill: "#F10040",
        fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
        fontSize: 12,
        fontStyle: "normal",
        fontWeight: "normal",
        text: "Lorem ipsum...",
    },
    hoverText: {
        enable: true,
        bgHeight: "auto",
        bgWidth: "auto",
        text: "Click to select object",
        selectedText: "",
    },
}

/**
 * Labels on the chart: `<chart-interactive-text-tool>`.
 *
 * The odd one out among the drawing tools — one click and the label exists. There is
 * nothing to rubber-band, so there is no in-progress shape and no mouse indicator either.
 */
export class InteractiveText extends ElementBase {
    #props
    #override = null

    #wrappers = []
    #listener = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, interactiveTextToolDefaults)

        this.terminate = terminate.bind(this)
        this.saveNodeType = saveNodeType.bind(this)
        this.getSelectionState = isHoverForInteractiveType("textList").bind(this)
    }

    /** Pane nào chứa công cụ này — thứ `chart-drawing-object-selector` cần khi đăng ký. */
    get chartId() {
        return toolChartId.call(this)
    }

    get interactiveProps() {
        return this.#props
    }

    setInteractiveState(next) {
        if ("override" in next) this.#override = next.override
        this.update()
    }

    /** Đổi danh sách đối tượng đã vẽ thì phải dựng lại cây con, không chỉ vẽ lại. */
    propertyChanged = batched(() => this.update())

    connectedCallback() {
        this.style.display = "none"
        this.#build()
    }

    update() {
        if (this.isConnected) this.#build()
    }

    #build() {
        const props = this.#props

        while (this.#wrappers.length > props.textList.length) this.#wrappers.pop().remove()
        while (this.#wrappers.length < props.textList.length) {
            const wrapper = document.createElement("chart-each-text")
            this.#wrappers.push(wrapper)
            this.append(wrapper)
        }

        this.nodes = [...this.#wrappers]

        props.textList.forEach((each, index) => {
            Object.assign(this.#wrappers[index], {
                ...props.defaultText,
                ...each,
                index,
                selected: each.selected,
                position: getValueFromOverride(this.#override, index, "position", each.position),
                hoverText: {
                    ...interactiveTextToolDefaults.hoverText,
                    ...props.hoverText,
                    ...(each.hoverText || {}),
                },
                onDrag: this.#handleDrag,
                onDragComplete: this.#handleDragComplete,
            })

            this.#wrappers[index].update()
        })

        if (this.#listener === null) {
            this.#listener = document.createElement("chart-click-callback")
            this.append(this.#listener)
        }

        this.#listener.onClick = this.#handleDraw
    }

    #handleDraw = (event, moreProps) => {
        if (!this.#props.enabled) return

        const {
            mouseXY: [, mouseY],
            chartConfig: { yScale },
            xAccessor,
            currentItem,
        } = moreProps

        this.#props.onChoosePosition?.(
            event,
            { ...this.#props.defaultText, position: [xAccessor(currentItem), yScale.invert(mouseY)] },
            moreProps,
        )
    }

    #handleDrag = (event, index, position) => {
        this.setInteractiveState({ override: { index, position } })
    }

    #handleDragComplete = (event, moreProps) => {
        if (!isDefined(this.#override)) return

        const { index, position } = this.#override

        const newTextList = this.#props.textList.map((each, at) =>
            at === index ? { ...each, position, selected: true } : { ...each, selected: false },
        )

        this.setInteractiveState({ override: null })
        this.#props.onDragComplete?.(event, newTextList, moreProps)
    }
}

define("chart-interactive-text-tool", InteractiveText)
