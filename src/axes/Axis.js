import { range as d3Range, zip } from "d3-array"
import { forceCollide, forceSimulation, forceX } from "d3-force"
import { first, last, getStrokeDasharrayCanvas } from "../core/utils/index.js"

/**
 * Where each tick sits, and where its label goes.
 *
 * The one thing here that is not simple arithmetic: on a horizontal axis, labels are
 * pushed apart by a **force simulation**. Each tick is a body pulled towards its true
 * position and repelled from its neighbours, run for 100 steps. Dates do not fall at
 * even spacings — a month boundary lands wherever it lands — so evenly spaced ticks are
 * not an option, and simply dropping collisions would leave gaps. This nudges labels
 * aside instead, and only the label moves: `x1` stays on the real value, so the tick
 * mark still points at the right place even when its text has shifted.
 */
export const tickHelper = (props, scale) => {
    const {
        orient,
        innerTickSize = 4,
        tickFormat,
        tickPadding = 4,
        tickLabelFill,
        tickStrokeWidth,
        tickStrokeDasharray,
        fontSize = 12,
        fontFamily,
        fontWeight,
        showTicks,
        showTickLabel,
        ticks: tickArguments,
        tickValues: tickValuesProp,
        tickStrokeStyle,
        tickInterval,
        tickIntervalFunction,
        ...rest
    } = props

    let tickValues
    if (tickValuesProp !== undefined) {
        tickValues = typeof tickValuesProp === "function" ? tickValuesProp(scale.domain()) : tickValuesProp
    } else if (tickInterval !== undefined) {
        const [min, max] = scale.domain()
        const baseTickValues = d3Range(min, max, (max - min) / tickInterval)

        tickValues = tickIntervalFunction ? tickIntervalFunction(min, max, tickInterval) : baseTickValues
    } else if (scale.ticks !== undefined) {
        tickValues = scale.ticks(tickArguments)
    } else {
        tickValues = scale.domain()
    }

    const format = tickFormat === undefined ? scale.tickFormat(tickArguments) : value => tickFormat(value) || ""

    const sign = orient === "top" || orient === "left" ? -1 : 1
    const tickSpacing = Math.max(innerTickSize, 0) + tickPadding

    let ticks
    let dy
    let canvasDy
    let textAnchor

    if (orient === "bottom" || orient === "top") {
        dy = sign < 0 ? "0em" : ".71em"
        canvasDy = sign < 0 ? 0 : fontSize * 0.71
        textAnchor = "middle"

        const y2 = sign * innerTickSize
        const labelY = sign * tickSpacing

        ticks = tickValues.map(value => {
            const x = Math.round(scale(value))
            return { value, x1: x, y1: 0, x2: x, y2, labelX: x, labelY }
        })

        if (showTicks) {
            const nodes = ticks.map(tick => ({ id: tick.value, value: tick.value, fy: tick.y2, origX: tick.x1 }))

            const simulation = forceSimulation(nodes)
                .force("x", forceX(node => node.origX).strength(1))
                .force("collide", forceCollide(22))
                .stop()

            for (let i = 0; i < 100; ++i) simulation.tick()

            ticks = zip(ticks, nodes).map(([tick, node]) =>
                Math.abs(node.x - node.origX) > 0.01 ? { ...tick, x2: node.x, labelX: node.x } : tick,
            )
        }
    } else {
        ticks = tickValues.map(value => {
            const y = Math.round(scale(value))
            return {
                value,
                x1: 0,
                y1: y,
                x2: sign * innerTickSize,
                y2: y,
                labelX: sign * tickSpacing,
                labelY: y,
            }
        })

        dy = ".32em"
        canvasDy = fontSize * 0.32
        textAnchor = sign < 0 ? "end" : "start"
    }

    return {
        orient,
        ticks,
        scale,
        tickStrokeStyle,
        tickLabelFill: tickLabelFill || tickStrokeStyle,
        tickStrokeWidth,
        tickStrokeDasharray,
        dy,
        canvas_dy: canvasDy,
        textAnchor,
        fontSize,
        fontFamily,
        fontWeight,
        format,
        showTickLabel,
        ...rest,
    }
}

/** The axis line itself, with a turned-up tick at each end when `outerTickSize` is set. */
const drawAxisLine = (context, props, range) => {
    const { orient, outerTickSize, strokeStyle, strokeWidth } = props

    const sign = orient === "top" || orient === "left" ? -1 : 1
    const horizontal = orient === "bottom" || orient === "top"

    context.lineWidth = strokeWidth
    context.strokeStyle = strokeStyle

    context.beginPath()

    const firstPoint = first(range)
    const lastPoint = last(range)
    const tickSize = sign * outerTickSize

    if (horizontal) {
        context.moveTo(firstPoint, tickSize)
        context.lineTo(firstPoint, 0)
        context.lineTo(lastPoint, 0)
        context.lineTo(lastPoint, tickSize)
    } else {
        context.moveTo(tickSize, firstPoint)
        context.lineTo(0, firstPoint)
        context.lineTo(0, lastPoint)
        context.lineTo(tickSize, lastPoint)
    }

    context.stroke()
}

const drawEachTick = (context, tick, result) => {
    const { tickStrokeWidth, tickStrokeDasharray } = result

    context.beginPath()
    context.moveTo(tick.x1, tick.y1)
    context.lineTo(tick.x2, tick.y2)
    context.lineWidth = tickStrokeWidth
    context.setLineDash(getStrokeDasharrayCanvas(tickStrokeDasharray))
    context.stroke()
}

const drawTicks = (context, result) => {
    const { ticks, tickStrokeStyle } = result

    if (tickStrokeStyle !== undefined) {
        context.strokeStyle = tickStrokeStyle
        context.fillStyle = tickStrokeStyle
    }

    ticks.forEach(tick => drawEachTick(context, tick, result))
}

/** A gridline is a tick continued all the way across the pane. */
const drawGridLine = (context, tick, result, moreProps) => {
    const { orient, gridLinesStrokeWidth, gridLinesStrokeStyle, gridLinesStrokeDasharray } = result
    const { height, width } = moreProps.chartConfig

    if (gridLinesStrokeStyle !== undefined) context.strokeStyle = gridLinesStrokeStyle

    context.beginPath()

    const sign = orient === "top" || orient === "left" ? 1 : -1

    switch (orient) {
        case "top":
        case "bottom":
            context.moveTo(tick.x1, 0)
            context.lineTo(tick.x2, sign * height)
            break
        default:
            context.moveTo(0, tick.y1)
            context.lineTo(sign * width, tick.y2)
            break
    }

    context.lineWidth = gridLinesStrokeWidth
    context.setLineDash(getStrokeDasharrayCanvas(gridLinesStrokeDasharray))
    context.stroke()
}

const drawEachTickLabel = (context, tick, result) => {
    const { canvas_dy: canvasDy, format } = result

    context.beginPath()
    context.fillText(format(tick.value), tick.labelX, tick.labelY + canvasDy)
}

/** Draw a whole axis. Kept as a plain function so it can be checked without a DOM. */
export const drawAxis = (context, moreProps, props) => {
    const { showDomain, showGridLines, showTickLabel, showTicks, transform, range, getScale, tickLabelFill } = props

    context.save()
    context.translate(transform[0], transform[1])

    const scale = getScale(moreProps)
    const tickProps = tickHelper(props, scale)

    if (showTicks) drawTicks(context, tickProps)

    if (showGridLines) {
        tickProps.ticks.forEach(tick => drawGridLine(context, tick, tickProps, moreProps))
    }

    if (showTickLabel) {
        const { fontFamily, fontSize, fontWeight, textAnchor } = tickProps

        context.font = `${fontWeight} ${fontSize}px ${fontFamily}`
        if (tickLabelFill !== undefined) context.fillStyle = tickLabelFill
        context.textAlign = textAnchor === "middle" ? "center" : textAnchor

        tickProps.ticks.forEach(tick => drawEachTickLabel(context, tick, tickProps))
    }

    if (showDomain) drawAxisLine(context, props, range)

    context.restore()
}
