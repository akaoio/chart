import { isDefined, isNotDefined } from "../core/utils/index.js"
import { ElementBase, define, defineProperties, batched } from "../core/element.js"
import { getValueFromOverride, isHoverForInteractiveType, saveNodeType, terminate, toolChartId } from "./utils.js"

/**
 * Mỗi variant là một công cụ Fibonacci hình học của TradingView: bao nhiêu
 * neo thì đủ. Máy trạng thái đặt-n-điểm là MỘT — bảng này là toàn bộ chỗ
 * khác nhau; hình học nằm trong leaf `chart-interactive-fib-shape`.
 */
export const FIB_SHAPE_VARIANTS = {
    fan: { count: 2 },
    arcs: { count: 2 },
    circles: { count: 2 },
    spiral: { count: 2 },
    wedge: { count: 3 },
}

export const fibShapeDefaults = {
    enabled: true,
    variant: "arcs",
    levels: undefined,
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
    fibShapes: [],
    appearance: {
        strokeStyle: "#000000",
        strokeWidth: 1,
        fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
        fontSize: 11,
        fontFill: "#000000",
        edgeStroke: "#000000",
        edgeFill: "#FFFFFF",
        edgeStrokeWidth: 1,
        r: 5,
    },
}

/**
 * Fibonacci shapes: `<chart-fib-shape>`.
 *
 * Fan, arcs, circles, spiral và wedge trên cùng một máy đặt-n-điểm: mỗi cú
 * bấm đóng đinh một neo, hình bám con trỏ ở giữa, đủ số neo của variant thì
 * hoàn thành. Bán kính là pixel từ các neo dữ liệu — đúng kiểu TradingView.
 */
export class FibShape extends ElementBase {
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
        this.#props = defineProperties(this, fibShapeDefaults)

        this.terminate = terminate.bind(this)
        this.saveNodeType = saveNodeType.bind(this)
        this.getSelectionState = isHoverForInteractiveType("fibShapes").bind(this)
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

    #variantOf(name) {
        return FIB_SHAPE_VARIANTS[name] ?? FIB_SHAPE_VARIANTS.arcs
    }

    #build() {
        const props = this.#props

        while (this.#wrappers.length > props.fibShapes.length) this.#wrappers.pop().remove()
        while (this.#wrappers.length < props.fibShapes.length) {
            const wrapper = document.createElement("chart-each-fib-shape")
            this.#wrappers.push(wrapper)
            this.append(wrapper)
        }

        this.nodes = [...this.#wrappers]

        props.fibShapes.forEach((each, index) => {
            const appearance = isDefined(each.appearance) ? { ...props.appearance, ...each.appearance } : props.appearance

            Object.assign(this.#wrappers[index], {
                index,
                interactive: true,
                selected: each.selected,
                points: getValueFromOverride(this.#override, index, "points", each.points),
                variant: each.variant ?? props.variant,
                levels: each.levels ?? props.levels,
                appearance,
                hoverText: { ...fibShapeDefaults.hoverText, ...props.hoverText },
                onDrag: this.#handleDragShape,
                onDragComplete: this.#handleDragShapeComplete,
            })

            this.#wrappers[index].update()
        })

        // Hình tạm: các neo đã đóng đinh cộng con trỏ — leaf tự vẽ được phần dở dang
        const drawing = isDefined(this.#current) && isDefined(this.#current.end)

        if (drawing && this.#temporary === null) {
            this.#temporary = document.createElement("chart-interactive-fib-shape")
            this.append(this.#temporary)
        } else if (!drawing && this.#temporary !== null) {
            this.#temporary.remove()
            this.#temporary = null
        }

        if (drawing)
            Object.assign(this.#temporary, {
                points: [...this.#current.points, this.#current.end],
                variant: props.variant,
                levels: props.levels,
                strokeStyle: props.appearance.strokeStyle,
                strokeWidth: props.appearance.strokeWidth,
                fontFamily: props.appearance.fontFamily,
                fontSize: props.appearance.fontSize,
                fontFill: props.appearance.fontFill,
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
            onMouseDown: this.#handleStart,
            onClick: this.#handleClick,
            onMouseMove: this.#handleDraw,
        })
    }

    #handleStart = (event, xyValue, moreProps) => {
        if (isNotDefined(this.#current) || isNotDefined(this.#current.points)) {
            this.#mouseMoved = false
            this.setInteractiveState({ current: { points: [xyValue], end: null } })
            this.#props.onStart?.(event, moreProps)
        }
    }

    #handleDraw = (event, xyValue) => {
        if (isDefined(this.#current) && isDefined(this.#current.points)) {
            this.#mouseMoved = true
            this.setInteractiveState({ current: { ...this.#current, end: xyValue } })
        }
    }

    /** Mỗi click đóng đinh một neo; đủ số neo của variant thì hoàn thành. */
    #handleClick = (event, xyValue, moreProps) => {
        const current = this.#current
        if (!this.#mouseMoved || !isDefined(current) || !isDefined(current.points)) return

        const variant = this.#variantOf(this.#props.variant)

        if (current.points.length < variant.count - 1) {
            this.setInteractiveState({ current: { ...current, points: [...current.points, xyValue] } })
            return
        }

        const newShapes = [
            ...this.#props.fibShapes.map(each => ({ ...each, selected: false })),
            {
                points: [...current.points, xyValue],
                variant: this.#props.variant,
                selected: true,
                appearance: this.#props.appearance,
            },
        ]

        this.setInteractiveState({ current: null, override: null })
        this.#props.onComplete?.(event, newShapes, moreProps)
    }

    #handleDragShape = (event, index, newValues) => {
        this.setInteractiveState({ override: { index, ...newValues } })
    }

    #handleDragShapeComplete = (event, moreProps) => {
        if (!isDefined(this.#override)) return

        const { index, points } = this.#override

        const newShapes = this.#props.fibShapes.map((each, position) =>
            position === index ? { ...each, points, selected: true } : { ...each, selected: false },
        )

        this.setInteractiveState({ override: null })
        this.#props.onComplete?.(event, newShapes, moreProps)
    }
}

define("chart-fib-shape", FibShape)
