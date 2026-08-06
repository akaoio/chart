import { isDefined, isNotDefined } from "../core/utils/index.js"
import { ElementBase, define, defineProperties, batched } from "../core/element.js"
import { getValueFromOverride, isHoverForInteractiveType, saveNodeType, terminate, toolChartId } from "./utils.js"

export const freehandDefaults = {
    enabled: true,
    mode: "brush",
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
    strokes: [],
    appearance: {
        strokeStyle: "#000000",
        strokeWidth: 2,
        highlighterWidth: 14,
        highlighterOpacity: 0.35,
    },
}

/** Nét dài vô hạn thì treo tab — 2000 điểm sau lược là quá đủ cho một đường tay. */
const MOST_POINTS = 2000

/**
 * Freehand: `<chart-freehand>`.
 *
 * Đè xuống là mở nét, rê tới đâu điểm ghi tới đó, nhả ra là chốt. Không cần
 * sửa EventCapture: công cụ đang bật đã phủ quyết pan, nên không cử chỉ nào
 * chiếm chuỗi kéo — mousemove/touchmove vẫn chảy về indicator giữa lúc đè,
 * và cú nhả (mouseup, hay touchend có di chuyển) phát ra `onClick`. Đúng bộ
 * ba callback mọi công cụ hai-bấm vẫn dùng, chỉ khác điều được ghi lại.
 *
 * Điểm được lược theo pixel (cách điểm trước ≥ 3px mới ghi) — nét mượt mà
 * danh sách không phình theo tốc độ phát sự kiện của chuột.
 */
export class Freehand extends ElementBase {
    #props
    #current = null
    #override = null

    #wrappers = []
    #temporary = null
    #indicator = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, freehandDefaults)

        this.terminate = terminate.bind(this)
        this.saveNodeType = saveNodeType.bind(this)
        this.getSelectionState = isHoverForInteractiveType("strokes").bind(this)
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

        while (this.#wrappers.length > props.strokes.length) this.#wrappers.pop().remove()
        while (this.#wrappers.length < props.strokes.length) {
            const wrapper = document.createElement("chart-each-freehand")
            this.#wrappers.push(wrapper)
            this.append(wrapper)
        }

        this.nodes = [...this.#wrappers]

        props.strokes.forEach((each, index) => {
            const appearance = isDefined(each.appearance) ? { ...props.appearance, ...each.appearance } : props.appearance

            Object.assign(this.#wrappers[index], {
                index,
                interactive: true,
                selected: each.selected,
                points: getValueFromOverride(this.#override, index, "points", each.points),
                mode: each.mode ?? props.mode,
                appearance,
                hoverText: { ...freehandDefaults.hoverText, ...props.hoverText },
                onDrag: this.#handleDragStroke,
                onDragComplete: this.#handleDragStrokeComplete,
            })

            this.#wrappers[index].update()
        })

        // Nét đang vẽ: hiện ngay từng đoạn theo con trỏ
        const drawing = isDefined(this.#current) && this.#current.points.length > 1

        if (drawing && this.#temporary === null) {
            this.#temporary = document.createElement("chart-interactive-freehand")
            this.append(this.#temporary)
        } else if (!drawing && this.#temporary !== null) {
            this.#temporary.remove()
            this.#temporary = null
        }

        if (drawing)
            Object.assign(this.#temporary, {
                points: this.#current.points,
                mode: props.mode,
                strokeStyle: props.appearance.strokeStyle,
                strokeWidth: props.appearance.strokeWidth,
                highlighterWidth: props.appearance.highlighterWidth,
                highlighterOpacity: props.appearance.highlighterOpacity,
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
            onClick: this.#handleEnd,
            onMouseMove: this.#handleDraw,
        })
    }

    /** Đè xuống là mở nét — điểm đầu ghi ngay. */
    #handleStart = (event, xyValue, moreProps) => {
        if (isNotDefined(this.#current)) {
            this.setInteractiveState({ current: { points: [xyValue], last: moreProps.mouseXY } })
            this.#props.onStart?.(event, moreProps)
        }
    }

    /** Rê tới đâu ghi tới đó, lược theo pixel để nét không phình. */
    #handleDraw = (event, xyValue, moreProps) => {
        if (isNotDefined(this.#current)) return
        if (this.#current.points.length >= MOST_POINTS) return

        const { mouseXY } = moreProps
        const [lastX, lastY] = this.#current.last
        if (Math.hypot(mouseXY[0] - lastX, mouseXY[1] - lastY) < 3) return

        this.setInteractiveState({
            current: { points: [...this.#current.points, xyValue], last: mouseXY },
        })
    }

    /** Nhả ra là chốt — nét phải có ít nhất hai điểm mới là một nét. */
    #handleEnd = (event, xyValue, moreProps) => {
        if (isNotDefined(this.#current)) return

        const points = this.#current.points
        if (points.length < 2) {
            this.setInteractiveState({ current: null })
            return
        }

        const newStrokes = [
            ...this.#props.strokes.map(each => ({ ...each, selected: false })),
            { points, mode: this.#props.mode, selected: true, appearance: this.#props.appearance },
        ]

        this.setInteractiveState({ current: null, override: null })
        this.#props.onComplete?.(event, newStrokes, moreProps)
    }

    #handleDragStroke = (event, index, newValues) => {
        this.setInteractiveState({ override: { index, ...newValues } })
    }

    #handleDragStrokeComplete = (event, moreProps) => {
        if (!isDefined(this.#override)) return

        const { index, points } = this.#override

        const newStrokes = this.#props.strokes.map((each, position) =>
            position === index ? { ...each, points, selected: true } : { ...each, selected: false },
        )

        this.setInteractiveState({ override: null })
        this.#props.onComplete?.(event, newStrokes, moreProps)
    }
}

define("chart-freehand", Freehand)
