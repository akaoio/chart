import { functor, plotDataLengthBarWidth, withDefaults } from "../core/utils/index.js"
import { Series } from "./Series.js"
import { define } from "../core/element.js"

export const sessionProfileSeriesDefaults = {
    accessor: datum => datum.footprint,
    mode: "volume",
    periodMs: 30 * 60_000,
    maxWidthPercent: 40,
    upFill: "rgba(106, 185, 117, 0.55)",
    downFill: "rgba(224, 122, 122, 0.55)",
    blockFill: "rgba(138, 175, 226, 0.65)",
    textFill: "#000000",
    fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
    minCellHeight: 2,
    minLetterWidth: 8,
    width: plotDataLengthBarWidth,
    widthRatio: 1,
}

/** Chữ cái của kỳ TPO thứ `index` — A…Z rồi a…z, quá nữa thì quay vòng có dấu nháy. */
export const periodLetter = index => {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
    return alphabet[index % alphabet.length] + (index >= alphabet.length ? "'" : "")
}

/**
 * Per-session profiles built from footprint cells: `<chart-session-profile-series>`
 * (chart#5 · akao#276 — TPO & Session Volume Profile, cùng một bảng dữ liệu).
 *
 * A SESSION is a run of bars sharing a calendar day of their DISPLAYED date — the
 * same boundary the session-break lines draw, so the two features can never
 * disagree about where a day starts. The series READS `datum.footprint` and pools
 * it per session; nothing here talks to a store or computes volumes from OHLCV.
 *
 *   mode "volume" — volume-at-price per session: one horizontal bar per level,
 *                   buy|sell halves, growing from the session's left edge.
 *   mode "tpo"    — Market Profile: each `periodMs` slice of the session is a
 *                   period; a level collects one BLOCK per period that traded
 *                   there. Blocks wide enough carry the period's letter (A, B,
 *                   C… — chữ in trước, chữ thường sau).
 */
export const drawSessionProfileSeries = (context, moreProps, props) => {
    const resolved = withDefaults(sessionProfileSeriesDefaults, props)
    const { accessor, mode, periodMs, maxWidthPercent, upFill, downFill, blockFill, textFill, fontFamily, minCellHeight, minLetterWidth } = resolved

    const {
        xAccessor,
        xScale,
        chartConfig: { yScale },
        plotData,
    } = moreProps

    if (!plotData?.length) return

    // ── cắt phiên theo ngày HIỂN THỊ — cùng ranh giới với session breaks ─────
    const sessions = []
    let current = null
    for (const datum of plotData) {
        if (datum.date?.getFullYear === undefined) continue // datum không date thì không thuộc phiên nào — cho qua, đừng nổ getTime ở dưới (#review)
        const day = datum.date.getFullYear() * 10000 + datum.date.getMonth() * 100 + datum.date.getDate()
        if (!current || current.day !== day) {
            current = { day, data: [] }
            sessions.push(current)
        }
        current.data.push(datum)
    }

    for (const session of sessions) {
        const first = session.data[0]
        const last = session.data[session.data.length - 1]
        const left = xScale(xAccessor(first))
        const right = xScale(xAccessor(last))
        const maxWidth = Math.max(8, ((right - left) * maxWidthPercent) / 100)
        // Neo kỳ vào 00:00 của NGÀY (giờ hiển thị) — không phải bar đầu tiên
        // TRONG KHUNG NHÌN (#review): plotData bị lọc theo viewport, neo theo
        // nó thì pan một cú là mọi chữ kỳ đánh số lại, "A" đổi nghĩa giữa hai
        // cú kéo. Ngày thì bất biến dù nhìn từ đâu.
        const dayStart = new Date(first.date)
        dayStart.setHours(0, 0, 0, 0)
        const sessionStart = dayStart.getTime()

        // ── gom ô của cả phiên: mức → volume hoặc mức → tập kỳ ────────────────
        const levels = new Map()
        for (const datum of session.data) {
            const cells = accessor(datum)
            if (!Array.isArray(cells)) continue
            const period = Math.floor((datum.date.getTime() - sessionStart) / periodMs)
            for (const cell of cells) {
                let entry = levels.get(cell.price)
                if (!entry) {
                    entry = { buy: 0, sell: 0, periods: new Set() }
                    levels.set(cell.price, entry)
                }
                entry.buy += cell.buy
                entry.sell += cell.sell
                entry.periods.add(period)
            }
        }
        if (levels.size === 0) continue

        const prices = [...levels.keys()].sort((a, b) => a - b)
        let step = Infinity
        for (let i = 1; i < prices.length; i++) step = Math.min(step, prices[i] - prices[i - 1])
        if (!Number.isFinite(step) || step <= 0) step = Math.abs(yScale.invert(0) - yScale.invert(1)) * 8

        const heightOf = price => {
            const yTop = yScale(price + step / 2)
            const yBottom = yScale(price - step / 2)
            return { top: Math.min(yTop, yBottom), height: Math.max(minCellHeight, Math.abs(yBottom - yTop) - 1) }
        }

        if (mode === "volume") {
            const biggest = Math.max(...prices.map(price => levels.get(price).buy + levels.get(price).sell))
            if (!(biggest > 0)) continue
            for (const price of prices) {
                const entry = levels.get(price)
                const { top, height } = heightOf(price)
                const total = ((entry.buy + entry.sell) / biggest) * maxWidth
                const buyWidth = ((entry.buy + entry.sell) > 0 ? entry.buy / (entry.buy + entry.sell) : 0) * total
                context.fillStyle = upFill
                context.fillRect(left, top, buyWidth, height)
                context.fillStyle = downFill
                context.fillRect(left + buyWidth, top, total - buyWidth, height)
            }
            continue
        }

        // ── mode "tpo": mỗi kỳ chạm mức là một khối; đủ rộng thì mang chữ ────
        const mostPeriods = Math.max(...prices.map(price => levels.get(price).periods.size))
        const blockWidth = Math.max(2, Math.min(12, maxWidth / mostPeriods))
        for (const price of prices) {
            const { top, height } = heightOf(price)
            const periods = [...levels.get(price).periods].sort((a, b) => a - b)
            periods.forEach((period, at) => {
                if (at * blockWidth >= maxWidth - 1e-9) return // sàn 2px có thể vượt quỹ — cắt tại mép; so mép TRÁI + epsilon: (at+1)×w với w=maxWidth/n tròn IEEE lên trên maxWidth và rơi oan khối cuối (#review vòng 2, đo 12.4/3)
                context.fillStyle = blockFill
                context.fillRect(left + at * blockWidth, top, blockWidth - 1, height)
                if (blockWidth >= minLetterWidth && height >= 8) {
                    context.font = `${Math.min(10, height - 1)}px ${fontFamily}`
                    context.fillStyle = textFill
                    context.textBaseline = "middle"
                    context.textAlign = "center"
                    context.fillText(periodLetter(period), left + at * blockWidth + blockWidth / 2, top + height / 2)
                }
            })
        }
    }
}

/** Per-session TPO / volume profiles pooled from footprint cells — read, never computed here. */
export class SessionProfileSeries extends Series {
    static defaults = sessionProfileSeriesDefaults

    canvasDraw(context, moreProps) {
        drawSessionProfileSeries(context, moreProps, this.seriesProps)
    }
}

define("chart-session-profile-series", SessionProfileSeries)
