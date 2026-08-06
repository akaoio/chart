import { isDefined, isNotDefined } from "../core/utils/index.js"
import { ElementBase, define, defineProperties, batched } from "../core/element.js"
import { getValueFromOverride, isHoverForInteractiveType, saveNodeType, terminate, toolChartId } from "./utils.js"

export const shapeToolDefaults = {
    enabled: true,
    shape: "rectangle",
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
    shapes: [],
    appearance: {
        strokeStyle: "#000000",
        strokeWidth: 1,
        strokeDasharray: "Solid",
        fillStyle: "rgba(138, 175, 226, 0.35)",
        edgeStrokeWidth: 1,
        edgeFill: "#FFFFFF",
        edgeStroke: "#000000",
        r: 6,
    },
}

/**
 * Rectangles and ellipses: `<chart-shape-tool>`.
 *
 * Two clicks span the shape between two corners, the same gesture as a trendline —
 * the shape rubber-bands after the first click. `shape` decides what fills the box:
 * `rectangle` or `ellipse`. Each placed shape remembers its own kind, so one tool
 * instance can hold a mixed list.
 */
export class ShapeTool extends ElementBase {
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
        this.#props = defineProperties(this, shapeToolDefaults)

        this.terminate = terminate.bind(this)
        this.saveNodeType = saveNodeType.bind(this)
        this.getSelectionState = isHoverForInteractiveType("shapes").bind(this)
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

        while (this.#wrappers.length > props.shapes.length) this.#wrappers.pop().remove()
        while (this.#wrappers.length < props.shapes.length) {
            const wrapper = document.createElement("chart-each-shape")
            this.#wrappers.push(wrapper)
            this.append(wrapper)
        }

        this.nodes = [...this.#wrappers]

        props.shapes.forEach((each, index) => {
            const appearance = isDefined(each.appearance) ? { ...props.appearance, ...each.appearance } : props.appearance

            Object.assign(this.#wrappers[index], {
                index,
                shape: each.shape ?? props.shape,
                selected: each.selected,
                x1Value: getValueFromOverride(this.#override, index, "x1Value", each.start[0]),
                y1Value: getValueFromOverride(this.#override, index, "y1Value", each.start[1]),
                x2Value: getValueFromOverride(this.#override, index, "x2Value", each.end[0]),
                y2Value: getValueFromOverride(this.#override, index, "y2Value", each.end[1]),
                strokeStyle: appearance.strokeStyle,
                strokeWidth: appearance.strokeWidth,
                strokeDasharray: appearance.strokeDasharray,
                fillStyle: appearance.fillStyle,
                edgeStroke: appearance.edgeStroke,
                edgeFill: appearance.edgeFill,
                edgeStrokeWidth: appearance.edgeStrokeWidth,
                r: appearance.r,
                hoverText: { ...shapeToolDefaults.hoverText, ...props.hoverText },
                onDrag: this.#handleDragShape,
                onDragComplete: this.#handleDragShapeComplete,
            })

            this.#wrappers[index].update()
        })

        // The shape being drawn right now, following the pointer
        const drawing = isDefined(this.#current) && isDefined(this.#current.end)

        if (drawing && this.#temporary === null) {
            this.#temporary = document.createElement("chart-interactive-shape")
            this.append(this.#temporary)
        } else if (!drawing && this.#temporary !== null) {
            this.#temporary.remove()
            this.#temporary = null
        }

        if (drawing) {
            Object.assign(this.#temporary, {
                shape: props.shape,
                x1Value: this.#current.start[0],
                y1Value: this.#current.start[1],
                x2Value: this.#current.end[0],
                y2Value: this.#current.end[1],
                strokeStyle: props.appearance.strokeStyle,
                strokeWidth: props.appearance.strokeWidth,
                fillStyle: props.appearance.fillStyle,
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
            onMouseMove: this.#handleDrawShape,
        })
    }

    #handleStart = (event, xyValue, moreProps) => {
        if (isNotDefined(this.#current) || isNotDefined(this.#current.start)) {
            this.#mouseMoved = false
            this.setInteractiveState({ current: { start: xyValue, end: null } })
            this.#props.onStart?.(event, moreProps)
        }
    }

    #handleDrawShape = (event, xyValue) => {
        if (isDefined(this.#current) && isDefined(this.#current.start)) {
            this.#mouseMoved = true
            this.setInteractiveState({ current: { start: this.#current.start, end: xyValue } })
        }
    }

    /**
     * The second click completes the shape — but only if the pointer actually moved.
     * Without that check, a single click would leave a zero-area shape.
     */
    #handleEnd = (event, xyValue, moreProps) => {
        if (!this.#mouseMoved || !isDefined(this.#current) || !isDefined(this.#current.start)) return

        const newShapes = [
            ...this.#props.shapes.map(each => ({ ...each, selected: false })),
            {
                start: this.#current.start,
                end: xyValue,
                selected: true,
                appearance: this.#props.appearance,
                shape: this.#props.shape,
            },
        ]

        this.setInteractiveState({ current: null, override: null })
        this.#props.onComplete?.(event, newShapes, moreProps)
    }

    #handleDragShape = (event, index, newXYValue) => {
        this.setInteractiveState({ override: { index, ...newXYValue } })
    }

    #handleDragShapeComplete = (event, moreProps) => {
        if (!isDefined(this.#override)) return

        const override = this.#override

        const newShapes = this.#props.shapes.map((each, index) =>
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
        this.#props.onComplete?.(event, newShapes, moreProps)
    }
}

define("chart-shape-tool", ShapeTool)
