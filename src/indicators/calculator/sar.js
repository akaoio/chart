import { mappedSlidingWindow } from "../utils/index.js"
import { SAR as defaultOptions } from "./defaultOptionsForComputation.js"

/** Step both the rising and the falling stop forward, whichever ends up being used. */
const step = (previous, now) => ({
    risingSar: previous.risingSar + previous.af * (previous.risingEp - previous.risingSar),
    fallingSar: previous.fallingSar - previous.af * (previous.fallingSar - previous.fallingEp),
    risingEp: Math.max(previous.risingEp, now.high),
    fallingEp: Math.min(previous.fallingEp, now.low),
})

/**
 * Parabolic SAR — "stop and reverse".
 *
 * A trailing stop that accelerates: every new extreme in the trend's favour speeds it up,
 * so it closes in on price the longer a move runs. When price crosses it, the trend is
 * declared over and the stop flips to the other side — which is the "reverse" in the name.
 *
 * Both directions are tracked at once and only one is used, because which one applies is
 * only known after seeing whether price crossed.
 */
export default function sarCalculator() {
    let options = defaultOptions

    const calculator = data => {
        const { accelerationFactor, maxAccelerationFactor } = options

        const algorithm = mappedSlidingWindow()
            .windowSize(2)
            .undefinedValue(({ high, low }) => ({
                risingSar: low,
                risingEp: high,
                fallingSar: high,
                fallingEp: low,
                af: accelerationFactor,
            }))
            .accumulator(([previous, now]) => {
                const { risingSar, fallingSar, risingEp, fallingEp } = step(previous, now)

                // Not yet committed to a direction, and neither stop was crossed
                if (previous.use === undefined && risingSar > now.low && fallingSar < now.high) {
                    return { risingSar, fallingSar, risingEp, fallingEp }
                }

                const use =
                    previous.use !== undefined
                        ? previous.use === "rising"
                            ? risingSar > now.low
                                ? "falling"
                                : "rising"
                            : fallingSar < now.high
                              ? "rising"
                              : "falling"
                        : risingSar > now.low
                          ? "falling"
                          : "rising"

                // Same direction: accelerate. Reversed: reset and jump the stop across.
                const current =
                    previous.use === use
                        ? {
                              af: Math.min(maxAccelerationFactor, previous.af + accelerationFactor),
                              fallingEp,
                              risingEp,
                              fallingSar,
                              risingSar,
                          }
                        : {
                              af: accelerationFactor,
                              fallingEp: now.low,
                              risingEp: now.high,
                              fallingSar: Math.max(previous.risingEp, now.high),
                              risingSar: Math.min(previous.fallingEp, now.low),
                          }

                const { date, high, low } = now

                return {
                    date,
                    high,
                    low,
                    ...current,
                    use,
                    sar: use === "falling" ? current.fallingSar : current.risingSar,
                }
            })

        return algorithm(data).map(datum => datum.sar)
    }

    calculator.undefinedLength = () => 1

    calculator.options = newOptions => {
        if (newOptions === undefined) return options
        options = { ...defaultOptions, ...newOptions }
        return calculator
    }

    return calculator
}
