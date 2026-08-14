import { functor, plotDataLengthBarWidth, withDefaults } from "../core/utils/index.js"
import { Series } from "./Series.js"
import { define } from "../core/element.js"

export const footprintSeriesDefaults = {
    accessor: datum => datum.footprint,
    width: plotDataLengthBarWidth,
    widthRatio: 0.9,
    upFill: "rgba(106, 185, 117, 1)",
    downFill: "rgba(224, 122, 122, 1)",
    textFill: "#000000",
    fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
    minCellHeight: 2,
    minTextHeight: 9,
    minTextWidth: 46,
}

/**
 * Volume footprint: `<chart-footprint-series>` — every bar opened up into its price
 * levels, buy volume against sell volume at each level (chart#5 cụm 4 · akao#276).
 *
 * The series READS, it never computes: each datum's cells arrive through `accessor`
 * as `[{ price, buy, sell }]` — the aggregation happened upstream (akao's
 * `footprintOf`, folded from real trades). A cell is two half-boxes growing toward
 * each other from the bar's centre line — buy on the left, sell on the right — each
 * scaled against the LARGEST single side in that bar, so the dominant side of every
 * level is legible at a glance. When a cell is tall and wide enough the volumes are
 * written as numbers, TradingView-style; below that they stay pure color.
 *
 * The level height is derived from the cells themselves (the smallest gap between
 * neighbouring levels): the upstream grid — pricescale neo theo phút — is the truth,
 * and guessing a height here would draw gaps or overlaps the data does not have.
 */
export const drawFootprintSeries = (context, moreProps, props) => {
    const resolved = withDefaults(footprintSeriesDefaults, props)
    const { accessor, upFill, downFill, textFill, fontFamily, minCellHeight, minTextHeight, minTextWidth } = resolved

    const {
        xAccessor,
        xScale,
        chartConfig: { yScale },
        plotData,
    } = moreProps

    const barWidth = Math.max(2, functor(resolved.width)(resolved, { widthRatio: resolved.widthRatio, xScale, xAccessor, plotData }))

    for (const datum of plotData) {
        const cells = accessor(datum)
        if (!Array.isArray(cells) || cells.length === 0) continue

        const centre = Math.round(xScale(xAccessor(datum)))
        const half = barWidth / 2

        // bước mức từ chính lưới của dữ liệu — khoảng cách nhỏ nhất giữa hai mức kề
        let step = Infinity
        const sorted = [...cells].sort((a, b) => a.price - b.price)
        for (let i = 1; i < sorted.length; i++) step = Math.min(step, sorted[i].price - sorted[i - 1].price)
        if (!Number.isFinite(step) || step <= 0) step = Math.abs(yScale.invert(0) - yScale.invert(1)) * 8

        const biggestSide = Math.max(...sorted.map(cell => Math.max(cell.buy, cell.sell)))
        if (!(biggestSide > 0)) continue

        for (const cell of sorted) {
            const yTop = yScale(cell.price + step / 2)
            const yBottom = yScale(cell.price - step / 2)
            const height = Math.max(minCellHeight, Math.abs(yBottom - yTop) - 1)
            const top = Math.min(yTop, yBottom)

            const buyWidth = (cell.buy / biggestSide) * half
            const sellWidth = (cell.sell / biggestSide) * half

            context.fillStyle = upFill
            context.fillRect(centre - buyWidth, top, buyWidth, height)
            context.fillStyle = downFill
            context.fillRect(centre, top, sellWidth, height)

            if (height >= minTextHeight && barWidth >= minTextWidth * 2) {
                const fontSize = Math.min(11, height - 1)
                context.font = `${fontSize}px ${fontFamily}`
                context.fillStyle = textFill
                context.textBaseline = "middle"
                context.textAlign = "right"
                context.fillText(String(Math.round(cell.buy * 100) / 100), centre - 2, top + height / 2)
                context.textAlign = "left"
                context.fillText(String(Math.round(cell.sell * 100) / 100), centre + 2, top + height / 2)
            }
        }
    }
}

/** Every bar opened into price levels: buy against sell at each level, read never computed. */
export class FootprintSeries extends Series {
    static defaults = footprintSeriesDefaults

    canvasDraw(context, moreProps) {
        drawFootprintSeries(context, moreProps, this.seriesProps)
    }
}

define("chart-footprint-series", FootprintSeries)
