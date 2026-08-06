import { group } from "d3-array"
import { functor, plotDataLengthBarWidth, withDefaults } from "../core/utils/index.js"
import { Series } from "./Series.js"
import { define } from "../core/element.js"

export const volumeCandlestickSeriesDefaults = {
    candleStrokeWidth: 0.5,
    clip: true,
    fill: datum => (datum.close > datum.open ? "#26a69a" : "#ef5350"),
    stroke: "none",
    wickStroke: datum => (datum.close > datum.open ? "#26a69a" : "#ef5350"),
    width: plotDataLengthBarWidth,
    widthRatio: 0.8,
    minWidthRatio: 0.2,
    volumeAccessor: datum => datum.volume,
    yAccessor: datum => ({ open: datum.open, high: datum.high, low: datum.low, close: datum.close }),
}

/**
 * Geometry cho volume candles: y hệt nến thường, chỉ khác BỀ NGANG — mỗi
 * thân nến co giãn theo volume của chính nó so với volume lớn nhất đang
 * hiện trên khung (`minWidthRatio` giữ cho nến mỏng nhất vẫn nhìn thấy).
 * Nhìn lướt là biết phiên nào có tiền thật sự chảy qua.
 */
export const getVolumeCandleData = (moreProps, props) => {
    const resolved = withDefaults(volumeCandlestickSeriesDefaults, props)
    const { fill, stroke, yAccessor, wickStroke, width, volumeAccessor, minWidthRatio } = resolved
    const { xAccessor, xScale, chartConfig, plotData } = moreProps
    const { yScale } = chartConfig

    const getFill = functor(fill)
    const getStroke = functor(stroke)
    const getWickStroke = functor(wickStroke)

    const baseWidth = functor(width)(resolved, { xScale, xAccessor, plotData })
    const maxVolume = Math.max(1e-9, ...plotData.map(datum => volumeAccessor(datum) ?? 0))

    return plotData
        .filter(datum => yAccessor(datum) !== undefined)
        .map(datum => {
            const ohlc = yAccessor(datum)
            const share = (volumeAccessor(datum) ?? 0) / maxVolume
            const offset = 0.5 * baseWidth * (minWidthRatio + (1 - minWidthRatio) * share)

            const x = xScale(xAccessor(datum))
            const y = Math.round(yScale(Math.max(ohlc.open, ohlc.close)))
            const height = Math.max(1, Math.round(Math.abs(yScale(ohlc.open) - yScale(ohlc.close))))

            return {
                x: x - offset,
                y,
                wick: {
                    stroke: getWickStroke(ohlc),
                    x,
                    y1: Math.round(yScale(ohlc.high)),
                    y2: y,
                    y3: y + height,
                    y4: Math.round(yScale(ohlc.low)),
                },
                height,
                width: offset * 2,
                fill: getFill(ohlc),
                stroke: getStroke(ohlc),
            }
        })
}

/** Wicks first, then bodies over them — same passes as the plain candlestick. */
export const drawVolumeCandlestickSeries = (context, moreProps, props) => {
    const { candleStrokeWidth } = withDefaults(volumeCandlestickSeriesDefaults, props)
    const candleData = getVolumeCandleData(moreProps, props)

    group(candleData, candle => candle.wick.stroke).forEach((values, key) => {
        context.fillStyle = key
        values.forEach(({ wick }) => {
            context.fillRect(wick.x - 0.5, wick.y1, 1, wick.y2 - wick.y1)
            context.fillRect(wick.x - 0.5, wick.y3, 1, wick.y4 - wick.y3)
        })
    })

    group(
        candleData,
        candle => candle.stroke,
        candle => candle.fill,
    ).forEach((strokeValues, strokeKey) => {
        if (strokeKey !== "none") {
            context.strokeStyle = strokeKey
            context.lineWidth = candleStrokeWidth
        }

        strokeValues.forEach((values, key) => {
            context.fillStyle = key

            values.forEach(candle => {
                if (candle.width <= 1) {
                    context.fillRect(candle.x - 0.5, candle.y, 1, candle.height)
                } else if (candle.height === 0) {
                    context.fillRect(candle.x - 0.5, candle.y, candle.width, 1)
                } else {
                    context.fillRect(candle.x - 0.5, candle.y, candle.width, candle.height)
                    if (strokeKey !== "none") context.strokeRect(candle.x, candle.y, candle.width, candle.height)
                }
            })
        })
    })
}

export class VolumeCandlestickSeries extends Series {
    static defaults = volumeCandlestickSeriesDefaults

    get clip() {
        return this.seriesProps.clip
    }

    canvasDraw(context, moreProps) {
        drawVolumeCandlestickSeries(context, moreProps, this.seriesProps)
    }
}

define("chart-volume-candlestick-series", VolumeCandlestickSeries)
