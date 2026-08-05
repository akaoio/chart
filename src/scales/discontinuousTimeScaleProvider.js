import { timeFormat, timeFormatDefaultLocale } from "d3-time-format"
import { slidingWindow, zipper } from "../core/utils/index.js"
import financeDiscontinuousScale from "./financeDiscontinuousScale.js"
import { defaultFormatters, levelDefinition } from "./levels.js"

/** The coarsest level whose test matches, together with the format it wants. */
const evaluateLevel = (row, date, i, formatters) =>
    levelDefinition
        .map((test, position) => ({
            level: levelDefinition.length - position - 1,
            format: formatters[test(row, date, i)],
        }))
        .find(level => !!level.format)

/**
 * Compare each date with the one before it to see which boundaries it crosses.
 *
 * Everything here reads local time on purpose — `getHours`, `getDay`, `getMonth`. A
 * trading day is a local thing, so the same data plotted in Tokyo and in London should
 * and does break into days differently. `.utc()` on the builder opts out.
 */
const boundariesBetween = (previous, now) => {
    const nowSeconds = now.getSeconds()
    const nowMinutes = now.getMinutes()
    const nowHours = now.getHours()
    const nowDay = now.getDay()
    const nowMonth = now.getMonth()

    const startOfSecond = nowSeconds !== previous.getSeconds()
    const startOfMinute = nowMinutes !== previous.getMinutes()
    const startOfHour = nowHours !== previous.getHours()
    // ISO week: Sunday = 0 … Saturday = 6, so a smaller day number means a new week
    const startOfMonth = nowMonth !== previous.getMonth()

    return {
        date: now.getTime(),
        startOfSecond,
        startOf5Seconds: startOfSecond && nowSeconds % 5 === 0,
        startOf15Seconds: startOfSecond && nowSeconds % 15 === 0,
        startOf30Seconds: startOfSecond && nowSeconds % 30 === 0,
        startOfMinute,
        startOf5Minutes: startOfMinute && nowMinutes % 5 <= previous.getMinutes() % 5,
        startOf15Minutes: startOfMinute && nowMinutes % 15 <= previous.getMinutes() % 15,
        startOf30Minutes: startOfMinute && nowMinutes % 30 <= previous.getMinutes() % 30,
        startOfHour,
        startOfEighthOfADay: startOfHour && nowHours % 3 === 0,
        startOfQuarterDay: startOfHour && nowHours % 6 === 0,
        startOfHalfDay: startOfHour && nowHours % 12 === 0,
        startOfDay: nowDay !== previous.getDay(),
        startOfWeek: nowDay < previous.getDay(),
        startOfMonth,
        startOfQuarter: startOfMonth && nowMonth % 3 <= previous.getMonth() % 3,
        startOfYear: now.getFullYear() !== previous.getFullYear(),
    }
}

/** The very first point has nothing to compare against, so it is called a day boundary. */
const firstRow = date => ({
    date: date.getTime(),
    startOfSecond: false,
    startOf5Seconds: false,
    startOf15Seconds: false,
    startOf30Seconds: false,
    startOfMinute: false,
    startOf5Minutes: false,
    startOf15Minutes: false,
    startOf30Minutes: false,
    startOfHour: false,
    startOfEighthOfADay: false,
    startOfQuarterDay: false,
    startOfHalfDay: false,
    startOfDay: true,
    startOfWeek: false,
    startOfMonth: false,
    startOfQuarter: false,
    startOfYear: false,
})

/**
 * A fresh calculator per call, not one shared and reconfigured.
 *
 * The original keeps a single `slidingWindow` at module level and rewrites its `source`
 * and `misc` on every use. That happens to work because the data is pushed through
 * immediately afterwards, with nothing in between — but "happens to work" is the whole
 * problem: two charts sharing one process share that object, and anything that ever
 * yields between configuring and running would silently read another chart's settings.
 *
 * Building one per call costs a closure and removes the hazard entirely.
 */
const indexCalculator = () =>
    slidingWindow()
        .windowSize(2)
        .undefinedValue((date, index, { initialIndex, formatters }) => {
            const row = firstRow(date)
            return { ...row, index: initialIndex, ...evaluateLevel(row, date, initialIndex, formatters) }
        })
        .accumulator(([previous, now], i, index, { initialIndex, formatters }) => {
            const row = boundariesBetween(previous, now)
            return { ...row, index: i + initialIndex, ...evaluateLevel(row, now, i, formatters) }
        })

const createIndex = (realDateAccessor, inputDateAccessor, initialIndex, formatters) => data => {
    const dateAccessor = realDateAccessor(inputDateAccessor)
    const calculate = indexCalculator().source(dateAccessor).misc({ initialIndex, formatters })

    const index = calculate(data).map(each => ({
        index: each.index,
        level: each.level,
        date: new Date(each.date),
        format: timeFormat(each.format),
    }))

    return { index }
}

/**
 * Build the provider that turns raw rows into `{ data, xScale, xAccessor,
 * displayXAccessor }` — the shape every chart wants.
 *
 * The returned builder is stateful and chainable in the d3 manner: a setter called with
 * an argument configures and returns the builder, called with none it reads.
 */
export function discontinuousTimeScaleProviderBuilder() {
    let initialIndex = 0
    let realDateAccessor = accessor => accessor
    let inputDateAccessor = datum => datum.date
    let indexAccessor = datum => datum.idx
    let indexMutator = (datum, idx) => ({ ...datum, idx })
    let withIndex
    let currentFormatters = defaultFormatters

    const discontinuousTimeScaleProvider = function (data) {
        let index = withIndex

        if (index === undefined) {
            index = createIndex(realDateAccessor, inputDateAccessor, initialIndex, currentFormatters)(data).index
        }

        const xScale = financeDiscontinuousScale(index)
        const merged = zipper().combine(indexMutator)

        return {
            data: merged(data, index),
            xScale,
            xAccessor: datum => datum && indexAccessor(datum)?.index,
            displayXAccessor: realDateAccessor(inputDateAccessor),
        }
    }

    discontinuousTimeScaleProvider.initialIndex = function (value) {
        if (!arguments.length) return initialIndex
        initialIndex = value
        return discontinuousTimeScaleProvider
    }

    discontinuousTimeScaleProvider.inputDateAccessor = function (accessor) {
        if (!arguments.length) return inputDateAccessor
        inputDateAccessor = accessor
        return discontinuousTimeScaleProvider
    }

    discontinuousTimeScaleProvider.indexAccessor = function (accessor) {
        if (!arguments.length) return indexAccessor
        indexAccessor = accessor
        return discontinuousTimeScaleProvider
    }

    discontinuousTimeScaleProvider.indexMutator = function (mutator) {
        if (!arguments.length) return indexMutator
        indexMutator = mutator
        return discontinuousTimeScaleProvider
    }

    discontinuousTimeScaleProvider.withIndex = function (index) {
        if (!arguments.length) return withIndex
        withIndex = index
        return discontinuousTimeScaleProvider
    }

    /** Shift every date by its own UTC offset, so boundaries fall on UTC instead. */
    discontinuousTimeScaleProvider.utc = () => {
        realDateAccessor = dateAccessor => datum => {
            const date = dateAccessor(datum)
            const offsetInMillis = date.getTimezoneOffset() * 60 * 1000
            return new Date(date.getTime() + offsetInMillis)
        }

        return discontinuousTimeScaleProvider
    }

    discontinuousTimeScaleProvider.setLocale = (locale, formatters) => {
        if (locale !== undefined) timeFormatDefaultLocale(locale)
        if (formatters !== undefined) currentFormatters = formatters

        return discontinuousTimeScaleProvider
    }

    discontinuousTimeScaleProvider.indexCalculator = () =>
        createIndex(realDateAccessor, inputDateAccessor, initialIndex, currentFormatters)

    return discontinuousTimeScaleProvider
}

export default discontinuousTimeScaleProviderBuilder()
