import { isDefined } from "../core/utils/index.js"
import { ElementBase, define, defineProperties, batched } from "../core/element.js"
import { getValueFromOverride, isHoverForInteractiveType, saveNodeType, terminate, toolChartId } from "./utils.js"

export const anchoredTextDefaults = {
    enabled: true,
    kind: "text",
    text: undefined,
    snap: false,
    snapTo: undefined,
    shouldDisableSnap: event => event.button === 2 || event.shiftKey,
    currentPositionStroke: "#000000",
    currentPositionstrokeOpacity: 1,
    currentPositionStrokeWidth: 3,
    currentPositionRadius: 0,
    onComplete: undefined,
    onSelect: undefined,
    hoverText: {
        enable: true,
        bgHeight: "auto",
        bgWidth: "auto",
        text: "Click to select object",
        selectedText: "",
    },
    anchoredTexts: [],
    appearance: {
        bgFill: "#FFFFFF",
        bgStroke: "#000000",
        strokeWidth: 1,
        fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
        fontSize: 12,
        fontFill: "#000000",
        padding: 8,
    },
}

/**
 * Anchored texts: `<chart-anchored-text>`.
 *
 * Một cú bấm đặt hộp chữ neo MÀN HÌNH — cuộn hay zoom biểu đồ thì hộp đứng
 * yên, đúng cách Anchored Text/Note của TradingView. Vị trí nhớ theo TỈ LỆ
 * pane nên resize giữ chỗ tương đối. `kind: note` mặc nền giấy nhớ.
 */
export class AnchoredText extends ElementBase {
    #props
    #override = null

    #wrappers = []
    #indicator = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, anchoredTextDefaults)

        this.terminate = terminate.bind(this)
        this.saveNodeType = saveNodeType.bind(this)
        this.getSelectionState = isHoverForInteractiveType("anchoredTexts").bind(this)
    }

    /** Pane nào chứa công cụ này — thứ `chart-drawing-object-selector` cần khi đăng ký. */
    get chartId() {
        return toolChartId.call(this)
    }

    /** What `isHoverForInteractiveType` reads. */
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

        while (this.#wrappers.length > props.anchoredTexts.length) this.#wrappers.pop().remove()
        while (this.#wrappers.length < props.anchoredTexts.length) {
            const wrapper = document.createElement("chart-each-anchored-box")
            this.#wrappers.push(wrapper)
            this.append(wrapper)
        }

        this.nodes = [...this.#wrappers]

        props.anchoredTexts.forEach((each, index) => {
            const appearance = isDefined(each.appearance) ? { ...props.appearance, ...each.appearance } : props.appearance
            const kind = each.kind ?? props.kind

            Object.assign(this.#wrappers[index], {
                index,
                interactive: true,
                selected: each.selected,
                at: getValueFromOverride(this.#override, index, "at", each.at),
                lines: [each.text ?? props.text ?? (kind === "note" ? "Anchored note" : "Anchored text")],
                cells: undefined,
                appearance: kind === "note" ? { ...appearance, bgFill: "#FFF3B0" } : appearance,
                hoverText: { ...anchoredTextDefaults.hoverText, ...props.hoverText },
                onDrag: this.#handleDragBox,
                onDragComplete: this.#handleDragBoxComplete,
            })

            this.#wrappers[index].update()
        })

        if (this.#indicator === null) {
            this.#indicator = document.createElement("chart-mouse-location-indicator")
            this.append(this.#indicator)
        }

        Object.assign(this.#indicator, {
            enabled: props.enabled,
            snap: props.snap,
            shouldDisableSnap: props.shouldDisableSnap,
            snapTo: props.snapTo,
            r: props.currentPositionRadius,
            stroke: props.currentPositionStroke,
            opacity: props.currentPositionstrokeOpacity,
            strokeWidth: props.currentPositionStrokeWidth,
            onClick: this.#handlePlace,
        })
    }

    /** Một cú bấm — vị trí lấy theo TỈ LỆ pane từ pixel con trỏ, không phải toạ độ dữ liệu. */
    #handlePlace = (event, xyValue, moreProps) => {
        if (!this.#props.enabled) return

        const {
            mouseXY,
            chartConfig: { width, height },
        } = moreProps

        const newTexts = [
            ...this.#props.anchoredTexts.map(each => ({ ...each, selected: false })),
            {
                at: [mouseXY[0] / width, mouseXY[1] / height],
                text: this.#props.text,
                kind: this.#props.kind,
                selected: true,
                appearance: this.#props.appearance,
            },
        ]

        this.#props.onComplete?.(event, newTexts, moreProps)
    }

    #handleDragBox = (event, index, newValues) => {
        this.setInteractiveState({ override: { index, ...newValues } })
    }

    #handleDragBoxComplete = (event, moreProps) => {
        if (!isDefined(this.#override)) return

        const { index, at } = this.#override

        const newTexts = this.#props.anchoredTexts.map((each, position) =>
            position === index ? { ...each, at, selected: true } : { ...each, selected: false },
        )

        this.setInteractiveState({ override: null })
        this.#props.onComplete?.(event, newTexts, moreProps)
    }
}

define("chart-anchored-text", AnchoredText)
