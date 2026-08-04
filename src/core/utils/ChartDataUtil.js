import { extent } from "d3-array"
import { scaleLinear } from "d3-scale"
import { functor, getClosestItem, isNotDefined, isObject, last, mapObject, shallowEqual, zipper } from "./index.js"

export const ChartDefaultConfig = {
    flipYScale: false,
    id: 0,
    origin: [0, 0],
    padding: 0,
    yPan: true,
    yPanEnabled: false,
    yScale: scaleLinear(),
}

/** `origin` may be a fixed point or a function of the space available. */
export function getChartOrigin(origin, contextWidth, contextHeight) {
    return typeof origin === "function" ? origin(contextWidth, contextHeight) : origin
}

export function getDimensions({ width, height }, chartProps) {
    return {
        availableHeight: height,
        width,
        height: chartProps.height || height,
    }
}

/** An accessor that spreads an object of values into an array, leaving scalars alone. */
const values = accessor => datum => {
    const value = accessor(datum)
    return isObject(value) ? mapObject(value) : value
}

const isArraySize2AndNumber = yExtents =>
    Array.isArray(yExtents) && yExtents.length === 2 && typeof yExtents[0] === "number" && typeof yExtents[1] === "number"

/**
 * Turn each chart's declared props into a resolved configuration: where it sits, how
 * big it is, and what its y scale looks like.
 *
 * The y domain carries across updates when the user has panned it, so a redraw does not
 * throw away where they scrolled to. A fixed two-number `yExtents` is the exception —
 * that is an explicit instruction and wins over any remembered pan.
 *
 * Deviation from the original: it took React children and read `each.props`. Here it
 * takes the props directly, since a custom element has no such wrapper.
 */
export function getNewChartConfig(innerDimension, chartPropsList, existingChartConfig = []) {
    return chartPropsList
        .filter(each => each != null && each.id !== undefined)
        .map(each => {
            const chartProps = { ...ChartDefaultConfig, ...each }

            const {
                id,
                origin,
                padding,
                yExtents: yExtentsProp,
                yScale: yScaleProp = ChartDefaultConfig.yScale,
                flipYScale,
                yExtentsCalculator,
                yPan,
            } = chartProps

            let { yPanEnabled } = chartProps

            const yScale = yScaleProp.copy()
            const { width, height, availableHeight } = getDimensions(innerDimension, chartProps)

            const yExtents = yExtentsProp
                ? (Array.isArray(yExtentsProp) ? yExtentsProp : [yExtentsProp]).map(functor)
                : undefined

            const previous = existingChartConfig.find(config => config.id === id)

            if (isArraySize2AndNumber(yExtentsProp)) {
                const keepPannedDomain =
                    !!previous &&
                    previous.yPan &&
                    previous.yPanEnabled &&
                    yPan &&
                    yPanEnabled &&
                    shallowEqual(previous.originalYExtentsProp, yExtentsProp)

                yScale.domain(keepPannedDomain ? previous.yScale.domain() : yExtentsProp)
            } else if (!!previous && previous.yPanEnabled) {
                if (!isArraySize2AndNumber(previous.originalYExtentsProp)) {
                    yScale.domain(previous.yScale.domain())
                    yPanEnabled = true
                }
            }

            return {
                id,
                origin: functor(origin)(width, availableHeight),
                padding,
                originalYExtentsProp: yExtentsProp,
                yExtents,
                yExtentsCalculator,
                flipYScale,
                yScale,
                yPan,
                yPanEnabled,
                width,
                height,
            }
        })
}

/** Which charts the pointer is currently inside, by vertical position alone. */
export function getCurrentCharts(chartConfig, mouseXY) {
    return chartConfig
        .filter(config => {
            const top = config.origin[1]
            return mouseXY[1] > top && mouseXY[1] < top + config.height
        })
        .map(config => config.id)
}

/**
 * Point the y scale at the pixels it should cover. Screen y grows downward, so unless
 * the scale is flipped the range is reversed to put larger values higher up.
 */
function setRange(scale, height, padding, flipYScale) {
    if (scale.rangeRoundPoints || isNotDefined(scale.invert)) {
        if (isNaN(padding)) throw new Error("padding has to be a number for ordinal scale")

        if (scale.rangeRoundPoints) scale.rangeRoundPoints(flipYScale ? [0, height] : [height, 0], padding)
        if (scale.rangeRound) scale.range(flipYScale ? [0, height] : [height, 0]).padding(padding)
    } else {
        const { top, bottom } = isNaN(padding) ? padding : { top: padding, bottom: padding }

        scale.range(flipYScale ? [top, height - bottom] : [height - bottom, top])
    }
    return scale
}

/** The span of every value any of the chart's series will plot. */
function yDomainFromYExtents(yExtents, yScale, plotData) {
    const allYValues = yExtents.map(extentAccessor => plotData.map(values(extentAccessor))).flat(Infinity)

    return yScale.invert ? extent(allYValues) : [...new Set(allYValues).values()]
}

/**
 * Recompute every chart's y scale for the data now on screen.
 *
 * `dy` is a vertical drag in pixels: when a chart has y panning turned on it shifts its
 * own domain instead of refitting to the data. `chartsToPan` narrows that to the charts
 * under the pointer, so dragging one pane does not move the others.
 */
export function getChartConfigWithUpdatedYScales(
    chartConfig,
    { plotData, xAccessor, displayXAccessor, fullData },
    xDomain,
    dy,
    chartsToPan,
) {
    const yDomains = chartConfig.map(({ yExtentsCalculator, yExtents, yScale }) => ({
        realYDomain: yExtentsCalculator
            ? yExtentsCalculator({ plotData, xDomain, xAccessor, displayXAccessor, fullData })
            : yDomainFromYExtents(yExtents, yScale, plotData),
        yDomainDY:
            dy !== undefined
                ? yScale
                      .range()
                      .map(each => each - dy)
                      .map(yScale.invert)
                : yScale.domain(),
        prevYDomain: yScale.domain(),
    }))

    const combine = zipper().combine((config, { realYDomain, yDomainDY, prevYDomain }) => {
        const { id, padding, height, yScale, yPan, flipYScale, yPanEnabled = false } = config

        const panThisOne = chartsToPan !== undefined ? chartsToPan.indexOf(id) > -1 : true
        const domain = yPan && yPanEnabled ? (panThisOne ? yDomainDY : prevYDomain) : realYDomain

        return {
            ...config,
            yScale: setRange(yScale.copy().domain(domain), height, padding, flipYScale),
            realYDomain,
        }
    })

    return combine(chartConfig, yDomains)
}

/** The data point nearest the pointer. */
export function getCurrentItem(xScale, xAccessor, mouseXY, plotData) {
    if (xScale.invert) {
        return getClosestItem(plotData, xScale.invert(mouseXY[0]), xAccessor)
    }

    const nearest = xScale
        .range()
        .map((position, index) => ({ distance: Math.abs(position - mouseXY[0]), index }))
        .reduce((a, b) => (a.distance < b.distance ? a : b))

    return nearest !== undefined ? plotData[nearest.index] : plotData[0]
}

/**
 * The x value under the pointer.
 *
 * Past the last data point this keeps going rather than clamping, so crosshairs still
 * read out sensibly in the empty space to the right of the last candle.
 */
export function getXValue(xScale, xAccessor, mouseXY, plotData) {
    let item

    if (xScale.invert) {
        const xValue = xScale.invert(mouseXY[0])
        if (xValue > xAccessor(last(plotData))) return Math.round(xValue.valueOf())

        item = getClosestItem(plotData, xValue, xAccessor)
    } else {
        const nearest = xScale
            .range()
            .map((position, index) => ({ distance: Math.abs(position - mouseXY[0]), index }))
            .reduce((a, b) => (a.distance < b.distance ? a : b))

        item = nearest !== undefined ? plotData[nearest.index] : plotData[0]
    }

    return xAccessor(item)
}
