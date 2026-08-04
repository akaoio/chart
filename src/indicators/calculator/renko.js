import { functor, merge } from "../utils/index.js"
import atr from "./atr.js"
import { Renko as defaultOptions } from "./defaultOptionsForComputation.js"

/**
 * Renko: one brick per fixed price move, time ignored entirely.
 *
 * A single bar can produce several bricks if price ran far enough, and many bars can
 * produce none — that is the point of the chart. Brick size is either fixed or the
 * current ATR, so a volatile market gets larger bricks and stays readable.
 *
 * The last brick is emitted `fullyFormed: false` when price has not travelled far enough
 * to complete it, so the chart can show it differently rather than implying a move that
 * has not happened yet.
 */
export default function renkoCalculator() {
    let options = defaultOptions
    let dateAccessor = datum => datum.date
    let dateMutator = (datum, date) => {
        datum.date = date
    }

    const calculator = rawData => {
        const { reversalType, fixedBrickSize, sourcePath, windowSize } = options

        const pricingMethod =
            sourcePath === "high/low"
                ? datum => ({ high: datum.high, low: datum.low })
                : datum => ({ high: datum.close, low: datum.close })

        let brickSize

        if (reversalType === "ATR") {
            const atrAlgorithm = atr().options({ windowSize })

            merge()
                .algorithm(atrAlgorithm)
                .merge((datum, value) => {
                    datum["atr" + windowSize] = value
                })(rawData)

            brickSize = datum => datum["atr" + windowSize]
        } else {
            brickSize = functor(fixedBrickSize)
        }

        const renkoData = []

        let index = 0
        let previousBrickClose = rawData[index].open
        let previousBrickOpen = rawData[index].open
        let brick = {}
        let direction = 0

        rawData.forEach((datum, idx) => {
            if (brick.from === undefined) {
                brick.high = datum.high
                brick.low = datum.low
                brick.startOfYear = datum.startOfYear
                brick.startOfQuarter = datum.startOfQuarter
                brick.startOfMonth = datum.startOfMonth
                brick.startOfWeek = datum.startOfWeek

                brick.from = idx
                brick.fromDate = dateAccessor(datum)
                dateMutator(brick, dateAccessor(datum))
            }

            brick.volume = (brick.volume || 0) + datum.volume

            const previousCloseToHigh = previousBrickClose - pricingMethod(datum).high
            const previousCloseToLow = previousBrickClose - pricingMethod(datum).low
            const previousOpenToHigh = previousBrickOpen - pricingMethod(datum).high
            const previousOpenToLow = previousBrickOpen - pricingMethod(datum).low

            const priceMovement = Math.min(
                Math.abs(previousCloseToHigh),
                Math.abs(previousCloseToLow),
                Math.abs(previousOpenToHigh),
                Math.abs(previousOpenToLow),
            )

            brick.high = Math.max(brick.high, datum.high)
            brick.low = Math.min(brick.low, datum.low)

            // The coarsest calendar boundary the brick spans is the one it gets dated by
            if (!brick.startOfYear) {
                brick.startOfYear = datum.startOfYear
                if (brick.startOfYear) dateMutator(brick, dateAccessor(datum))
            }
            if (!brick.startOfQuarter) {
                brick.startOfQuarter = datum.startOfQuarter
                if (brick.startOfQuarter && !brick.startOfYear) dateMutator(brick, dateAccessor(datum))
            }
            if (!brick.startOfMonth) {
                brick.startOfMonth = datum.startOfMonth
                if (brick.startOfMonth && !brick.startOfQuarter) dateMutator(brick, dateAccessor(datum))
            }
            if (!brick.startOfWeek) {
                brick.startOfWeek = datum.startOfWeek
                if (brick.startOfWeek && !brick.startOfMonth) dateMutator(brick, dateAccessor(datum))
            }

            if (!brickSize(datum)) return

            const noOfBricks = Math.floor(priceMovement / brickSize(datum))

            brick.open =
                Math.abs(previousCloseToHigh) < Math.abs(previousOpenToHigh) ||
                Math.abs(previousCloseToLow) < Math.abs(previousOpenToLow)
                    ? previousBrickClose
                    : previousBrickOpen

            if (noOfBricks >= 1) {
                let j = 0
                for (j = 0; j < noOfBricks; j++) {
                    // open below the bar's high means the move was upward, so the brick is hollow
                    brick.close =
                        brick.open < pricingMethod(datum).high
                            ? brick.open + brickSize(datum)
                            : brick.open - brickSize(datum)

                    direction = brick.close > brick.open ? 1 : -1
                    brick.direction = direction
                    brick.to = idx
                    brick.toDate = dateAccessor(datum)
                    brick.fullyFormed = true
                    renkoData.push(brick)

                    previousBrickClose = brick.close
                    previousBrickOpen = brick.open

                    brick = {
                        high: brick.high,
                        low: brick.low,
                        open: brick.close,
                        startOfYear: false,
                        startOfMonth: false,
                        startOfQuarter: false,
                        startOfWeek: false,
                    }
                    brick.from = idx
                    brick.fromDate = dateAccessor(datum)
                    dateMutator(brick, dateAccessor(datum))
                    brick.volume = (brick.volume || 0) + datum.volume
                }

                index = index + j - 1
                brick = {}
            } else if (idx === rawData.length - 1) {
                // nothing completed, but this is the last bar — show the partial brick
                brick.close = direction > 0 ? pricingMethod(datum).high : pricingMethod(datum).low
                brick.to = idx
                brick.toDate = dateAccessor(datum)
                dateMutator(brick, dateAccessor(datum))
                brick.fullyFormed = false
                renkoData.push(brick)
            }
        })

        return renkoData
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
