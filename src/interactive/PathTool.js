import { isDefined, isNotDefined } from "../core/utils/index.js"
import { ElementBase, define, defineProperties, batched } from "../core/element.js"
import { getValueFromOverride, isHoverForInteractiveType, saveNodeType, terminate, toolChartId } from "./utils.js"

export const pathToolDefaults = {
    enabled: true,
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
    paths: [],
    appearance: {
        strokeStyle: "#000000",
        strokeWidth: 1,
        fillStyle: "rgba(138, 175, 226, 0.2)",
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
 * Free path: `<chart-path>`.
 *
 * Không có số đỉnh định trước — mỗi click đóng đinh một đỉnh, nhấp đúp chốt
 * hình (đỉnh cuối là chỗ nhấp). Ứng dụng cũng gọi được `finish()` để chốt —
 * cho những nơi không có nhấp đúp tử tế, như một nút Done trên màn chạm.
 * Thân dùng lại nguyên `chart-each-pattern`: path chỉ là pattern không bảng.
 */
export class PathTool extends ElementBase {
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
        this.#props = defineProperties(this, pathToolDefaults)

        this.terminate = terminate.bind(this)
        this.saveNodeType = saveNodeType.bind(this)
        this.getSelectionState = isHoverForInteractiveType("paths").bind(this)
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

    /** Chốt hình đang vẽ với những đỉnh đã đóng đinh — cần ít nhất hai. */
    finish(event, moreProps) {
        const current = this.#current
        if (!isDefined(current) || !isDefined(current.points) || current.points.length < 2) return

        const newPaths = [
            ...this.#props.paths.map(each => ({ ...each, selected: false })),
            { points: current.points, selected: true, appearance: this.#props.appearance },
        ]

        this.setInteractiveState({ current: null, override: null })
        this.#props.onComplete?.(event, newPaths, moreProps)
    }

    #build() {
        const props = this.#props

        while (this.#wrappers.length > props.paths.length) this.#wrappers.pop().remove()
        while (this.#wrappers.length < props.paths.length) {
            const wrapper = document.createElement("chart-each-pattern")
            this.#wrappers.push(wrapper)
            this.append(wrapper)
        }

        this.nodes = [...this.#wrappers]

        props.paths.forEach((each, index) => {
            const appearance = isDefined(each.appearance) ? { ...props.appearance, ...each.appearance } : props.appearance

            Object.assign(this.#wrappers[index], {
                index,
                interactive: true,
                selected: each.selected,
                points: getValueFromOverride(this.#override, index, "points", each.points),
                labels: [],
                fillTriangles: false,
                appearance,
                hoverText: { ...pathToolDefaults.hoverText, ...props.hoverText },
                onDrag: this.#handleDragPath,
                onDragComplete: this.#handleDragPathComplete,
            })

            this.#wrappers[index].update()
        })

        const drawing = isDefined(this.#current) && isDefined(this.#current.end)

        if (drawing && this.#temporary === null) {
            this.#temporary = document.createElement("chart-interactive-polyline")
            this.append(this.#temporary)
        } else if (!drawing && this.#temporary !== null) {
            this.#temporary.remove()
            this.#temporary = null
        }

        if (drawing)
            Object.assign(this.#temporary, {
                points: [...this.#current.points, this.#current.end],
                labels: [],
                fillTriangles: false,
                strokeStyle: props.appearance.strokeStyle,
                strokeWidth: props.appearance.strokeWidth,
                fillStyle: props.appearance.fillStyle,
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

        // Nhấp đúp chốt hình — click đầu của cặp đã đóng đinh đỉnh cuối rồi
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

    #handleClick = (event, xyValue) => {
        const current = this.#current
        if (!this.#mouseMoved || !isDefined(current) || !isDefined(current.points)) return
        this.setInteractiveState({ current: { ...current, points: [...current.points, xyValue] } })
    }

    #handleDragPath = (event, index, newValues) => {
        this.setInteractiveState({ override: { index, ...newValues } })
    }

    #handleDragPathComplete = (event, moreProps) => {
        if (!isDefined(this.#override)) return

        const { index, points } = this.#override

        const newPaths = this.#props.paths.map((each, position) =>
            position === index ? { ...each, points, selected: true } : { ...each, selected: false },
        )

        this.setInteractiveState({ override: null })
        this.#props.onComplete?.(event, newPaths, moreProps)
    }
}

define("chart-path", PathTool)
