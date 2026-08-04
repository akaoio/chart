import { merge, rebind, slidingWindow } from "../utils/index.js"
import baseIndicator from "./baseIndicator.js"
import { themes } from "./defaultOptionsForAppearance.js"

const ALGORITHM_TYPE = "ElderImpulse"

/**
 * Elder Impulse: colours each bar by whether trend and momentum agree.
 *
 * Green when both a moving average and MACD's divergence are rising, red when both are
 * falling, blue when they disagree. It is the only indicator built from *other
 * indicators' output* — hence `macdSource` and `emaSource`, which must be supplied.
 */
export default function elderImpulseIndicator() {
    let macdSource
    let emaSource

    /**
     * **Sửa một lỗi của bản gốc.** Bản gốc viết `.fill(undefined)` ở đây — nhưng gọi
     * `fill()` không tham số là *đọc* giá trị, nên `base` biến thành một chuỗi màu, và
     * `rebind(indicator, base, "id", ...)` ngay sau đó nổ.
     *
     * Hậu quả: `elderImpulse()` của bản gốc **không dựng lên được**, lần nào cũng ném
     * lỗi. Đây không phải chuyện thẩm mỹ mà là một export hỏng hoàn toàn, nên port
     * trung thành ở đây đồng nghĩa với port một thứ vô dụng.
     *
     * Bỏ hẳn lời gọi ấy: ý định rõ ràng là "không đặt fill", mà không đặt thì đúng là
     * không gọi. Ghi trong docs/parity/indicators.md.
     */
    const base = baseIndicator().type(ALGORITHM_TYPE).stroke(themes.light[ALGORITHM_TYPE].stroke)

    const underlyingAlgorithm = slidingWindow()
        .windowSize(2)
        .undefinedValue("neutral")
        .accumulator(([previous, current]) => {
            if (macdSource === undefined) throw new Error(`macdSource not defined for ${ALGORITHM_TYPE} calculator`)
            if (emaSource === undefined) throw new Error(`emaSource not defined for ${ALGORITHM_TYPE} calculator`)

            const previousMacd = macdSource(previous)
            const previousEMA = emaSource(previous)

            if (previousMacd !== undefined && previousEMA !== undefined) {
                const previousDivergence = previousMacd.divergence
                const currentDivergence = macdSource(current).divergence
                const currentEMA = emaSource(current)

                if (currentDivergence >= previousDivergence && currentEMA >= previousEMA) return "up"
                if (currentDivergence <= previousDivergence && currentEMA <= previousEMA) return "down"
            }

            return "neutral"
        })

    const mergedAlgorithm = merge()
        .algorithm(underlyingAlgorithm)
        .merge((datum, value) => {
            datum.elderImpulse = value
        })

    const indicator = (data, options = { merge: true }) =>
        options.merge ? mergedAlgorithm(data) : underlyingAlgorithm(data)

    indicator.macdSource = function (value) {
        if (!arguments.length) return macdSource
        macdSource = value
        return indicator
    }

    indicator.emaSource = function (value) {
        if (!arguments.length) return emaSource
        emaSource = value
        return indicator
    }

    rebind(indicator, base, "id", "echo", "type", "stroke")
    rebind(indicator, mergedAlgorithm, "merge", "skipUndefined")

    return indicator
}
