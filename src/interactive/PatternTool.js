import { isDefined, isNotDefined } from "../core/utils/index.js"
import { ElementBase, define, defineProperties, batched } from "../core/element.js"
import { getValueFromOverride, isHoverForInteractiveType, saveNodeType, terminate, toolChartId } from "./utils.js"

/**
 * Mỗi variant là một mẫu hình TradingView: bao nhiêu đỉnh, đỉnh tên gì, có
 * fill tam giác kiểu harmonic không. Máy trạng thái đặt-n-điểm là MỘT — bảng
 * này là toàn bộ chỗ khác nhau.
 */
export const PATTERN_VARIANTS = {
    xabcd: { count: 5, labels: ["X", "A", "B", "C", "D"], fillTriangles: true },
    cypher: { count: 5, labels: ["X", "A", "B", "C", "D"], fillTriangles: true },
    abcd: { count: 4, labels: ["A", "B", "C", "D"], fillTriangles: false },
    triangle: { count: 4, labels: ["A", "B", "C", "D"], fillTriangles: false },
    threedrives: { count: 7, labels: ["0", "1", "A", "2", "B", "3", "C"], fillTriangles: false },
    headshoulders: { count: 7, labels: ["", "L", "", "H", "", "R", ""], fillTriangles: false },
    elliottImpulse: { count: 6, labels: ["0", "1", "2", "3", "4", "5"], fillTriangles: false },
    elliottCorrection: { count: 4, labels: ["0", "A", "B", "C"], fillTriangles: false },
    elliottTriangle: { count: 6, labels: ["0", "A", "B", "C", "D", "E"], fillTriangles: false },
}

export const patternToolDefaults = {
    enabled: true,
    variant: "xabcd",
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
    patterns: [],
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
 * Pattern tools: `<chart-pattern>`.
 *
 * The n-click placement frame: each click pins a vertex, the polyline follows
 * the pointer in between, and the shape completes when the variant's count is
 * reached. XABCD, Cypher, ABCD, triangle, three drives, head-and-shoulders
 * and the Elliott waves are all this one machine with different tables.
 */
export class PatternTool extends ElementBase {
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
        this.#props = defineProperties(this, patternToolDefaults)

        this.terminate = terminate.bind(this)
        this.saveNodeType = saveNodeType.bind(this)
        this.getSelectionState = isHoverForInteractiveType("patterns").bind(this)
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
        return PATTERN_VARIANTS[name] ?? PATTERN_VARIANTS.xabcd
    }

    #build() {
        const props = this.#props

        while (this.#wrappers.length > props.patterns.length) this.#wrappers.pop().remove()
        while (this.#wrappers.length < props.patterns.length) {
            const wrapper = document.createElement("chart-each-pattern")
            this.#wrappers.push(wrapper)
            this.append(wrapper)
        }

        this.nodes = [...this.#wrappers]

        props.patterns.forEach((each, index) => {
            const appearance = isDefined(each.appearance) ? { ...props.appearance, ...each.appearance } : props.appearance
            const variant = this.#variantOf(each.variant)

            Object.assign(this.#wrappers[index], {
                index,
                interactive: true,
                selected: each.selected,
                points: getValueFromOverride(this.#override, index, "points", each.points),
                labels: variant.labels,
                fillTriangles: variant.fillTriangles,
                appearance,
                hoverText: { ...patternToolDefaults.hoverText, ...props.hoverText },
                onDrag: this.#handleDragPattern,
                onDragComplete: this.#handleDragPatternComplete,
            })

            this.#wrappers[index].update()
        })

        // Hình tạm: đường gấp khúc qua các đỉnh đã đóng đinh, đỉnh kế bám con trỏ
        const drawing = isDefined(this.#current) && isDefined(this.#current.end)

        if (drawing && this.#temporary === null) {
            this.#temporary = document.createElement("chart-interactive-polyline")
            this.append(this.#temporary)
        } else if (!drawing && this.#temporary !== null) {
            this.#temporary.remove()
            this.#temporary = null
        }

        if (drawing) {
            const variant = this.#variantOf(props.variant)
            const points = [...this.#current.points, this.#current.end]
            Object.assign(this.#temporary, {
                points,
                labels: variant.labels.slice(0, points.length),
                fillTriangles: variant.fillTriangles,
                strokeStyle: props.appearance.strokeStyle,
                strokeWidth: props.appearance.strokeWidth,
                fillStyle: props.appearance.fillStyle,
                fontFamily: props.appearance.fontFamily,
                fontSize: props.appearance.fontSize,
                fontFill: props.appearance.fontFill,
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

    /** Mỗi click đóng đinh một đỉnh; đủ số đỉnh của variant thì hoàn thành. */
    #handleClick = (event, xyValue, moreProps) => {
        const current = this.#current
        if (!this.#mouseMoved || !isDefined(current) || !isDefined(current.points)) return

        const variant = this.#variantOf(this.#props.variant)

        if (current.points.length < variant.count - 1) {
            this.setInteractiveState({ current: { ...current, points: [...current.points, xyValue] } })
            return
        }

        const newPatterns = [
            ...this.#props.patterns.map(each => ({ ...each, selected: false })),
            {
                points: [...current.points, xyValue],
                variant: this.#props.variant,
                selected: true,
                appearance: this.#props.appearance,
            },
        ]

        this.setInteractiveState({ current: null, override: null })
        this.#props.onComplete?.(event, newPatterns, moreProps)
    }

    #handleDragPattern = (event, index, newValues) => {
        this.setInteractiveState({ override: { index, ...newValues } })
    }

    #handleDragPatternComplete = (event, moreProps) => {
        if (!isDefined(this.#override)) return

        const { index, points } = this.#override

        const newPatterns = this.#props.patterns.map((each, position) =>
            position === index ? { ...each, points, selected: true } : { ...each, selected: false },
        )

        this.setInteractiveState({ override: null })
        this.#props.onComplete?.(event, newPatterns, moreProps)
    }
}

define("chart-pattern", PatternTool)
