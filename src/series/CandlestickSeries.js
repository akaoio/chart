import { group } from "d3-array"
import { functor, plotDataLengthBarWidth, withDefaults } from "../core/utils/index.js"
import { Series } from "./Series.js"
import { define } from "../core/element.js"

export const candlestickSeriesDefaults = {
    candleStrokeWidth: 0.5,
    clip: true,
    fill: datum => (datum.close > datum.open ? "#26a69a" : "#ef5350"),
    stroke: "none",
    wickStroke: datum => (datum.close > datum.open ? "#26a69a" : "#ef5350"),
    width: plotDataLengthBarWidth,
    widthRatio: 0.8,
    yAccessor: datum => ({ open: datum.open, high: datum.high, low: datum.low, close: datum.close }),
}

/**
 * Geometry for each candle: the body between open and close, and the wick from high to
 * low. The body is forced to at least one pixel so a session that opened and closed at
 * the same price still shows a line rather than vanishing.
 */
export const getCandleData = (moreProps, props) => {
    const { fill, stroke, yAccessor, wickStroke, width } = withDefaults(candlestickSeriesDefaults, props)
    const { xAccessor, xScale, chartConfig, plotData } = moreProps
    const { yScale } = chartConfig

    const getFill = functor(fill)
    const getStroke = functor(stroke)
    const getWickStroke = functor(wickStroke)

    const candleWidth = functor(width)(withDefaults(candlestickSeriesDefaults, props), { xScale, xAccessor, plotData })
    const offset = 0.5 * candleWidth

    return plotData
        .filter(datum => yAccessor(datum) !== undefined)
        .map(datum => {
            const ohlc = yAccessor(datum)

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
                direction: ohlc.close - ohlc.open,
            }
        })
        .filter(candle => candle !== undefined)
}

/** Wicks first, then bodies over them, each pass grouped by colour. */
export const drawCandlestickSeries = (context, moreProps, props) => {
    const { candleStrokeWidth } = withDefaults(candlestickSeriesDefaults, props)
    const candleData = getCandleData(moreProps, props)

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
                    // Thân hẹp hơn một pixel: vẽ thành một vạch 1px, và vạch ấy phải
                    // nằm giữa wick. Tâm thân là `candle.x + width / 2`, bằng đúng
                    // `wick.x`, nên một vạch rộng 1px có tâm ở đó thì bắt đầu ở tâm
                    // trừ nửa pixel — cùng phép mà wick đang dùng, và lần này `- 0.5`
                    // có lý do.
                    context.fillRect(candle.x + candle.width / 2 - 0.5, candle.y, 1, candle.height)
                } else {
                    // `candle.x` ĐÃ là mép trái: getCandleData trả `x - offset`. Nên
                    // fill và stroke dùng chung đúng một hình chữ nhật, không cái nào
                    // dịch đi đâu cả.
                    //
                    // Bản gốc viết `fillRect(d.x - 0.5, …)` cạnh `strokeRect(d.x, …)`,
                    // chép nguyên phép căn giữa của wick sang thân — nơi toạ độ là MÉP
                    // chứ không phải TÂM. Đo trên canvas với thân đáng lẽ chiếm [80,120]:
                    // mép trái ra rgb(191,0,0) đỏ đặc còn mép phải ra rgb(192,95,95) rồi
                    // rgb(191,191,191) — tức có trắng lọt vào giữa thân và viền ở đúng
                    // một bên. Zoom lên là thấy vệt hở (chart#38).
                    context.fillRect(candle.x, candle.y, candle.width, candle.height)
                    if (strokeKey !== "none") context.strokeRect(candle.x, candle.y, candle.width, candle.height)
                }
            })
        })
    })
}

export class CandlestickSeries extends Series {
    static defaults = candlestickSeriesDefaults

    get clip() {
        return this.seriesProps.clip
    }

    canvasDraw(context, moreProps) {
        drawCandlestickSeries(context, moreProps, this.seriesProps)
    }
}

define("chart-candlestick-series", CandlestickSeries)
