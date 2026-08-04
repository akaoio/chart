import { ascending, descending, histogram as d3Histogram, max, merge, rollup, sum, zip } from "d3-array"
import { scaleLinear } from "d3-scale"
import { accumulatingWindow, functor, head, identity, last, withDefaults } from "../core/utils/index.js"
import { Series } from "./Series.js"
import { define } from "../core/element.js"

export const volumeProfileSeriesDefaults = {
    absoluteChange: datum => datum.absoluteChange,
    bins: 20,
    bySession: false,
    fill: ({ type }) => (type === "up" ? "rgba(38, 166, 154, 0.5)" : "rgba(239, 83, 80, 0.5)"),
    maxProfileWidthPercent: 50,
    orient: "left",
    partialStartOK: true,
    partialEndOK: true,
    sessionBackGround: "rgba(70, 130, 180, 0.3)",
    sessionStart: ({ d, i, plotData }) => i > 0 && plotData[i - 1].date.getMonth() !== d.date.getMonth(),
    showSessionBackground: false,
    source: datum => datum.close,
    stroke: "#FFFFFF",
    volume: datum => datum.volume,
}

/**
 * How much was traded at each price, rather than at each moment.
 *
 * The data is binned by price instead of by time, and each bin becomes a horizontal bar
 * split into the part bought into rising prices and the part sold into falling ones.
 * That is what makes the levels where trading actually happened visible, which a normal
 * volume series cannot show.
 */
export const getVolumeProfile = (moreProps, props) => {
    const {
        sessionStart,
        bySession,
        partialStartOK,
        partialEndOK,
        bins,
        maxProfileWidthPercent,
        source,
        volume,
        absoluteChange,
        orient,
        fill,
        stroke,
    } = withDefaults(volumeProfileSeriesDefaults, props)

    const {
        xScale: realXScale,
        chartConfig: { yScale },
        plotData,
        xAccessor,
        width,
    } = moreProps

    const sessionBuilder = accumulatingWindow()
        .discardTillStart(!partialStartOK)
        .discardTillEnd(!partialEndOK)
        .accumulateTill((datum, index) => sessionStart({ d: datum, i: index, ...moreProps }))
        .accumulator(identity)

    const dx =
        plotData.length > 1 ? realXScale(xAccessor(plotData[1])) - realXScale(xAccessor(head(plotData))) : 0

    const sessions = bySession ? sessionBuilder(plotData) : [plotData]

    const allRects = sessions.map(session => {
        const begin = bySession ? realXScale(xAccessor(head(session))) : 0
        const finish = bySession ? realXScale(xAccessor(last(session))) : width
        const sessionWidth = finish - begin + dx

        const histogram = d3Histogram().value(source).thresholds(bins)

        const rolledUp = data => {
            const sortFunction = orient === "right" ? descending : ascending
            const sorted = data.sort((a, b) => sortFunction(a.direction, b.direction))

            return rollup(
                sorted,
                leaves => sum(leaves, leaf => leaf.volume),
                datum => datum.direction,
            )
        }

        const values = histogram(session)

        const volumeInBins = values
            .map(bin =>
                bin.map(datum =>
                    absoluteChange(datum) > 0
                        ? { direction: "up", volume: volume(datum) }
                        : { direction: "down", volume: volume(datum) },
                ),
            )
            .map(bin => Array.from(rolledUp(bin)))

        const volumeValues = volumeInBins.map(each => sum(each.map(entry => entry[1])))

        const base = scale => head(scale.range())

        const [start, end] =
            orient === "right"
                ? [begin, begin + (sessionWidth * maxProfileWidthPercent) / 100]
                : [finish, finish - (sessionWidth * (100 - maxProfileWidthPercent)) / 100]

        const xScale = scaleLinear()
            .domain([0, max(volumeValues)])
            .range([start, end])

        const totalVolumes = volumeInBins.map(volumes => {
            const totalVolume = sum(volumes, entry => entry[1])
            const totalVolumeX = xScale(totalVolume)
            const barWidth = base(xScale) - totalVolumeX
            const x = barWidth < 0 ? totalVolumeX + barWidth : totalVolumeX

            return {
                x,
                ws: volumes.map(entry => ({ type: entry[0], width: (entry[1] * Math.abs(barWidth)) / totalVolume })),
                totalVolumeX,
            }
        })

        const rects = zip(values, totalVolumes).map(([bin, { x, ws }]) => {
            const first = ws[0] || { type: "up", width: 0 }
            const second = ws[1] || { type: "down", width: 0 }

            return {
                y: yScale(bin.x1),
                height: yScale(bin.x1) - yScale(bin.x0),
                x,
                width,
                w1: first.width,
                w2: second.width,
                stroke1: functor(stroke)(first),
                stroke2: functor(stroke)(second),
                fill1: functor(fill)(first),
                fill2: functor(fill)(second),
            }
        })

        return {
            rects,
            sessionBg: {
                x: begin,
                y: last(rects).y,
                height: head(rects).y - last(rects).y + head(rects).height,
                width: sessionWidth,
            },
        }
    })

    return {
        rects: merge(allRects.map(each => each.rects)),
        sessionBg: allRects.map(each => each.sessionBg),
    }
}

export const drawVolumeProfileSeries = (context, moreProps, props) => {
    const { sessionBackGround, showSessionBackground } = withDefaults(volumeProfileSeriesDefaults, props)
    const { rects, sessionBg } = getVolumeProfile(moreProps, props)

    if (showSessionBackground) {
        if (sessionBackGround !== undefined) context.fillStyle = sessionBackGround

        sessionBg.forEach(each => {
            context.beginPath()
            context.rect(each.x, each.y, each.width, each.height)
            context.closePath()
            context.fill()
        })
    }

    rects.forEach(each => {
        const { x, y, height, w1, w2, stroke1, stroke2, fill1, fill2 } = each

        if (w1 > 0) {
            context.fillStyle = fill1
            if (stroke1 !== "none") context.strokeStyle = stroke1

            context.beginPath()
            context.rect(x, y, w1, height)
            context.closePath()
            context.fill()

            if (stroke1 !== "none") context.stroke()
        }

        if (w2 > 0) {
            context.fillStyle = fill2
            if (stroke2 !== "none") context.strokeStyle = stroke2

            context.beginPath()
            context.rect(x + w1, y, w2, height)
            context.closePath()
            context.fill()

            if (stroke2 !== "none") context.stroke()
        }
    })
}

export class VolumeProfileSeries extends Series {
    static defaults = volumeProfileSeriesDefaults

    canvasDraw(context, moreProps) {
        drawVolumeProfileSeries(context, moreProps, this.seriesProps)
    }
}

define("chart-volume-profile-series", VolumeProfileSeries)
