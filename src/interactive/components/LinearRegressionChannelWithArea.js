import { deviation, sum, zip } from "d3-array"
import { getClosestItemIndexes } from "../../core/utils/index.js"
import { GenericChartComponent } from "../../core/GenericChartComponent.js"
import { getMouseCanvas } from "../../core/GenericComponent.js"
import { defineProperties, define } from "../../core/element.js"
import { isHovering2 } from "./InteractiveStraightLine.js"

export const linearRegressionChannelDefaults = {
    type: "SD",
    strokeWidth: 1,
    tolerance: 4,
    selected: false,
    x1Value: undefined,
    x2Value: undefined,
    strokeStyle: undefined,
    fillStyle: undefined,
    interactiveCursorClass: undefined,
    onHover: undefined,
    onUnHover: undefined,
    onDragStart: undefined,
    onDrag: undefined,
    onDragComplete: undefined,
}

/**
 * Least-squares fit through the closes between two x values, with a band either side.
 *
 * Unlike every other drawing tool this one **computes its own shape from the data** — the
 * user picks a range, not a line. Drag an end and the whole fit is redone, which is the
 * point: it answers "what was the trend over this period", not "where did I draw".
 *
 * The band is one standard deviation of the closes about that fit (`type: "SD"`), so it
 * widens where price was scattered and narrows where it hugged the trend.
 */
export const regressionGeometry = (props, moreProps) => {
    const { x1Value, x2Value, type } = props
    const {
        xScale,
        chartConfig: { yScale },
        fullData,
        xAccessor,
    } = moreProps

    const { left } = getClosestItemIndexes(fullData, x1Value, xAccessor)
    const { right } = getClosestItemIndexes(fullData, x2Value, xAccessor)

    const array = fullData.slice(Math.min(left, right), Math.max(left, right) + 1)

    const xs = array.map(datum => xAccessor(datum).valueOf())
    const ys = array.map(datum => datum.close)
    const n = array.length

    const xys = zip(xs, ys).map(pair => pair[0] * pair[1])
    const xSquareds = xs.map(x => Math.pow(x, 2))

    const b = (n * sum(xys) - sum(xs) * sum(ys)) / (n * sum(xSquareds) - Math.pow(sum(xs), 2))
    const a = (sum(ys) - b * sum(xs)) / n

    const newY1 = a + b * x1Value
    const newY2 = a + b * x2Value

    const y1 = yScale(newY1)
    const stdDev = type === "SD" ? deviation(array, datum => datum.close) : 0

    return {
        x1: xScale(x1Value),
        y1,
        x2: xScale(x2Value),
        y2: yScale(newY2),
        dy: yScale(newY1 - stdDev) - y1,
    }
}

export const drawLinearRegressionChannel = (context, moreProps, props) => {
    const resolved = { ...linearRegressionChannelDefaults, ...props }
    const { strokeStyle, strokeWidth, fillStyle } = resolved
    const { x1, y1, x2, y2, dy } = regressionGeometry(resolved, moreProps)

    context.lineWidth = strokeWidth
    context.strokeStyle = strokeStyle
    context.fillStyle = fillStyle

    context.beginPath()
    context.moveTo(x1, y1 - dy)
    context.lineTo(x2, y2 - dy)
    context.stroke()

    context.beginPath()
    context.moveTo(x2, y2 + dy)
    context.lineTo(x1, y1 + dy)
    context.stroke()

    context.beginPath()
    context.moveTo(x1, y1 - dy)
    context.lineTo(x2, y2 - dy)
    context.lineTo(x2, y2 + dy)
    context.lineTo(x1, y1 + dy)
    context.closePath()
    context.fill()

    // the fitted line itself, drawn last so it sits over the band
    context.beginPath()
    context.moveTo(x2, y2)
    context.lineTo(x1, y1)
    context.stroke()
}

/** Any of the three lines counts as a hit. */
export const isRegressionHover = (moreProps, props) => {
    const resolved = { ...linearRegressionChannelDefaults, ...props }
    const { tolerance, onHover } = resolved
    if (onHover === undefined) return false

    const { mouseXY } = moreProps
    const { x1, y1, x2, y2, dy } = regressionGeometry(resolved, moreProps)

    return [-dy, 0, dy].reduce(
        (result, offset) => result || isHovering2([x1, y1 + offset], [x2, y2 + offset], mouseXY, tolerance),
        false,
    )
}

export const edge1Provider = props => moreProps => {
    const { x1, y1 } = regressionGeometry({ ...linearRegressionChannelDefaults, ...props }, moreProps)
    return [x1, y1]
}

export const edge2Provider = props => moreProps => {
    const { x2, y2 } = regressionGeometry({ ...linearRegressionChannelDefaults, ...props }, moreProps)
    return [x2, y2]
}

/** A least-squares fit through the closes between two x values, with a band either side. */
export class LinearRegressionChannelWithArea extends GenericChartComponent {
    #props

    constructor() {
        super()
        this.#props = defineProperties(this, linearRegressionChannelDefaults)
    }

    get drawOn() {
        return ["mousemove", "mouseleave", "pan", "drag"]
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
        return isRegressionHover(moreProps, this.#props)
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
        drawLinearRegressionChannel(context, moreProps, this.#props)
    }
}

define("chart-linear-regression-channel", LinearRegressionChannelWithArea)
