import { isDefined, isNotDefined } from "../core/utils/index.js"
import { ElementBase, define, defineProperties, batched } from "../core/element.js"
import { getValueFromOverride, isHoverForInteractiveType, saveNodeType, terminate, toolChartId } from "./utils.js"

/**
 * Năm công cụ hình khối của TradingView, một bảng phẳng — cùng khuôn với
 * `PATTERN_VARIANTS`: bao nhiêu neo, hình học nào, có lòng hay không.
 *
 * `count: 0` nghĩa là **không định trước số neo** — nhấp đúp mới chốt, đúng
 * cách `chart-path` làm. Mọi variant còn lại chốt khi đủ neo.
 *
 * Thứ tự bấm là thứ tự HÌNH HỌC, không phải thứ tự thao tác của TradingView:
 * cung là ba điểm nó ĐI QUA (đầu → giữa → cuối), Bézier là đầu → điều khiển →
 * cuối. Bấm theo thứ tự ấy thì hình tạm luôn là hình sẽ có, không nhảy dáng ở
 * cú bấm cuối — cái giá phải trả là nó khác thao tác TV, và đó là lựa chọn.
 */
export const CURVE_VARIANTS = {
    triangle: { count: 3, mode: "polygon", closed: true },
    polyline: { count: 0, mode: "polygon", closed: true },
    arc: { count: 3, mode: "arc", closed: true },
    curve: { count: 3, mode: "quadratic", closed: false },
    doubleCurve: { count: 4, mode: "cubic", closed: false },
}

export const curveToolDefaults = {
    enabled: true,
    variant: "triangle",
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
    curves: [],
    appearance: {
        strokeStyle: "#000000",
        strokeWidth: 1,
        fillStyle: "rgba(138, 175, 226, 0.2)",
        edgeStroke: "#000000",
        edgeFill: "#FFFFFF",
        edgeStrokeWidth: 1,
        r: 5,
    },
}

/**
 * Shapes with a fill: `<chart-curve-tool>`.
 *
 * Triangle, Polyline, Arc, Curve and Double curve are one placement machine and
 * one leaf — `variant` is the only difference between them, and it is a row in
 * `CURVE_VARIANTS`. Each placed shape remembers its own variant, so one tool
 * instance can hold a mixed list.
 */
export class CurveTool extends ElementBase {
    #props
    #current = null
    #override = null
    #mouseMoved = false

    #wrappers = []
    #temporary = null
    #indicator = null
    #listener = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, curveToolDefaults)

        this.terminate = terminate.bind(this)
        this.saveNodeType = saveNodeType.bind(this)
        this.getSelectionState = isHoverForInteractiveType("curves").bind(this)
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
        return CURVE_VARIANTS[name] ?? CURVE_VARIANTS.triangle
    }

    /**
     * Chốt hình đang vẽ với những neo đã đóng đinh — chỉ cho variant không định
     * trước số neo, và cần ít nhất ba neo vì một đa giác hai đỉnh là một đoạn thẳng.
     * Ứng dụng cũng gọi được để chốt từ một nút Done trên màn chạm.
     */
    finish(event, moreProps) {
        const current = this.#current
        if (this.#variantOf(this.#props.variant).count !== 0) return
        if (!isDefined(current) || !isDefined(current.points) || current.points.length < 3) return

        this.#complete(event, current.points, moreProps)
    }

    #complete(event, points, moreProps) {
        const newCurves = [
            ...this.#props.curves.map(each => ({ ...each, selected: false })),
            {
                points,
                variant: this.#props.variant,
                selected: true,
                appearance: this.#props.appearance,
            },
        ]

        this.setInteractiveState({ current: null, override: null })
        this.#props.onComplete?.(event, newCurves, moreProps)
    }

    #build() {
        const props = this.#props

        while (this.#wrappers.length > props.curves.length) this.#wrappers.pop().remove()
        while (this.#wrappers.length < props.curves.length) {
            const wrapper = document.createElement("chart-each-curve")
            this.#wrappers.push(wrapper)
            this.append(wrapper)
        }

        this.nodes = [...this.#wrappers]

        props.curves.forEach((each, index) => {
            const appearance = isDefined(each.appearance) ? { ...props.appearance, ...each.appearance } : props.appearance
            const variant = this.#variantOf(each.variant)

            Object.assign(this.#wrappers[index], {
                index,
                interactive: true,
                selected: each.selected,
                points: getValueFromOverride(this.#override, index, "points", each.points),
                mode: variant.mode,
                closed: variant.closed,
                appearance,
                hoverText: { ...curveToolDefaults.hoverText, ...props.hoverText },
                onDrag: this.#handleDragCurve,
                onDragComplete: this.#handleDragCurveComplete,
            })

            this.#wrappers[index].update()
        })

        // Hình tạm: các neo đã đóng đinh cộng con trỏ — cùng leaf, cùng hình học
        const drawing = isDefined(this.#current) && isDefined(this.#current.end)

        if (drawing && this.#temporary === null) {
            this.#temporary = document.createElement("chart-interactive-curve")
            this.append(this.#temporary)
        } else if (!drawing && this.#temporary !== null) {
            this.#temporary.remove()
            this.#temporary = null
        }

        if (drawing) {
            const variant = this.#variantOf(props.variant)
            Object.assign(this.#temporary, {
                points: [...this.#current.points, this.#current.end],
                mode: variant.mode,
                closed: variant.closed,
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
            onClick: this.#handleClick,
            onMouseMove: this.#handleDraw,
        })

        // Nhấp đúp chốt hình — chỉ có nghĩa với variant không định trước số neo;
        // `finish` tự bỏ qua các variant còn lại, nên nhấp đúp giữa chừng một tam
        // giác không chốt sớm một hình hai đỉnh.
        if (this.#listener === null) {
            this.#listener = document.createElement("chart-click-callback")
            this.append(this.#listener)
        }
        this.#listener.onDoubleClick = (event, moreProps) => {
            if (this.#props.enabled) this.finish(event, moreProps)
        }
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

        if (variant.count === 0 || current.points.length < variant.count - 1) {
            this.setInteractiveState({ current: { ...current, points: [...current.points, xyValue] } })
            return
        }

        this.#complete(event, [...current.points, xyValue], moreProps)
    }

    #handleDragCurve = (event, index, newValues) => {
        this.setInteractiveState({ override: { index, ...newValues } })
    }

    #handleDragCurveComplete = (event, moreProps) => {
        if (!isDefined(this.#override)) return

        const { index, points } = this.#override

        const newCurves = this.#props.curves.map((each, position) =>
            position === index ? { ...each, points, selected: true } : { ...each, selected: false },
        )

        this.setInteractiveState({ override: null })
        this.#props.onComplete?.(event, newCurves, moreProps)
    }
}

define("chart-curve-tool", CurveTool)
