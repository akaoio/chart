import { group } from "d3-array"
import { functor, head, plotDataLengthBarWidth, withDefaults } from "../core/utils/index.js"
import { drawOnCanvasHelper, identityStack } from "./StackedBarSeries.js"
import { Series } from "./Series.js"
import { define } from "../core/element.js"

export const barSeriesDefaults = {
    baseAt: (xScale, yScale) => head(yScale.range()),
    clip: true,
    fillStyle: "rgba(70, 130, 180, 0.5)",
    swapScales: false,
    width: plotDataLengthBarWidth,
    widthRatio: 0.8,
    yAccessor: undefined,
    strokeStyle: undefined,
}

/** Where each bar sits and how tall it is. Negative values grow downward from the base. */
export const getBars = (moreProps, props) => {
    const { baseAt, fillStyle, width, yAccessor } = withDefaults(barSeriesDefaults, props)

    const {
        xScale,
        xAccessor,
        plotData,
        chartConfig: { yScale },
    } = moreProps

    const getFill = functor(fillStyle)
    const getBase = functor(baseAt)
    const getWidth = functor(width)

    const barWidth = getWidth(withDefaults(barSeriesDefaults, props), { xScale, xAccessor, plotData })
    const offset = 0.5 * barWidth

    return plotData
        .map(datum => {
            const yValue = yAccessor(datum)
            if (yValue === undefined) return undefined

            const x = xScale(xAccessor(datum)) - offset

            let y = yScale(yValue)
            let height = getBase(xScale, yScale, datum) - yScale(yValue)

            if (height < 0) {
                y = y + height
                height = -height
            }

            return {
                x,
                y: Math.round(y),
                height: Math.round(height),
                width: offset * 2,
                fillStyle: getFill(datum),
            }
        })
        .filter(bar => bar !== undefined)
}

/**
 * Bars, grouped by fill colour so the canvas state changes once per colour rather than
 * once per bar — which is most of why a thousand-bar volume chart stays fast.
 *
 * A bar narrower than a pixel is drawn as a one-pixel line instead, otherwise it would
 * fade to nothing under antialiasing.
 */
export const drawBarSeries = (context, moreProps, props) => {
    const resolved = withDefaults(barSeriesDefaults, props)

    // Bars along the x axis instead of up from it — the same layout code, with the two
    // scales handed to it the other way round.
    if (resolved.swapScales) {
        drawOnCanvasHelper(context, resolved, moreProps, moreProps.xAccessor, identityStack)
        return
    }

    const { strokeStyle } = resolved
    const bars = getBars(moreProps, props)

    group(bars, bar => bar.fillStyle).forEach((values, key) => {
        if (strokeStyle !== undefined && head(values).width > 1) context.strokeStyle = strokeStyle

        context.fillStyle = key

        values.forEach(bar => {
            if (bar.width <= 1) {
                // Thân hẹp hơn một pixel thành một vạch 1px, và vạch ấy phải nằm
                // giữa thân — tâm là `bar.x + width / 2`, nên vạch bắt đầu ở tâm
                // trừ nửa pixel. Bản gốc viết `bar.x - 0.5`, tức áp phép căn giữa
                // lên một toạ độ vốn là MÉP.
                context.fillRect(bar.x + bar.width / 2 - 0.5, bar.y, 1, bar.height)
            } else {
                // Fill và stroke dùng chung đúng một hình chữ nhật. `bar.x` đã là
                // mép trái (`getBars` trả `xScale(…) - offset`), nên không có gì để
                // dịch đi nửa pixel.
                //
                // Bản gốc viết `fillRect(d.x + 0.5, d.y + 0.5, …)` cạnh
                // `strokeRect(d.x, d.y, …)` — thân trượt xuống-phải nửa pixel so với
                // chính viền của nó, mà vẫn giữ nguyên width/height. Đo trên canvas
                // với thân đáng lẽ chiếm [80,120]x[120,220]: x=79 ra rgb(127,127,127)
                // viền trần, x=80 ra rgb(127,63,63) tức có trắng lọt vào, còn x=119
                // ra rgb(128,0,0) và x=120 lại rgb(127,63,63) — trên-trái hở, dưới-phải
                // thò ra. Trục dọc y hệt (chart#42).
                context.fillRect(bar.x, bar.y, bar.width, bar.height)
                if (strokeStyle !== undefined) context.strokeRect(bar.x, bar.y, bar.width, bar.height)
            }
        })
    })
}

export class BarSeries extends Series {
    static defaults = barSeriesDefaults

    get clip() {
        return this.seriesProps.clip
    }

    canvasDraw(context, moreProps) {
        drawBarSeries(context, moreProps, this.seriesProps)
    }
}

define("chart-bar-series", BarSeries)
