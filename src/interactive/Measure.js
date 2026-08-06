import { isDefined, isNotDefined } from "../core/utils/index.js"
import { ElementBase, define, defineProperties, batched } from "../core/element.js"
import { getValueFromOverride, isHoverForInteractiveType, saveNodeType, terminate, toolChartId } from "./utils.js"

export const measureDefaults = {
    enabled: true,
    mode: "both",
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
    measures: [],
    appearance: {
        strokeStyle: "#2962FF",
        strokeWidth: 1,
        fillStyle: "rgba(41, 98, 255, 0.16)",
        textFill: "#FFFFFF",
        labelFill: "#2962FF",
        fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
        fontSize: 11,
        edgeStrokeWidth: 1,
        edgeFill: "#FFFFFF",
        edgeStroke: "#2962FF",
        r: 6,
    },
}

/**
 * Measurement boxes: `<chart-measure>`.
 *
 * Two clicks span a box and it reads itself out: price change and percent, bar count
 * and elapsed time — `mode` (`price` | `date` | `both`) picks which. TradingView ships
 * these as three tools (Price range, Date range, Date and price range); here they are
 * one element with a mode, and each placed measure remembers its own.
 */
export class Measure extends ElementBase {
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
        this.#props = defineProperties(this, measureDefaults)

        this.terminate = terminate.bind(this)
        this.saveNodeType = saveNodeType.bind(this)
        this.getSelectionState = isHoverForInteractiveType("measures").bind(this)
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

        while (this.#wrappers.length > props.measures.length) this.#wrappers.pop().remove()
        while (this.#wrappers.length < props.measures.length) {
            const wrapper = document.createElement("chart-each-measure")
            this.#wrappers.push(wrapper)
            this.append(wrapper)
        }

        this.nodes = [...this.#wrappers]

        props.measures.forEach((each, index) => {
            const appearance = isDefined(each.appearance) ? { ...props.appearance, ...each.appearance } : props.appearance

            Object.assign(this.#wrappers[index], {
                index,
                mode: each.mode ?? props.mode,
                selected: each.selected,
                x1Value: getValueFromOverride(this.#override, index, "x1Value", each.start[0]),
                y1Value: getValueFromOverride(this.#override, index, "y1Value", each.start[1]),
                x2Value: getValueFromOverride(this.#override, index, "x2Value", each.end[0]),
                y2Value: getValueFromOverride(this.#override, index, "y2Value", each.end[1]),
                strokeStyle: appearance.strokeStyle,
                strokeWidth: appearance.strokeWidth,
                fillStyle: appearance.fillStyle,
                textFill: appearance.textFill,
                labelFill: appearance.labelFill,
                fontFamily: appearance.fontFamily,
                fontSize: appearance.fontSize,
                edgeStroke: appearance.edgeStroke,
                edgeFill: appearance.edgeFill,
                edgeStrokeWidth: appearance.edgeStrokeWidth,
                r: appearance.r,
                hoverText: { ...measureDefaults.hoverText, ...props.hoverText },
                onDrag: this.#handleDragMeasure,
                onDragComplete: this.#handleDragMeasureComplete,
            })

            this.#wrappers[index].update()
        })

        // The measure being drawn right now, following the pointer
        const drawing = isDefined(this.#current) && isDefined(this.#current.end)

        if (drawing && this.#temporary === null) {
            this.#temporary = document.createElement("chart-interactive-measure")
            this.append(this.#temporary)
        } else if (!drawing && this.#temporary !== null) {
            this.#temporary.remove()
            this.#temporary = null
        }

        if (drawing) {
            Object.assign(this.#temporary, {
                mode: props.mode,
                x1Value: this.#current.start[0],
                y1Value: this.#current.start[1],
                x2Value: this.#current.end[0],
                y2Value: this.#current.end[1],
                strokeStyle: props.appearance.strokeStyle,
                strokeWidth: props.appearance.strokeWidth,
                fillStyle: props.appearance.fillStyle,
                textFill: props.appearance.textFill,
                labelFill: props.appearance.labelFill,
                fontFamily: props.appearance.fontFamily,
                fontSize: props.appearance.fontSize,
            })
        }

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
            onMouseDown: this.#handleStart,
            onClick: this.#handleEnd,
            onMouseMove: this.#handleDrawMeasure,
        })
    }

    #handleStart = (event, xyValue, moreProps) => {
        if (isNotDefined(this.#current) || isNotDefined(this.#current.start)) {
            this.#mouseMoved = false
            this.setInteractiveState({ current: { start: xyValue, end: null } })
            this.#props.onStart?.(event, moreProps)
        }
    }

    #handleDrawMeasure = (event, xyValue) => {
        if (isDefined(this.#current) && isDefined(this.#current.start)) {
            this.#mouseMoved = true
            this.setInteractiveState({ current: { start: this.#current.start, end: xyValue } })
        }
    }

    /**
     * The second click completes the measure — but only if the pointer actually moved.
     * A zero-span measure measures nothing.
     */
    #handleEnd = (event, xyValue, moreProps) => {
        if (!this.#mouseMoved || !isDefined(this.#current) || !isDefined(this.#current.start)) return

        const newMeasures = [
            ...this.#props.measures.map(each => ({ ...each, selected: false })),
            {
                start: this.#current.start,
                end: xyValue,
                selected: true,
                appearance: this.#props.appearance,
                mode: this.#props.mode,
            },
        ]

        this.setInteractiveState({ current: null, override: null })
        this.#props.onComplete?.(event, newMeasures, moreProps)
    }

    #handleDragMeasure = (event, index, newXYValue) => {
        this.setInteractiveState({ override: { index, ...newXYValue } })
    }

    #handleDragMeasureComplete = (event, moreProps) => {
        if (!isDefined(this.#override)) return

        const override = this.#override

        const newMeasures = this.#props.measures.map((each, index) =>
            index === override.index
                ? {
                      ...each,
                      start: [override.x1Value, override.y1Value],
                      end: [override.x2Value, override.y2Value],
                      selected: true,
                  }
                : { ...each, selected: false },
        )

        this.setInteractiveState({ override: null })
        this.#props.onComplete?.(event, newMeasures, moreProps)
    }
}

define("chart-measure", Measure)
