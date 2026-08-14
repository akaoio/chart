import { hitSlop } from "../../core/utils/dom.js"
import { isNotDefined } from "../../core/utils/index.js"
import { GenericChartComponent } from "../../core/GenericChartComponent.js"
import { getMouseCanvas } from "../../core/GenericComponent.js"
import { defineProperties, define } from "../../core/element.js"

export const interactiveAnchoredVwapDefaults = {
    anchor: undefined,
    strokeStyle: "#000000",
    strokeWidth: 1,
    tolerance: 7,
    selected: false,
    interactiveCursorClass: undefined,
    onHover: undefined,
    onUnHover: undefined,
    onDragStart: undefined,
    onDrag: undefined,
    onDragComplete: undefined,
}

/**
 * The VWAP polyline from the anchor bar to the newest visible bar, in pixels.
 *
 * This is a DATA-READING drawing (chart#5 cụm 4): the object stores one anchor and
 * nothing else — every y on the line is recomputed from the rows themselves,
 * Σ(typical·volume)/Σ(volume) with typical = (high+low+close)/3, so the line is always
 * true to the data on screen, never a saved copy of it. Computed once per pass; draw
 * and hit test read the same list.
 */
export const anchoredVwapPoints = (props, moreProps) => {
    const { anchor } = { ...interactiveAnchoredVwapDefaults, ...props }
    const {
        xScale,
        chartConfig: { yScale },
        xAccessor,
        fullData,
        plotData,
    } = moreProps

    if (isNotDefined(anchor) || !fullData?.length || !plotData?.length) return []

    const anchorX = anchor[0]
    const lastVisible = xAccessor(plotData[plotData.length - 1])

    const points = []
    let priceVolume = 0
    let totalVolume = 0
    for (const row of fullData) {
        const x = xAccessor(row)
        if (x < anchorX) continue
        if (x > lastVisible) break
        const typical = (row.high + row.low + row.close) / 3
        const volume = row.volume ?? 0
        priceVolume += typical * volume
        totalVolume += volume
        const vwap = totalVolume > 0 ? priceVolume / totalVolume : typical
        points.push([xScale(x), yScale(vwap)])
    }
    return points
}

export const drawInteractiveAnchoredVwap = (context, moreProps, props) => {
    const resolved = { ...interactiveAnchoredVwapDefaults, ...props }
    const points = anchoredVwapPoints(resolved, moreProps)
    if (points.length < 2) return

    context.lineWidth = resolved.strokeWidth
    context.strokeStyle = resolved.strokeStyle
    context.beginPath()
    context.moveTo(points[0][0], points[0][1])
    for (const [x, y] of points.slice(1)) context.lineTo(x, y)
    context.stroke()
}

export const isAnchoredVwapHover = (moreProps, props) => {
    const resolved = { ...interactiveAnchoredVwapDefaults, ...props }
    if (resolved.onHover === undefined) return false

    const points = anchoredVwapPoints(resolved, moreProps)
    if (points.length < 2) return false

    const {
        mouseXY: [x, y],
    } = moreProps
    const reach = resolved.tolerance + hitSlop(moreProps)

    for (let i = 1; i < points.length; i++) {
        const [x1, y1] = points[i - 1]
        const [x2, y2] = points[i]
        if (x < Math.min(x1, x2) - reach || x > Math.max(x1, x2) + reach) continue
        const t = Math.max(0, Math.min(1, ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / ((x2 - x1) ** 2 + (y2 - y1) ** 2 || 1)))
        if (Math.hypot(x - (x1 + t * (x2 - x1)), y - (y1 + t * (y2 - y1))) <= reach) return true
    }
    return false
}

/** An anchored VWAP: one data anchor, every y recomputed from the rows on each draw. */
export class InteractiveAnchoredVwap extends GenericChartComponent {
    #props

    constructor() {
        super()
        this.#props = defineProperties(this, interactiveAnchoredVwapDefaults)
    }

    get drawOn() {
        return ["mousemove", "pan", "drag"]
    }

    get selected() {
        return this.#props.selected
    }

    get interactiveCursorClass() {
        return this.#props.interactiveCursorClass
    }

    canvasToDraw(contexts) {
        return getMouseCanvas(contexts)
    }

    isHoverTest(moreProps) {
        return isAnchoredVwapHover(moreProps, this.#props)
    }

    onHover(event, moreProps) {
        this.#props.onHover?.(event, moreProps)
    }
    onUnHover(event, moreProps) {
        this.#props.onUnHover?.(event, moreProps)
    }
    onDragStart(event, moreProps) {
        this.#props.onDragStart?.(event, moreProps)
    }
    onDrag(event, moreProps) {
        this.#props.onDrag?.(event, moreProps)
    }
    onDragComplete(event, moreProps) {
        this.#props.onDragComplete?.(event, moreProps)
    }

    canvasDraw(context, moreProps) {
        drawInteractiveAnchoredVwap(context, moreProps, this.#props)
    }
}

define("chart-interactive-anchored-vwap", InteractiveAnchoredVwap)
