import { functor, merge, path } from "../utils/index.js"
import atr from "./atr.js"
import { Kagi as defaultOptions } from "./defaultOptionsForComputation.js"

/**
 * Kagi: a line that ignores time and only turns when price reverses enough.
 *
 * The threshold is either a fixed amount or the current ATR, so in a volatile market the
 * line needs a bigger move to turn. Each segment records where it broke the previous peak
 * or trough — that break is what flips it between yang (thick, rising) and yin (thin).
 *
 * The calendar markers (`startOfYear` and friends) are carried along and pinned to the
 * *first* bar crossing each boundary, so the x axis can still label a chart that has no
 * regular time spacing left.
 */
export default function kagiCalculator() {
    let options = defaultOptions
    let dateAccessor = datum => datum.date
    let dateMutator = (datum, date) => {
        datum.date = date
    }

    const calculator = data => {
        const { reversalType, windowSize, reversal, sourcePath } = options
        const source = path(sourcePath)

        let reversalThreshold

        if (reversalType === "ATR") {
            const atrAlgorithm = atr().options({ windowSize })

            merge()
                .algorithm(atrAlgorithm)
                .merge((datum, value) => {
                    datum["atr" + windowSize] = value
                })(data)

            reversalThreshold = datum => datum["atr" + windowSize]
        } else {
            reversalThreshold = functor(reversal)
        }

        const kagiData = []

        let previousPeak
        let previousTrough
        let direction
        let line = {}

        data.forEach(datum => {
            if (line.from === undefined) {
                dateMutator(line, dateAccessor(datum))
                line.from = dateAccessor(datum)

                if (!line.open) line.open = datum.open
                line.high = datum.high
                line.low = datum.low
                if (!line.close) line.close = source(datum)

                line.startOfYear = datum.startOfYear
                line.startOfQuarter = datum.startOfQuarter
                line.startOfMonth = datum.startOfMonth
                line.startOfWeek = datum.startOfWeek
            }

            // The coarsest boundary wins the label, so a segment spanning a year change
            // is dated by the year, not by a week inside it.
            if (!line.startOfYear) {
                line.startOfYear = datum.startOfYear
                if (line.startOfYear) line.date = datum.date
            }
            if (!line.startOfQuarter) {
                line.startOfQuarter = datum.startOfQuarter
                if (line.startOfQuarter && !line.startOfYear) line.date = datum.date
            }
            if (!line.startOfMonth) {
                line.startOfMonth = datum.startOfMonth
                if (line.startOfMonth && !line.startOfQuarter) line.date = datum.date
            }
            if (!line.startOfWeek) {
                line.startOfWeek = datum.startOfWeek
                if (line.startOfWeek && !line.startOfMonth) line.date = datum.date
            }

            line.volume = (line.volume || 0) + datum.volume
            line.high = Math.max(line.high, datum.high)
            line.low = Math.min(line.low, datum.low)
            line.to = dateAccessor(datum)

            const priceMovement = source(datum) - line.close
            const goingUp = line.close >= line.open

            if ((goingUp && priceMovement > 0) || (!goingUp && priceMovement < 0)) {
                // still moving the way this segment was already going: extend it
                line.close = source(datum)

                if (previousTrough && line.close < previousTrough) {
                    // a yin line forms when a Kagi line breaks below the prior trough
                    line.changePoint = previousTrough
                    if (line.startAs !== "yin") line.changeTo = "yin"
                }

                if (previousPeak && line.close > previousPeak) {
                    // a yang line forms when a Kagi line breaks above the prior peak
                    line.changePoint = previousPeak
                    if (line.startAs !== "yang") line.changeTo = "yang"
                }
            } else if (
                (goingUp && priceMovement < 0 && Math.abs(priceMovement) > reversalThreshold(datum)) ||
                (!goingUp && priceMovement > 0 && Math.abs(priceMovement) > reversalThreshold(datum))
            ) {
                // moved against the segment by more than the threshold: turn
                const nextLineOpen = line.close

                direction = (line.close - line.open) / Math.abs(line.close - line.open)

                let nextChangePoint
                let nextChangeTo

                if (direction < 0) {
                    if (previousPeak === undefined) previousPeak = line.open
                    previousTrough = line.close

                    if (source(datum) > previousPeak) {
                        nextChangePoint = previousPeak
                        nextChangeTo = "yang"
                    }
                } else {
                    if (previousTrough === undefined) previousTrough = line.open
                    previousPeak = line.close

                    if (source(datum) < previousTrough) {
                        nextChangePoint = previousTrough
                        nextChangeTo = "yin"
                    }
                }

                if (line.startAs === undefined) line.startAs = direction > 0 ? "yang" : "yin"

                const startAs = line.changeTo || line.startAs
                line.added = true
                kagiData.push(line)

                direction = -1 * direction

                line = { ...line }
                line.open = nextLineOpen
                line.close = source(datum)
                line.startAs = startAs
                line.changePoint = nextChangePoint
                line.changeTo = nextChangeTo
                line.added = false
                line.from = undefined
                line.volume = 0
            }

            line.current = source(datum)

            let towards = line.close - line.open
            towards = towards === 0 ? 1 : towards / Math.abs(towards)

            // where price would have to reach to turn the line
            line.reverseAt = towards > 0 ? line.close - reversalThreshold(datum) : line.open - reversalThreshold(datum)
        })

        if (!line.added) kagiData.push(line)

        return kagiData
    }

    calculator.options = newOptions => {
        if (newOptions === undefined) return options
        options = { ...defaultOptions, ...newOptions }
        return calculator
    }

    calculator.dateMutator = newDateMutator => {
        if (newDateMutator === undefined) return dateMutator
        dateMutator = newDateMutator
        return calculator
    }

    calculator.dateAccessor = newDateAccessor => {
        if (newDateAccessor === undefined) return dateAccessor
        dateAccessor = newDateAccessor
        return calculator
    }

    return calculator
}
