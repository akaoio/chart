import { hitSlop } from "../../core/utils/dom.js"
import { isNotDefined } from "../../core/utils/index.js"
import { GenericChartComponent } from "../../core/GenericChartComponent.js"
import { getMouseCanvas } from "../../core/GenericComponent.js"
import { defineProperties, define } from "../../core/element.js"

export const interactiveBarsPatternDefaults = {
    from: undefined,
    to: undefined,
    at: undefined,
    upStyle: "rgba(106, 185, 117, 0.6)",
    downStyle: "rgba(224, 122, 122, 0.6)",
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
 * A ghost copy of a run of bars (chart#5 cụm 4b — TV's Bars Pattern).
 *
 * The object keeps the SOURCE range (`from`, `to`) and one paste anchor (`at`) —
 * never the bars themselves: mini-candles are re-read from the rows on every draw,
 * shifted so the first source bar's open sits on the anchor. Move the anchor and the
 * ghost moves; change the data and the ghost tells the new truth. Computed once per
 * pass; draw and hit test read the same list.
 */
export const barsPatternCandles = (props, moreProps) => {
    const { from, to, at } = { ...interactiveBarsPatternDefaults, ...props }
    const {
        xScale,
        chartConfig: { yScale },
        xAccessor,
        fullData,
    } = moreProps

    if (isNotDefined(from) || isNotDefined(to) || isNotDefined(at) || !fullData?.length) return []

    const [left, right] = from <= to ? [from, to] : [to, from]
    const rows = fullData.filter(row => {
        const x = xAccessor(row)
        return x >= left && x <= right
    })
    if (rows.length === 0) return []

    const yOffset = at[1] - rows[0].open
    const half = rows.length > 1 ? (xScale(at[0] + 1) - xScale(at[0])) * 0.35 : 3

    return rows.map((row, index) => {
        const x = xScale(at[0] + index)
        return {
            x,
            half,
            up: row.close >= row.open,
            yOpen: yScale(row.open + yOffset),
            yClose: yScale(row.close + yOffset),
            yHigh: yScale(row.high + yOffset),
            yLow: yScale(row.low + yOffset),
        }
    })
}

export const drawInteractiveBarsPattern = (context, moreProps, props) => {
    const resolved = { ...interactiveBarsPatternDefaults, ...props }
    const candles = barsPatternCandles(resolved, moreProps)
    if (candles.length === 0) return

    for (const candle of candles) {
        const style = candle.up ? resolved.upStyle : resolved.downStyle
        context.strokeStyle = style
        context.fillStyle = style
        context.lineWidth = 1

        context.beginPath()
        context.moveTo(candle.x, candle.yHigh)
        context.lineTo(candle.x, candle.yLow)
        context.stroke()

        const top = Math.min(candle.yOpen, candle.yClose)
        const height = Math.max(1, Math.abs(candle.yClose - candle.yOpen))
        context.fillRect(candle.x - candle.half, top, candle.half * 2, height)
    }
}

/** Trúng trong hộp bao của bóng nến — bóng là một khối, không phải từng nến. */
export const isBarsPatternHover = (moreProps, props) => {
    const resolved = { ...interactiveBarsPatternDefaults, ...props }
    if (resolved.onHover === undefined) return false

    const candles = barsPatternCandles(resolved, moreProps)
    if (candles.length === 0) return false

    const {
        mouseXY: [x, y],
    } = moreProps
    const reach = resolved.tolerance + hitSlop(moreProps)

    let left = Infinity
    let right = -Infinity
    let top = Infinity
    let bottom = -Infinity
    for (const candle of candles) {
        if (candle.x - candle.half < left) left = candle.x - candle.half
        if (candle.x + candle.half > right) right = candle.x + candle.half
        if (candle.yHigh < top) top = candle.yHigh
        if (candle.yLow > bottom) bottom = candle.yLow
    }
    return x >= left - reach && x <= right + reach && y >= top - reach && y <= bottom + reach
}

/** A ghost of a bar run: source range + paste anchor, candles re-read from rows on each draw. */
export class InteractiveBarsPattern extends GenericChartComponent {
    #props

    constructor() {
        super()
        this.#props = defineProperties(this, interactiveBarsPatternDefaults)
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
        return isBarsPatternHover(moreProps, this.#props)
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
        drawInteractiveBarsPattern(context, moreProps, this.#props)
    }
}

define("chart-interactive-bars-pattern", InteractiveBarsPattern)
