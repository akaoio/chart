import { PointAndFigure as defaultOptions } from "./defaultOptionsForComputation.js"

const createBox = (datum, dateAccessor, dateMutator) => {
    const box = {
        open: datum.open,
        fromDate: dateAccessor(datum),
        toDate: dateAccessor(datum),
        startOfYear: datum.startOfYear,
        startOfQuarter: datum.startOfQuarter,
        startOfMonth: datum.startOfMonth,
        startOfWeek: datum.startOfWeek,
    }
    dateMutator(box, dateAccessor(datum))
    return box
}

/** Roll each column's boxes up into the column itself, so it reads like an OHLC row. */
const updateColumns = (columnData, dateAccessor, dateMutator) => {
    columnData.forEach(column => {
        column.startOfYear = false
        column.startOfQuarter = false
        column.startOfMonth = false
        column.startOfWeek = false

        column.boxes.forEach(box => {
            if (column.open === undefined) column.open = box.open

            column.close = box.close
            column.high = Math.max(column.open, column.close)
            column.low = Math.min(column.open, column.close)

            if (column.fromDate === undefined) column.fromDate = box.fromDate
            if (column.date === undefined) column.date = box.date
            column.toDate = box.toDate

            if (box.startOfYear) {
                column.startOfYear = column.startOfYear || box.startOfYear
                column.startOfQuarter = box.startOfQuarter
                column.startOfMonth = box.startOfMonth
                column.startOfWeek = box.startOfWeek
                dateMutator(column, dateAccessor(box))
            }
            if (column.startOfQuarter !== true && box.startOfQuarter) {
                column.startOfQuarter = box.startOfQuarter
                column.startOfMonth = box.startOfMonth
                column.startOfWeek = box.startOfWeek
                dateMutator(column, dateAccessor(box))
            }
            if (column.startOfMonth !== true && box.startOfMonth) {
                column.startOfMonth = box.startOfMonth
                column.startOfWeek = box.startOfWeek
                dateMutator(column, dateAccessor(box))
            }
            if (column.startOfWeek !== true && box.startOfWeek) {
                column.startOfWeek = box.startOfWeek
                dateMutator(column, dateAccessor(box))
            }
        })
    })

    return columnData
}

/**
 * Point and Figure: columns of boxes, and nothing else.
 *
 * A column grows while price keeps going its way, one box per `boxSize` of movement. It
 * only ends when price turns by `reversal` boxes against it — three, conventionally.
 * Small moves leave no trace at all, which is what the chart is for: it records direction
 * and extent, never time and never noise.
 */
export default function pointAndFigureCalculator() {
    let options = defaultOptions
    let dateAccessor = datum => datum.date
    let dateMutator = (datum, date) => {
        datum.date = date
    }

    const calculator = rawData => {
        const { reversal, boxSize, sourcePath } = options

        const pricingMethod =
            sourcePath === "high/low"
                ? datum => ({ high: datum.high, low: datum.low })
                : datum => ({ high: datum.close, low: datum.close })

        const columnData = []

        let column = { boxes: [], open: rawData[0].open }
        let box = createBox(rawData[0], dateAccessor, dateMutator)

        columnData.push(column)

        rawData.forEach(datum => {
            column.volume = (column.volume || 0) + datum.volume

            // The coarsest calendar boundary the box spans is the one it gets dated by
            if (!box.startOfYear) {
                box.startOfYear = datum.startOfYear
                if (box.startOfYear) dateMutator(box, dateAccessor(datum))
            }
            if (!box.startOfYear && !box.startOfQuarter) {
                box.startOfQuarter = datum.startOfQuarter
                if (box.startOfQuarter && !box.startOfYear) dateMutator(box, dateAccessor(datum))
            }
            if (!box.startOfQuarter && !box.startOfMonth) {
                box.startOfMonth = datum.startOfMonth
                if (box.startOfMonth && !box.startOfQuarter) dateMutator(box, dateAccessor(datum))
            }
            if (!box.startOfMonth && !box.startOfWeek) {
                box.startOfWeek = datum.startOfWeek
                if (box.startOfWeek && !box.startOfMonth) dateMutator(box, dateAccessor(datum))
            }

            if (columnData.length === 1 && column.boxes.length === 0) {
                // The very first column has no direction yet — whichever way price moved
                // furthest from the opening price decides it.
                const upward = Math.max(pricingMethod(datum).high - column.open, 0)
                const downward = Math.abs(Math.min(column.open - pricingMethod(datum).low, 0))

                column.direction = upward > downward ? 1 : -1

                if (boxSize * reversal < upward || boxSize * reversal < downward) {
                    box.toDate = dateAccessor(datum)
                    box.open = column.open

                    const noOfBoxes =
                        column.direction > 0 ? Math.floor(upward / boxSize) : Math.floor(downward / boxSize)

                    for (let i = 0; i < noOfBoxes; i++) {
                        box.close = box.open + column.direction * boxSize
                        const previousBoxClose = box.close
                        column.boxes.push(box)
                        box = createBox(box, dateAccessor, dateMutator)
                        box.open = previousBoxClose
                    }

                    box.fromDate = dateAccessor(datum)
                    box.date = dateAccessor(datum)
                }

                return
            }

            const upward = Math.max(pricingMethod(datum).high - box.open, 0)
            const downward = Math.abs(Math.min(pricingMethod(datum).low - box.open, 0))

            if ((column.direction > 0 && upward > boxSize) || (column.direction < 0 && downward > boxSize)) {
                // still going the column's way: add another box
                box.close = box.open + column.direction * boxSize
                box.toDate = dateAccessor(datum)

                const previousBoxClose = box.close
                column.boxes.push(box)
                box = createBox(datum, dateAccessor, dateMutator)
                box.open = previousBoxClose
                box.fromDate = dateAccessor(datum)
                dateMutator(box, dateAccessor(datum))
            } else if (
                (column.direction > 0 && downward > boxSize * reversal) ||
                (column.direction < 0 && upward > boxSize * reversal)
            ) {
                // turned by enough to start a new column the other way
                box.open = box.open + -1 * column.direction * boxSize
                box.toDate = dateAccessor(datum)
                dateMutator(box, dateAccessor(datum))

                column = { boxes: [], volume: 0, direction: -1 * column.direction }

                const noOfBoxes = column.direction > 0 ? Math.floor(upward / boxSize) : Math.floor(downward / boxSize)

                for (let i = 0; i < noOfBoxes; i++) {
                    box.close = box.open + column.direction * boxSize
                    const previousBoxClose = box.close
                    column.boxes.push(box)
                    box = createBox(datum, dateAccessor, dateMutator)
                    box.open = previousBoxClose
                }

                columnData.push(column)
            }
        })

        return updateColumns(columnData, dateAccessor, dateMutator)
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
