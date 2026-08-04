import { group } from "d3-array"
import { functor, withDefaults } from "../core/utils/index.js"
import { Series } from "./Series.js"
import { define } from "../core/element.js"

export const scatterSeriesDefaults = {
    yAccessor: undefined,
    marker: undefined,
    markerProvider: undefined,
    markerProps: undefined,
}

/** One point per datum, with the marker chosen up front or per datum. */
export const getMarkers = (moreProps, props) => {
    const { yAccessor, markerProvider, markerProps, marker } = withDefaults(scatterSeriesDefaults, props)

    const {
        xAccessor,
        xScale,
        chartConfig: { yScale },
        plotData,
    } = moreProps

    if (!markerProvider && !marker) throw new Error("required prop, either marker or markerProvider missing")

    let Marker = marker

    return plotData
        .map(datum => {
            const yValue = yAccessor(datum)
            if (yValue === undefined) return undefined

            if (markerProvider) Marker = markerProvider(datum)

            const resolved = { ...Marker.defaultProps, ...markerProps }

            return {
                x: xScale(xAccessor(datum)),
                y: yScale(yValue),
                fillStyle: functor(resolved.fillStyle)(datum),
                strokeStyle: functor(resolved.strokeStyle)(datum),
                datum,
                marker: Marker,
            }
        })
        .filter(point => point !== undefined)
}

/** Grouped by fill then stroke, so the canvas state changes once per combination. */
export const drawScatterSeries = (context, moreProps, props) => {
    const { markerProps } = withDefaults(scatterSeriesDefaults, props)
    const points = getMarkers(moreProps, props)

    group(
        points,
        point => point.fillStyle,
        point => point.strokeStyle,
    ).forEach((fillValues, fillKey) => {
        if (fillKey !== "none") context.fillStyle = fillKey

        fillValues.forEach(strokeValues => {
            strokeValues.forEach(point => {
                const { marker } = point
                marker.drawOnCanvas({ ...marker.defaultProps, ...markerProps, fillStyle: fillKey }, point, context)
            })
        })
    })
}

export class ScatterSeries extends Series {
    static defaults = scatterSeriesDefaults

    canvasDraw(context, moreProps) {
        drawScatterSeries(context, moreProps, this.seriesProps)
    }
}

define("chart-scatter-series", ScatterSeries)
