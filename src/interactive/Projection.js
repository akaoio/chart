import { isDefined, isNotDefined } from "../core/utils/index.js"
import { ElementBase, define, defineProperties, batched } from "../core/element.js"
import { getValueFromOverride, isHoverForInteractiveType, saveNodeType, terminate, toolChartId } from "./utils.js"

export const projectionDefaults = {
    enabled: true,
    variant: "forecast",
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
    projections: [],
    appearance: {
        strokeStyle: "#787B86",
        strokeWidth: 1,
        upFill: "rgba(38, 166, 154, 0.2)",
        downFill: "rgba(239, 83, 80, 0.2)",
        textFill: "#FFFFFF",
        upLabelFill: "#26A69A",
        downLabelFill: "#EF5350",
        fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
        fontSize: 11,
        edgeStroke: "#787B86",
        edgeFill: "#FFFFFF",
        edgeStrokeWidth: 1,
        r: 6,
    },
}

/**
 * Forecast and Projection: `<chart-projection>`, three clicks.
 *
 * Hai cú bấm đầu vẽ chân NỀN — quãng đã xảy ra mà mọi dự phóng dựa vào. Cú bấm
 * thứ ba khác nhau theo `variant`, và đó là toàn bộ chỗ khác nhau giữa hai công
 * cụ TradingView:
 *
 * · `forecast` — neo 3 là ĐÍCH, đặt tự do; chân dự báo nối tiếp từ cuối chân nền.
 * · `projection` — neo 3 là GỐC mới; đích suy ra bằng cách chép nguyên vector nền
 *   sang đó, nên đổi chân nền là đổi cả chân dự phóng.
 *
 * Hộp đọc số nói Δgiá, % và số nến của chân dự phóng — suy từ ba neo mỗi lần vẽ,
 * nên nó không thể cũ đi khi người dùng kéo.
 */
export class Projection extends ElementBase {
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
        this.#props = defineProperties(this, projectionDefaults)

        this.terminate = terminate.bind(this)
        this.saveNodeType = saveNodeType.bind(this)
        this.getSelectionState = isHoverForInteractiveType("projections").bind(this)
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

        while (this.#wrappers.length > props.projections.length) this.#wrappers.pop().remove()
        while (this.#wrappers.length < props.projections.length) {
            const wrapper = document.createElement("chart-each-projection")
            this.#wrappers.push(wrapper)
            this.append(wrapper)
        }

        this.nodes = [...this.#wrappers]

        props.projections.forEach((each, index) => {
            const appearance = isDefined(each.appearance) ? { ...props.appearance, ...each.appearance } : props.appearance

            Object.assign(this.#wrappers[index], {
                index,
                interactive: true,
                selected: each.selected,
                points: getValueFromOverride(this.#override, index, "points", each.points),
                variant: each.variant ?? props.variant,
                appearance,
                hoverText: { ...projectionDefaults.hoverText, ...props.hoverText },
                onDrag: this.#handleDragProjection,
                onDragComplete: this.#handleDragProjectionComplete,
            })

            this.#wrappers[index].update()
        })

        // Hình tạm chỉ có nghĩa khi đã đủ ba neo (hai đã đóng đinh + con trỏ) — trước
        // đó chưa có chân dự phóng nào để vẽ, và vẽ bừa một chân từ hai điểm là nói dối.
        const drawing = isDefined(this.#current) && isDefined(this.#current.end) && this.#current.points.length === 2

        if (drawing && this.#temporary === null) {
            this.#temporary = document.createElement("chart-interactive-projection")
            this.append(this.#temporary)
        } else if (!drawing && this.#temporary !== null) {
            this.#temporary.remove()
            this.#temporary = null
        }

        if (drawing) {
            Object.assign(this.#temporary, {
                points: [...this.#current.points, this.#current.end],
                variant: props.variant,
                strokeStyle: props.appearance.strokeStyle,
                strokeWidth: props.appearance.strokeWidth,
                upFill: props.appearance.upFill,
                downFill: props.appearance.downFill,
                textFill: props.appearance.textFill,
                upLabelFill: props.appearance.upLabelFill,
                downLabelFill: props.appearance.downLabelFill,
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

    /** Hai cú bấm đầu là chân nền, cú thứ ba chốt — đích hay gốc tuỳ variant. */
    #handleClick = (event, xyValue, moreProps) => {
        const current = this.#current
        if (!this.#mouseMoved || !isDefined(current) || !isDefined(current.points)) return

        if (current.points.length < 2) {
            this.setInteractiveState({ current: { ...current, points: [...current.points, xyValue] } })
            return
        }

        const newProjections = [
            ...this.#props.projections.map(each => ({ ...each, selected: false })),
            {
                points: [...current.points, xyValue],
                variant: this.#props.variant,
                selected: true,
                appearance: this.#props.appearance,
            },
        ]

        this.setInteractiveState({ current: null, override: null })
        this.#props.onComplete?.(event, newProjections, moreProps)
    }

    #handleDragProjection = (event, index, newValues) => {
        this.setInteractiveState({ override: { index, ...newValues } })
    }

    #handleDragProjectionComplete = (event, moreProps) => {
        if (!isDefined(this.#override)) return

        const { index, points } = this.#override

        const newProjections = this.#props.projections.map((each, position) =>
            position === index ? { ...each, points, selected: true } : { ...each, selected: false },
        )

        this.setInteractiveState({ override: null })
        this.#props.onComplete?.(event, newProjections, moreProps)
    }
}

define("chart-projection", Projection)
