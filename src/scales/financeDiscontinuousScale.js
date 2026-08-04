import { ascending } from "d3-array"
import { scaleLinear } from "d3-scale"
import { levelDefinition } from "./levels.js"

const MAX_LEVEL = levelDefinition.length - 1

/**
 * A linear scale over array positions rather than over time.
 *
 * Markets do not trade continuously, so a time scale would leave gaps for nights,
 * weekends and holidays. This scale maps position-in-the-data to pixels and keeps a
 * parallel `index` of what each position means, so ticks and labels can still speak in
 * dates while the geometry stays evenly spaced.
 *
 * `index` rows come from the discontinuous time scale provider and carry `{ index,
 * level, date, format }`. Positions may be negative — the provider can start below zero
 * — so every lookup shifts by the first row's index.
 */
export default function financeDiscontinuousScale(index, backingLinearScale = scaleLinear()) {
    if (index === undefined) {
        throw new Error("Use the discontinuousTimeScaleProvider to create financeDiscontinuousScale")
    }

    function scale(value) {
        return backingLinearScale(value)
    }

    scale.invert = value => {
        const inverted = backingLinearScale.invert(value)
        return Math.round(inverted * 10000) / 10000
    }

    scale.domain = domain => {
        if (domain === undefined) return backingLinearScale.domain()

        backingLinearScale.domain(domain)
        return scale
    }

    scale.range = range => {
        if (range === undefined) return backingLinearScale.range()

        backingLinearScale.range(range)
        return scale
    }

    // Unlike every other setter here, this returns the backing scale rather than this
    // one, so it does not chain. Preserved as-is: series and axes may rely on it, and a
    // silent behaviour change is worse than an inconsistency that is written down.
    scale.rangeRound = range => backingLinearScale.rangeRound(range)

    scale.clamp = clamp => {
        if (clamp === undefined) return backingLinearScale.clamp()

        backingLinearScale.clamp(clamp)
        return scale
    }

    scale.interpolate = interpolate => {
        if (interpolate === undefined) return backingLinearScale.interpolate()

        backingLinearScale.interpolate(interpolate)
        return scale
    }

    /**
     * Ticks are chosen by significance, not by spacing.
     *
     * Walk the levels from coarsest down, taking whole levels while the running total
     * stays within half again of what a plain linear scale would have produced. Then, if
     * the result is still denser than one tick per position, drop whichever of any two
     * near-neighbours is less significant.
     */
    scale.ticks = count => {
        const backingTicks = backingLinearScale.ticks(count)
        const ticksAtLevel = new Map()

        const [domainStart, domainEnd] = backingLinearScale.domain()

        const head = index[0]?.index
        const start = Math.max(Math.ceil(domainStart), head) + Math.abs(head)
        const end = Math.min(Math.floor(domainEnd), index[index.length - 1]?.index) + Math.abs(head)

        const desiredTickCount = Math.ceil(((end - start) / (domainEnd - domainStart)) * backingTicks.length)

        for (let level = MAX_LEVEL; level >= 0; level--) {
            const existing = ticksAtLevel.get(level)
            const collected = existing === undefined ? [] : existing.slice()

            for (let position = start; position <= end; position++) {
                if (index[position].level === level) {
                    collected.push(index[position])
                }
            }

            ticksAtLevel.set(level, collected)
        }

        let unsortedTicks = []
        for (let level = MAX_LEVEL; level >= 0; level--) {
            const selected = ticksAtLevel.get(level) ?? []
            if (selected.length + unsortedTicks.length > desiredTickCount * 1.5) break

            unsortedTicks = unsortedTicks.concat(selected.map(row => row.index))
        }

        const ticks = unsortedTicks.sort(ascending)

        if (end - start > ticks.length) {
            const kept = new Set(ticks)
            const offset = Math.abs(index[0].index)

            // ignore ticks within this distance
            const distance = Math.ceil(
                (backingTicks.length > 0
                    ? (backingTicks[backingTicks.length - 1] - backingTicks[0]) / backingTicks.length / 4
                    : 1) * 1.5,
            )

            for (let i = 0; i < ticks.length - 1; i++) {
                for (let j = i + 1; j < ticks.length; j++) {
                    if (ticks[j] - ticks[i] <= distance) {
                        kept.delete(index[ticks[i] + offset].level >= index[ticks[j] + offset].level ? ticks[j] : ticks[i])
                    }
                }
            }

            return [...kept.values()].map(value => Number.parseInt(value, 10))
        }

        return ticks
    }

    scale.tickFormat = () => value => {
        const offset = Math.abs(index[0].index)
        const { format, date } = index[Math.floor(value + offset)]
        return format(date)
    }

    /** The date sitting at a position, or undefined past either end of the data. */
    scale.value = value => {
        const offset = Math.abs(index[0].index)
        const row = index[Math.floor(value + offset)]
        if (row !== undefined) return row.date
    }

    scale.nice = count => {
        backingLinearScale.nice(count)
        return scale
    }

    scale.index = rows => {
        if (rows === undefined) return index
        index = rows
        return scale
    }

    scale.copy = () => financeDiscontinuousScale(index, backingLinearScale.copy())

    return scale
}
