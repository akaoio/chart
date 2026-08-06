import { isDefined } from "../core/utils/index.js"
import { ElementBase, define, defineProperties, batched } from "../core/element.js"
import { getValueFromOverride, isHoverForInteractiveType, saveNodeType, terminate, toolChartId } from "./utils.js"

export const positionToolDefaults = {
    enabled: true,
    side: "long",
    barSpan: 20,
    stopFraction: 0.02,
    riskReward: 2,
    snap: false,
    snapTo: undefined,
    shouldDisableSnap: event => event.button === 2 || event.shiftKey,
    currentPositionStroke: "#000000",
    currentPositionstrokeOpacity: 1,
    currentPositionStrokeWidth: 3,
    currentPositionRadius: 0,
    onStart: undefined,
    onComplete: undefined,
    onSelect: undefined,
    hoverText: {
        enable: true,
        bgHeight: "auto",
        bgWidth: "auto",
        text: "Click to select object",
        selectedText: "",
    },
    positions: [],
    appearance: {
        profitFill: "rgba(38, 166, 154, 0.2)",
        lossFill: "rgba(239, 83, 80, 0.2)",
        strokeStyle: "#787B86",
        strokeWidth: 1,
        textFill: "#FFFFFF",
        profitLabelFill: "#26A69A",
        lossLabelFill: "#EF5350",
        fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
        fontSize: 11,
        edgeStrokeWidth: 1,
        edgeFill: "#FFFFFF",
        edgeStroke: "#787B86",
        r: 6,
    },
}

/**
 * Position plans: `<chart-position-tool>`.
 *
 * One click plants a plan at the pointer: entry at the click, stop `stopFraction`
 * away, target `riskReward` times as far the other way, spanning `barSpan` bars.
 * `side` decides which way is profit at placement time — after that the handles rule,
 * and dragging the target through the entry quietly turns a long into a short,
 * exactly like TradingView.
 */
export class PositionTool extends ElementBase {
    #props
    #override = null

    #wrappers = []
    #indicator = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, positionToolDefaults)

        this.terminate = terminate.bind(this)
        this.saveNodeType = saveNodeType.bind(this)
        this.getSelectionState = isHoverForInteractiveType("positions").bind(this)
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

        while (this.#wrappers.length > props.positions.length) this.#wrappers.pop().remove()
        while (this.#wrappers.length < props.positions.length) {
            const wrapper = document.createElement("chart-each-position")
            this.#wrappers.push(wrapper)
            this.append(wrapper)
        }

        this.nodes = [...this.#wrappers]

        props.positions.forEach((each, index) => {
            const appearance = isDefined(each.appearance) ? { ...props.appearance, ...each.appearance } : props.appearance

            Object.assign(this.#wrappers[index], {
                index,
                selected: each.selected,
                x1Value: getValueFromOverride(this.#override, index, "x1Value", each.x1Value),
                x2Value: getValueFromOverride(this.#override, index, "x2Value", each.x2Value),
                entry: getValueFromOverride(this.#override, index, "entry", each.entry),
                target: getValueFromOverride(this.#override, index, "target", each.target),
                stop: getValueFromOverride(this.#override, index, "stop", each.stop),
                profitFill: appearance.profitFill,
                lossFill: appearance.lossFill,
                strokeStyle: appearance.strokeStyle,
                strokeWidth: appearance.strokeWidth,
                textFill: appearance.textFill,
                profitLabelFill: appearance.profitLabelFill,
                lossLabelFill: appearance.lossLabelFill,
                fontFamily: appearance.fontFamily,
                fontSize: appearance.fontSize,
                edgeStroke: appearance.edgeStroke,
                edgeFill: appearance.edgeFill,
                edgeStrokeWidth: appearance.edgeStrokeWidth,
                r: appearance.r,
                hoverText: { ...positionToolDefaults.hoverText, ...props.hoverText },
                onDrag: this.#handleDragPosition,
                onDragComplete: this.#handleDragPositionComplete,
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

    /** One click, one plan — the proportions come from the defaults, the handles do the rest. */
    #handlePlace = (event, xyValue, moreProps) => {
        if (!this.#props.enabled) return

        const [xValue, entry] = xyValue
        const distance = Math.abs(entry) * this.#props.stopFraction
        const up = this.#props.side !== "short"

        const newPositions = [
            ...this.#props.positions.map(each => ({ ...each, selected: false })),
            {
                x1Value: xValue,
                x2Value: xValue + this.#props.barSpan,
                entry,
                target: up ? entry + distance * this.#props.riskReward : entry - distance * this.#props.riskReward,
                stop: up ? entry - distance : entry + distance,
                selected: true,
                appearance: this.#props.appearance,
                side: this.#props.side,
            },
        ]

        this.#props.onComplete?.(event, newPositions, moreProps)
    }

    #handleDragPosition = (event, index, newValues) => {
        this.setInteractiveState({ override: { index, ...newValues } })
    }

    #handleDragPositionComplete = (event, moreProps) => {
        if (!isDefined(this.#override)) return

        const { index, ...values } = this.#override

        const newPositions = this.#props.positions.map((each, at) =>
            at === index ? { ...each, ...values, selected: true } : { ...each, selected: false },
        )

        this.setInteractiveState({ override: null })
        this.#props.onComplete?.(event, newPositions, moreProps)
    }
}

define("chart-position-tool", PositionTool)
