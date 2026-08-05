import { group, merge } from "d3-array"
import { stack as d3Stack } from "d3-shape"
import { functor, head, identity, plotDataLengthBarWidth, withDefaults } from "../core/utils/index.js"
import { Series } from "./Series.js"
import { define } from "../core/element.js"

export const stackedBarSeriesDefaults = {
    baseAt: (xScale, yScale) => head(yScale.range()),
    direction: "up",
    stroke: false,
    fillStyle: "rgba(70, 130, 180, 0.5)",
    width: plotDataLengthBarWidth,
    widthRatio: 0.8,
    clip: true,
    swapScales: false,
    spaceBetweenBar: 0,
    yAccessor: undefined,
}

/**
 * A stand-in for `d3.stack` that does not stack.
 *
 * Same shape of output, but every series starts at zero instead of on top of the one
 * before. That is what lets one code path serve stacked bars, grouped bars and plain
 * bars — only the stacking function changes.
 */
export function identityStack() {
    let keys = []

    function stack(data) {
        return keys.map((key, index) => {
            const arrays = data.map(datum => {
                const array = [0, datum[key]]
                array.data = datum
                return array
            })
            arrays.key = key
            arrays.index = index
            return arrays
        })
    }

    stack.keys = function (value) {
        if (!arguments.length) return keys
        keys = value
        return stack
    }

    return stack
}

/** Swap x and y so the same bars can be drawn sideways. */
export const rotateXY = array =>
    array.map(each => ({ ...each, x: each.y, y: each.x, height: each.width, width: each.height }))

export const drawOnCanvas2 = (props, context, bars) => {
    const { stroke } = props

    group(bars, bar => bar.fillStyle).forEach((values, key) => {
        if (head(values).width > 1 && key !== undefined) context.strokeStyle = key

        context.fillStyle = key

        values.forEach(bar => {
            if (bar.width <= 1) {
                context.fillRect(bar.x - 0.5, bar.y, 1, bar.height)
            } else {
                context.fillRect(bar.x + 0.5, bar.y + 0.5, bar.width, bar.height)
                if (stroke) context.strokeRect(bar.x, bar.y, bar.width, bar.height)
            }
        })
    })
}

/**
 * Lay out one bar per accessor per datum.
 *
 * Every bar carries both its stacked geometry and the numbers a grouped layout would
 * need (`groupOffset`, `groupWidth`), so `GroupedBarSeries` can rearrange them afterwards
 * without redoing the work.
 */
export function getStackedBars(props, xAccessor, yAccessor, xScale, yScale, plotData, stack = identityStack, after = identity) {
    const { baseAt, fillStyle, stroke, spaceBetweenBar = 0 } = props

    const getFill = functor(fillStyle)
    const getBase = functor(baseAt)

    const width = functor(props.width)(props, { xScale, xAccessor, plotData })
    const barWidth = Math.round(width)
    const eachBarWidth = (barWidth - spaceBetweenBar * (yAccessor.length - 1)) / yAccessor.length
    const offset = barWidth === 1 ? 0 : 0.5 * width

    const rows = plotData.map(each => {
        const row = { appearance: {}, x: xAccessor(each) }

        yAccessor.forEach((eachYAccessor, index) => {
            const key = `y${index}`
            row[key] = eachYAccessor(each)
            row.appearance[key] = {
                stroke: stroke ? getFill(each, index) : "none",
                fillStyle: getFill(each, index),
            }
        })

        return row
    })

    const keys = yAccessor.map((_, index) => `y${index}`)
    const data = stack().keys(keys)(rows)

    const newData = data.map((each, index) => {
        const { key } = each
        return each.map(datum => {
            const array = [datum[0], datum[1]]
            array.data = { x: datum.data.x, i: index, appearance: datum.data.appearance[key] }
            return array
        })
    })

    const bars = merge(newData)
        .map(datum => {
            let y = yScale(datum[1])
            let height = getBase(xScale, yScale, datum.data) - yScale(datum[1] - datum[0])

            if (height < 0) {
                y = y + height
                height = -height
            }

            return {
                ...datum.data.appearance,
                x: Math.round(xScale(datum.data.x) - width / 2),
                y,
                groupOffset: Math.round(offset - (datum.data.i > 0 ? (eachBarWidth + spaceBetweenBar) * datum.data.i : 0)),
                groupWidth: Math.round(eachBarWidth),
                offset: Math.round(offset),
                height,
                width: barWidth,
            }
        })
        .filter(bar => !isNaN(bar.y))

    return after(bars)
}

const convertToArray = item => (Array.isArray(item) ? item : [item])

/** Shared entry point: `swapScales` decides which axis the bars grow along. */
export function drawOnCanvasHelper(
    context,
    props,
    moreProps,
    xAccessor,
    stackFn,
    defaultPostAction = identity,
    postRotateAction = rotateXY,
) {
    const {
        xScale,
        chartConfig: { yScale },
        plotData,
    } = moreProps

    const { yAccessor, swapScales } = props

    const modifiedYAccessor = swapScales ? convertToArray(xAccessor) : convertToArray(yAccessor)
    const modifiedXAccessor = swapScales ? yAccessor : xAccessor
    const modifiedXScale = swapScales ? yScale : xScale
    const modifiedYScale = swapScales ? xScale : yScale
    const postProcessor = swapScales ? postRotateAction : defaultPostAction

    const bars = getStackedBars(
        props,
        modifiedXAccessor,
        modifiedYAccessor,
        modifiedXScale,
        modifiedYScale,
        plotData,
        stackFn,
        postProcessor,
    )

    drawOnCanvas2(props, context, bars)
}

export const drawStackedBarSeries = (context, moreProps, props) => {
    drawOnCanvasHelper(context, withDefaults(stackedBarSeriesDefaults, props), moreProps, moreProps.xAccessor, d3Stack)
}

/** Several bars per x, each starting where the one before ended. */
export class StackedBarSeries extends Series {
    static defaults = stackedBarSeriesDefaults

    get clip() {
        return this.seriesProps.clip
    }

    canvasDraw(context, moreProps) {
        drawStackedBarSeries(context, moreProps, this.seriesProps)
    }
}

define("chart-stacked-bar-series", StackedBarSeries)
