import { hitSlop } from "../../core/utils/dom.js"
import { isNotDefined } from "../../core/utils/index.js"
import { GenericChartComponent } from "../../core/GenericChartComponent.js"
import { getMouseCanvas } from "../../core/GenericComponent.js"
import { defineProperties, define } from "../../core/element.js"

export const interactiveBarsPatternDefaults = {
    mode: "copy",
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
 * Bộ sinh số tất định, gieo từ một số nguyên.
 *
 * Ghost feed phải cho **cùng một bóng ở mọi lần vẽ**: `Math.random()` làm bóng
 * nhấp nháy mỗi lần chuột đi qua, và một hình đổi dáng khi bạn nhìn nó thì không
 * đọc được. Nên hạt giống lấy từ chính ba cái neo — dời neo là một bóng khác,
 * đứng yên là bóng cũ. Băm theo kiểu xorshift-multiply của MurmurHash3.
 */
const seeded = seed => {
    let state = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) >>> 0
    return () => {
        state = (Math.imul(state ^ (state >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) >>> 0
        return state / 4_294_967_296
    }
}

/**
 * Ghost feed: xáo lại chính những bước giá của dải nguồn, rồi nối đuôi nhau.
 *
 * TradingView's Ghost Feed dựng nến GIẢ mang tính cách của một dải thật — nên
 * cái được giữ là hình dạng từng nến (mở→đóng, râu trên, râu dưới) so với giá mở
 * của nó, còn thứ tự thì xáo. Bóng vì thế "trông như" dữ liệu nguồn mà không
 * phải là bản chép của nó, và đó chính là chỗ nó khác `mode: "copy"`.
 *
 * Không có số nào bịa ra từ hư không: mọi bước giá đều là bước đã xảy ra thật.
 */
const ghostRows = (rows, seed) => {
    const shapes = rows.map(row => ({
        move: row.close - row.open,
        up: row.high - Math.max(row.open, row.close),
        down: Math.min(row.open, row.close) - row.low,
    }))

    // Fisher–Yates với bộ sinh tất định — xáo tại chỗ trên bản sao
    const random = seeded(seed)
    const order = shapes.map((shape, index) => index)
    for (let index = order.length - 1; index > 0; index--) {
        const pick = Math.floor(random() * (index + 1))
        ;[order[index], order[pick]] = [order[pick], order[index]]
    }

    let open = rows[0].open
    return order.map(which => {
        const shape = shapes[which]
        const close = open + shape.move
        const row = {
            open,
            close,
            high: Math.max(open, close) + shape.up,
            low: Math.min(open, close) - shape.down,
        }
        open = close
        return row
    })
}

/**
 * A ghost copy of a run of bars (chart#5 cụm 4b — TV's Bars Pattern), and its
 * synthetic sibling (`mode: "ghost"` — TV's Ghost Feed).
 *
 * The object keeps the SOURCE range (`from`, `to`) and one paste anchor (`at`) —
 * never the bars themselves: mini-candles are re-read from the rows on every draw,
 * shifted so the first source bar's open sits on the anchor. Move the anchor and the
 * ghost moves; change the data and the ghost tells the new truth. Computed once per
 * pass; draw and hit test read the same list.
 */
export const barsPatternCandles = (props, moreProps) => {
    const { mode, from, to, at } = { ...interactiveBarsPatternDefaults, ...props }
    const {
        xScale,
        chartConfig: { yScale },
        xAccessor,
        fullData,
    } = moreProps

    if (isNotDefined(from) || isNotDefined(to) || isNotDefined(at) || !fullData?.length) return []

    const [left, right] = from <= to ? [from, to] : [to, from]
    const source = fullData.filter(row => {
        const x = xAccessor(row)
        return x >= left && x <= right
    })
    if (source.length === 0) return []

    // Hạt giống là ba cái neo: bóng đứng yên khi không ai đụng vào, đổi khi có
    const rows = mode === "ghost" ? ghostRows(source, Math.round(left * 73_856_093 + right * 19_349_663 + at[0] * 83_492_791)) : source

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
