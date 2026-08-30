import { isDefined, isNotDefined } from "../core/utils/index.js"
import { ElementBase, define, defineProperties, batched } from "../core/element.js"
import { getValueFromOverride, isHoverForInteractiveType, saveNodeType, terminate, toolChartId } from "./utils.js"

/**
 * Tỉ lệ Fibonacci, không phải chỉ số Fibonacci.
 *
 * `chart-fib-time-zone` chiếu dãy SỐ Fibonacci (0, 1, 2, 3, 5, 8…) vì đơn vị của
 * nó là một nến; cái này chiếu TỈ LỆ của một xu hướng đã đo, nên bảng là
 * 0.618 / 1 / 1.618 / 2.618 / 4.236 — cùng bảng mà fib extension dùng cho giá,
 * chỉ đổi trục. Hai bảng khác nhau vì hai đại lượng khác nhau, không phải vì
 * quên đồng bộ.
 */
export const FIB_TIME_RATIOS = [0, 0.382, 0.618, 1, 1.618, 2.618, 4.236]

export const fibTimeExtensionDefaults = {
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
    extensions: [],
    ratios: FIB_TIME_RATIOS,
    appearance: {
        strokeStyle: "#000000",
        strokeWidth: 1,
        edgeStroke: "#000000",
        edgeFill: "#FFFFFF",
        edgeStrokeWidth: 1,
        r: 5,
    },
}

/**
 * Trend-based fib time: `<chart-fib-time-extension>`.
 *
 * Ba cú bấm: hai neo đầu đo một đơn vị thời gian TRÊN XU HƯỚNG, neo thứ ba là
 * gốc chiếu — vạch dọc tại `origin + tỉ lệ × đơn vị`. Đó đúng là chỗ nó khác
 * `chart-fib-time-zone`, vốn neo MỘT chỗ và chiếu từ chính chỗ ấy; issue #34 gọi
 * tên khác biệt này là "chưa có phần tử nào chiếu mức fib lên trục thời gian
 * theo xu hướng".
 *
 * Không có leaf mới: `chart-interactive-cycles` học thêm một gốc chiếu `x3Value`,
 * và vắng nó thì mọi thứ cũ vẽ y như trước.
 */
export class FibTimeExtension extends ElementBase {
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
        this.#props = defineProperties(this, fibTimeExtensionDefaults)

        this.terminate = terminate.bind(this)
        this.saveNodeType = saveNodeType.bind(this)
        this.getSelectionState = isHoverForInteractiveType("extensions").bind(this)
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

        while (this.#wrappers.length > props.extensions.length) this.#wrappers.pop().remove()
        while (this.#wrappers.length < props.extensions.length) {
            const wrapper = document.createElement("chart-each-fib-time-extension")
            this.#wrappers.push(wrapper)
            this.append(wrapper)
        }

        this.nodes = [...this.#wrappers]

        props.extensions.forEach((each, index) => {
            const appearance = isDefined(each.appearance) ? { ...props.appearance, ...each.appearance } : props.appearance

            Object.assign(this.#wrappers[index], {
                index,
                interactive: true,
                selected: each.selected,
                points: getValueFromOverride(this.#override, index, "points", each.points),
                ratios: each.ratios ?? props.ratios,
                appearance,
                hoverText: { ...fibTimeExtensionDefaults.hoverText, ...props.hoverText },
                onDrag: this.#handleDragExtension,
                onDragComplete: this.#handleDragExtensionComplete,
            })

            this.#wrappers[index].update()
        })

        // Hình tạm: hai neo đầu đã đủ để thấy đơn vị; gốc chiếu tạm là chính neo đầu,
        // nên trước cú bấm thứ ba nó trông đúng như một fib time zone — và cú bấm thứ
        // ba dời cả bộ sang gốc mới.
        const drawing = isDefined(this.#current) && isDefined(this.#current.end)

        if (drawing && this.#temporary === null) {
            this.#temporary = document.createElement("chart-interactive-cycles")
            this.append(this.#temporary)
        } else if (!drawing && this.#temporary !== null) {
            this.#temporary.remove()
            this.#temporary = null
        }

        if (drawing) {
            const points = [...this.#current.points, this.#current.end]
            Object.assign(this.#temporary, {
                offsets: props.ratios,
                x1Value: points[0][0],
                y1Value: points[0][1],
                x2Value: points[1][0],
                y2Value: points[1][1],
                x3Value: points[2]?.[0],
                strokeStyle: props.appearance.strokeStyle,
                strokeWidth: props.appearance.strokeWidth,
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

    /** Bấm hai lần đóng đinh hai neo đơn vị, lần thứ ba đặt gốc chiếu và chốt. */
    #handleClick = (event, xyValue, moreProps) => {
        const current = this.#current
        if (!this.#mouseMoved || !isDefined(current) || !isDefined(current.points)) return

        if (current.points.length < 2) {
            this.setInteractiveState({ current: { ...current, points: [...current.points, xyValue] } })
            return
        }

        const newExtensions = [
            ...this.#props.extensions.map(each => ({ ...each, selected: false })),
            {
                points: [...current.points, xyValue],
                selected: true,
                appearance: this.#props.appearance,
            },
        ]

        this.setInteractiveState({ current: null, override: null })
        this.#props.onComplete?.(event, newExtensions, moreProps)
    }

    #handleDragExtension = (event, index, newValues) => {
        this.setInteractiveState({ override: { index, ...newValues } })
    }

    #handleDragExtensionComplete = (event, moreProps) => {
        if (!isDefined(this.#override)) return

        const { index, points } = this.#override

        const newExtensions = this.#props.extensions.map((each, position) =>
            position === index ? { ...each, points, selected: true } : { ...each, selected: false },
        )

        this.setInteractiveState({ override: null })
        this.#props.onComplete?.(event, newExtensions, moreProps)
    }
}

define("chart-fib-time-extension", FibTimeExtension)
