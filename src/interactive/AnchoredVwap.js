import { word } from "../core/i18n.js"
import { isDefined } from "../core/utils/index.js"
import { ElementBase, define, defineProperties, batched } from "../core/element.js"
import { isHoverForInteractiveType, saveNodeType, terminate, toolChartId } from "./utils.js"

export const anchoredVwapDefaults = {
    enabled: true,
    onStart: undefined,
    onComplete: undefined,
    onSelect: undefined,
    currentPositionStroke: "#000000",
    currentPositionOpacity: 1,
    currentPositionStrokeWidth: 3,
    currentPositionRadius: 4,
    hoverText: { enable: true, bgHeight: 18, bgWidth: 120, text: word("selectObject") },
    vwaps: [],
    appearance: {
        stroke: "#2962ff",
        strokeWidth: 2,
        edgeStroke: "#000000",
        edgeFill: "#FFFFFF",
        edgeStrokeWidth: 1,
        r: 5,
    },
}

/**
 * TradingView's Anchored VWAP: `<chart-anchored-vwap>`, one click.
 *
 * The click plants the anchor; everything after it is the DATA's — the line is
 * Σ(typical·volume)/Σ(volume) from the anchor bar forward, recomputed by the leaf on
 * every draw. One-click placement, same shape as `chart-position-tool`.
 */
export class AnchoredVwap extends ElementBase {
    #props
    #override = null

    #wrappers = []
    #indicator = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, anchoredVwapDefaults)

        this.terminate = terminate.bind(this)
        this.saveNodeType = saveNodeType.bind(this)
        this.getSelectionState = isHoverForInteractiveType("vwaps").bind(this)
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
        const overrideIndex = isDefined(this.#override) ? this.#override.index : null

        while (this.#wrappers.length > props.vwaps.length) this.#wrappers.pop().remove()
        while (this.#wrappers.length < props.vwaps.length) {
            const wrapper = document.createElement("chart-each-anchored-vwap")
            this.#wrappers.push(wrapper)
            this.append(wrapper)
        }

        this.nodes = [...this.#wrappers]

        props.vwaps.forEach((each, index) => {
            const appearance = isDefined(each.appearance)
                ? { ...props.appearance, ...each.appearance }
                : props.appearance

            const live = index === overrideIndex ? this.#override : each

            Object.assign(this.#wrappers[index], {
                index,
                selected: each.selected,
                hoverText: props.hoverText,
                anchor: live.anchor,
                appearance,
                onDrag: this.#handleDrag,
                onDragComplete: this.#handleDragComplete,
            })

            this.#wrappers[index].update()
        })

        if (this.#indicator === null) {
            this.#indicator = document.createElement("chart-mouse-location-indicator")
            this.append(this.#indicator)
        }

        Object.assign(this.#indicator, {
            enabled: props.enabled,
            snap: false,
            r: props.currentPositionRadius,
            stroke: props.currentPositionStroke,
            opacity: props.currentPositionOpacity,
            strokeWidth: props.currentPositionStrokeWidth,
            onClick: this.#handlePlace,
        })
    }

    /** One click, one anchor — the data does the rest. */
    #handlePlace = (event, xyValue, moreProps) => {
        if (!this.#props.enabled) return

        const newVwaps = [
            ...this.#props.vwaps.map(each => ({ ...each, selected: false })),
            { anchor: xyValue, selected: true, appearance: this.#props.appearance },
        ]

        this.#props.onComplete?.(event, newVwaps, moreProps)
    }

    #handleDrag = (event, index, newValues) => {
        this.setInteractiveState({ override: { index, ...newValues } })
    }

    #handleDragComplete = (event, moreProps) => {
        if (!isDefined(this.#override)) return

        const { index, ...rest } = this.#override

        const newVwaps = this.#props.vwaps.map((each, at) =>
            at === index ? { ...each, ...rest, selected: true } : each,
        )

        this.setInteractiveState({ override: null })
        this.#props.onComplete?.(event, newVwaps, moreProps)
    }
}

define("chart-anchored-vwap", AnchoredVwap)
