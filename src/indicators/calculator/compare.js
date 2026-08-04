import { path } from "../utils/index.js"
import { Compare as defaultOptions } from "./defaultOptionsForComputation.js"

/**
 * Everything as a fraction of where it started, so instruments at different prices can
 * share one axis.
 *
 * `mainKeys` are rebased to the *first row* of the chart; `compareKeys` are rebased to
 * each series' own first defined value — a comparison series that starts later still
 * starts from zero rather than jumping.
 */
export default function compareCalculator() {
    let options = defaultOptions

    const calculator = data => {
        const { basePath, mainKeys, compareKeys } = options

        const base = path(basePath)
        const baseValue = base(data[0])
        const firsts = {}

        return data.map(datum => {
            const result = {}

            mainKeys.forEach(key => {
                if (typeof datum[key] === "object") {
                    result[key] = {}
                    Object.keys(datum[key]).forEach(subkey => {
                        result[key][subkey] = (datum[key][subkey] - baseValue) / baseValue
                    })
                } else {
                    result[key] = (datum[key] - baseValue) / baseValue
                }
            })

            compareKeys.forEach(key => {
                if (datum[key] !== undefined && firsts[key] === undefined) firsts[key] = datum[key]
                if (datum[key] !== undefined && firsts[key] !== undefined) {
                    result[key] = (datum[key] - firsts[key]) / firsts[key]
                }
            })

            return result
        })
    }

    calculator.options = newOptions => {
        if (newOptions === undefined) return options
        options = { ...defaultOptions, ...newOptions }
        return calculator
    }

    return calculator
}
