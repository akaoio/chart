import { isDefined, isNotDefined } from "../core/utils/index.js"
import { ElementBase, define, defineProperties, batched } from "../core/element.js"
import { isHoverForInteractiveType, saveNodeType, terminate, toolChartId } from "./utils.js"

export const gannFanToolDefaults = {
    enabled: true,
    onStart: undefined,
    onComplete: undefined,
    onSelect: undefined,
    currentPositionStroke: "#000000",
    currentPositionOpacity: 1,
    currentPositionStrokeWidth: 3,
    currentPositionRadius: 4,
    hoverText: { enable: true, bgHeight: 18, bgWidth: 120, text: "Click to select object" },
    fans: [],
    appearance: {
        stroke: "#000000",
        fillOpacity: 0.2,
        strokeOpacity: 1,
        strokeWidth: 1,
        edgeStroke: "#000000",
        edgeFill: "#FFFFFF",
        edgeStrokeWidth: 1,
        r: 5,
        fill: [
            "rgba(31, 119, 180, 0.2)",
            "rgba(255, 126, 14, 0.2)",
            "rgba(44, 160, 44, 0.2)",
            "rgba(214, 39, 39, 0.2)",
            "rgba(148, 103, 189, 0.2)",
            "rgba(140, 86, 75, 0.2)",
            "rgba(227, 119, 194, 0.2)",
            "rgba(127, 127, 127, 0.2)",
        ],
        fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
        fontSize: 10,
        fontFill: "#000000",
    },
}

/** Gann fans: `<chart-gann-fan-tool>`. Two clicks set the 1/1 ray; the rest follow. */
export class GannFan extends ElementBase {
    #props
    #current = null
    #override = null
    #mouseMoved = false

    #wrappers = []
    #temporary = null
    #indicator = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, gannFanToolDefaults)

        this.terminate = terminate.bind(this)
        this.saveNodeType = saveNodeType.bind(this)
        this.getSelectionState = isHoverForInteractiveType("fans").bind(this)
    }

    /** Pane nào chứa công cụ này — thứ `chart-drawing-object-selector` cần khi đăng ký. */
    get chartId() {
        return toolChartId.call(this)
    }

    get interactiveProps() {
        return this.#props
    }

    setInteractiveState(next) {
        if ("current" in next) this.#current = next.current
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

        while (this.#wrappers.length > props.fans.length) this.#wrappers.pop().remove()
        while (this.#wrappers.length < props.fans.length) {
            const wrapper = document.createElement("chart-each-gann-fan")
            this.#wrappers.push(wrapper)
            this.append(wrapper)
        }

        this.nodes = [...this.#wrappers]

        props.fans.forEach((each, index) => {
            const appearance = isDefined(each.appearance)
                ? { ...props.appearance, ...each.appearance }
                : props.appearance

            const live = index === overrideIndex ? this.#override : each

            Object.assign(this.#wrappers[index], {
                index,
                selected: each.selected,
                startXY: live.startXY,
                endXY: live.endXY,
                appearance,
                hoverText: props.hoverText,
                onDrag: this.#handleDragFan,
                onDragComplete: this.#handleDragFanComplete,
            })

            this.#wrappers[index].update()
        })

        const drawing = isDefined(this.#current) && isDefined(this.#current.endXY)

        if (drawing && this.#temporary === null) {
            this.#temporary = document.createElement("chart-each-gann-fan")
            this.append(this.#temporary)
        } else if (!drawing && this.#temporary !== null) {
            this.#temporary.remove()
            this.#temporary = null
        }

        if (drawing) {
            Object.assign(this.#temporary, {
                interactive: false,
                startXY: this.#current.startXY,
                endXY: this.#current.endXY,
                appearance: props.appearance,
                hoverText: props.hoverText,
            })
            this.#temporary.update()
        }

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
            onMouseDown: this.#handleStart,
            onClick: this.#handleEnd,
            onMouseMove: this.#handleDrawFan,
        })
    }

    #handleStart = (event, xyValue) => {
        if (isNotDefined(this.#current) || isNotDefined(this.#current.startXY)) {
            this.#mouseMoved = false
            this.setInteractiveState({ current: { startXY: xyValue, endXY: null } })
            this.#props.onStart?.()
        }
    }

    #handleDrawFan = (event, xyValue) => {
        if (isDefined(this.#current) && isDefined(this.#current.startXY)) {
            this.#mouseMoved = true
            this.setInteractiveState({ current: { startXY: this.#current.startXY, endXY: xyValue } })
        }
    }

    #handleEnd = (event, xyValue, moreProps) => {
        if (!this.#mouseMoved || !isDefined(this.#current) || !isDefined(this.#current.startXY)) return

        const newFans = [
            ...this.#props.fans.map(each => ({ ...each, selected: false })),
            { startXY: this.#current.startXY, endXY: xyValue, selected: true, appearance: this.#props.appearance },
        ]

        this.setInteractiveState({ current: null })
        this.#props.onComplete?.(event, newFans, moreProps)
    }

    #handleDragFan = (event, index, newXYValue) => {
        this.setInteractiveState({ override: { index, ...newXYValue } })
    }

    #handleDragFanComplete = (event, moreProps) => {
        if (!isDefined(this.#override)) return

        const { index, ...rest } = this.#override

        const newFans = this.#props.fans.map((each, at) =>
            at === index ? { ...each, ...rest, selected: true } : each,
        )

        this.setInteractiveState({ override: null })
        this.#props.onComplete?.(event, newFans, moreProps)
    }
}

define("chart-gann-fan-tool", GannFan)
