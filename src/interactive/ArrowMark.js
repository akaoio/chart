import { isDefined } from "../core/utils/index.js"
import { ElementBase, define, defineProperties, batched } from "../core/element.js"
import { getValueFromOverride, isHoverForInteractiveType, saveNodeType, terminate, toolChartId } from "./utils.js"

export const arrowMarkDefaults = {
    enabled: true,
    mode: "up",
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
    marks: [],
    appearance: {
        bgFill: "#FFFFFF",
        bgStroke: "#000000",
        strokeWidth: 1,
        textFill: "#000000",
        fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
        fontSize: 12,
    },
}

/**
 * Arrow marks: `<chart-arrow-mark>`.
 *
 * One click plants a ▲ or ▼ at the pointer — `mode` decides which way it
 * points at placement, each mark remembers its own.
 */
export class ArrowMark extends ElementBase {
    #props
    #override = null

    #wrappers = []
    #indicator = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, arrowMarkDefaults)

        this.terminate = terminate.bind(this)
        this.saveNodeType = saveNodeType.bind(this)
        this.getSelectionState = isHoverForInteractiveType("marks").bind(this)
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

        while (this.#wrappers.length > props.marks.length) this.#wrappers.pop().remove()
        while (this.#wrappers.length < props.marks.length) {
            const wrapper = document.createElement("chart-each-arrow-mark")
            this.#wrappers.push(wrapper)
            this.append(wrapper)
        }

        this.nodes = [...this.#wrappers]

        props.marks.forEach((each, index) => {
            const appearance = isDefined(each.appearance) ? { ...props.appearance, ...each.appearance } : props.appearance

            Object.assign(this.#wrappers[index], {
                index,
                interactive: true,
                selected: each.selected,
                at: getValueFromOverride(this.#override, index, "at", each.at),
                mode: each.mode ?? props.mode,
                appearance,
                hoverText: { ...arrowMarkDefaults.hoverText, ...props.hoverText },
                onDrag: this.#handleDragMark,
                onDragComplete: this.#handleDragMarkComplete,
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

    /** One click, one label — the price is read off the click itself. */
    #handlePlace = (event, xyValue, moreProps) => {
        if (!this.#props.enabled) return

        const newMarks = [
            ...this.#props.marks.map(each => ({ ...each, selected: false })),
            { at: xyValue, mode: this.#props.mode, selected: true, appearance: this.#props.appearance },
        ]

        this.#props.onComplete?.(event, newMarks, moreProps)
    }

    #handleDragMark = (event, index, newValues) => {
        this.setInteractiveState({ override: { index, ...newValues } })
    }

    #handleDragMarkComplete = (event, moreProps) => {
        if (!isDefined(this.#override)) return

        const { index, at } = this.#override

        const newMarks = this.#props.marks.map((each, position) =>
            position === index ? { ...each, at, selected: true } : { ...each, selected: false },
        )

        this.setInteractiveState({ override: null })
        this.#props.onComplete?.(event, newMarks, moreProps)
    }
}

define("chart-arrow-mark", ArrowMark)
