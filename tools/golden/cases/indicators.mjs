/**
 * Bài kiểm cho bậc 5: `indicators`.
 *
 * Toán thuần, không dính DOM — nên quay lại đúng cách của bậc 1: so số, tuyệt đối.
 * Không cần canvas giả, không cần cây SVG.
 */

import { datasets } from "../data.mjs"

export const name = "indicators"

/**
 * Dữ liệu dài để các cửa sổ trượt có chỗ chạy, có mốc lịch cho Kagi/Renko, và — quan
 * trọng — có **khoảng hở qua đêm**.
 *
 * Dữ liệu sinh liên tục thì cả phiên luôn nằm gọn quanh giá đóng cửa hôm trước, nên
 * "true range" luôn bằng cao trừ thấp và phần xét khoảng hở của ATR không bao giờ chạy
 * tới. Thị trường thật thì nhảy: tin ra ngoài giờ, và phiên mở ở một mức khác hẳn.
 */
const GAPS = { 30: 8, 31: -11, 80: -14, 120: 9, 121: 6, 200: -18 }

const rows = datasets.daily.map((row, index) => ({
    ...row,
    ...(GAPS[index] !== undefined
        ? {
              open: row.open + GAPS[index],
              high: Math.max(row.high, row.open + GAPS[index]) + Math.abs(GAPS[index]) / 4,
              low: Math.min(row.low, row.open + GAPS[index]) - Math.abs(GAPS[index]) / 4,
              close: row.close + GAPS[index],
          }
        : {}),
    index,
    startOfYear: index === 0 || row.date.getUTCFullYear() !== datasets.daily[index - 1].date.getUTCFullYear(),
    startOfQuarter: index % 63 === 0,
    startOfMonth: index % 21 === 0,
    startOfWeek: index % 5 === 0,
}))

/** Số làm tròn 1e-9: chênh dưới mức đó là nhiễu dấu phẩy động, không phải khác biệt. */
const tidy = value => {
    if (typeof value === "number") {
        if (!Number.isFinite(value)) return String(value)
        return Math.round(value * 1e9) / 1e9
    }
    if (Array.isArray(value)) return value.map(tidy)
    if (value instanceof Date) return value.toISOString()
    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value)
                .filter(([, each]) => typeof each !== "function")
                .map(([key, each]) => [key, tidy(each)]),
        )
    }
    if (typeof value === "function") return "«function»"
    return value
}

/** Lấy mẫu thưa: giữ file golden đọc được mà vẫn chạm đầu, giữa, cuối. */
const sample = (array, count = 15) => {
    if (!Array.isArray(array)) return tidy(array)
    if (array.length <= count) return array.map(tidy)

    const step = (array.length - 1) / (count - 1)
    return Array.from({ length: count }, (_, i) => tidy(array[Math.round(i * step)]))
}

const summarise = result => ({ length: result.length, sample: sample(result) })

export function run(api) {
    const out = {}

    // ── các đường trung bình ──────────────────────────────────────────────────────

    for (const [name, factory] of [
        ["sma", api.sma],
        ["ema", api.ema],
        ["wma", api.wma],
        ["tma", api.tma],
    ]) {
        out[name] = summarise(factory().options({ windowSize: 10 })(rows, { merge: false }))
        out[`${name}20`] = summarise(factory().options({ windowSize: 20 })(rows, { merge: false }))
        out[`${name}Open`] = summarise(
            factory().options({ windowSize: 10, sourcePath: "open" })(rows, { merge: false }),
        )
        out[`${name}UndefinedLength`] = factory().options({ windowSize: 10 }).undefinedLength()
    }

    // gộp vào dữ liệu: đây mới là cách người dùng gọi thật
    const merged = api.sma().options({ windowSize: 10 }).merge((datum, value) => {
        datum.smaValue = value
    })(rows.map(row => ({ ...row })))
    out.smaMerged = { length: merged.length, sample: sample(merged.map(each => tidy(each.smaValue))) }

    // ── dao động ──────────────────────────────────────────────────────────────────

    out.rsi = summarise(api.rsi().options({ windowSize: 14 })(rows, { merge: false }))
    out.rsi7 = summarise(api.rsi().options({ windowSize: 7 })(rows, { merge: false }))
    out.atr = summarise(api.atr().options({ windowSize: 14 })(rows, { merge: false }))
    out.macd = summarise(api.macd().options({ fast: 12, slow: 26, signal: 9 })(rows, { merge: false }))
    out.macdFast = summarise(api.macd().options({ fast: 5, slow: 10, signal: 4 })(rows, { merge: false }))
    out.stochastic = summarise(
        api.stochasticOscillator().options({ windowSize: 12, kWindowSize: 3, dWindowSize: 3 })(rows, { merge: false }),
    )

    out.bollinger = summarise(
        api.bollingerBand().options({ windowSize: 20, multiplier: 2, movingAverageType: "sma" })(rows, {
            merge: false,
        }),
    )
    out.bollingerEma = summarise(
        api.bollingerBand().options({ windowSize: 20, multiplier: 2.5, movingAverageType: "ema" })(rows, {
            merge: false,
        }),
    )

    out.elderRay = summarise(api.elderRay().options({ windowSize: 13 })(rows, { merge: false }))
    out.elderRayEma = summarise(
        api.elderRay().options({ windowSize: 13, movingAverageType: "ema" })(rows, { merge: false }),
    )

    out.forceIndex = summarise(api.forceIndex()(rows, { merge: false }))
    out.sar = summarise(api.sar().options({ accelerationFactor: 0.02, maxAccelerationFactor: 0.2 })(rows, {
        merge: false,
    }))
    out.sarFast = summarise(api.sar().options({ accelerationFactor: 0.05, maxAccelerationFactor: 0.3 })(rows, {
        merge: false,
    }))

    out.change = summarise(api.change()(rows.map(row => ({ ...row })), { merge: false }))
    out.heikinAshi = summarise(api.heikinAshi()(rows, { merge: false }))

    out.compare = summarise(
        api.compare().options({ basePath: "close", mainKeys: ["open", "close"], compareKeys: [] })(rows, {
            merge: false,
        }),
    )

    // ── biểu đồ không theo thời gian ──────────────────────────────────────────────

    out.kagiAtr = summarise(api.kagi().options({ reversalType: "ATR", windowSize: 14 })(rows.map(r => ({ ...r }))))
    out.kagiFixed = summarise(api.kagi().options({ reversalType: "FIXED", reversal: 3 })(rows.map(r => ({ ...r }))))
    out.renkoAtr = summarise(api.renko().options({ reversalType: "ATR", windowSize: 14 })(rows.map(r => ({ ...r }))))
    out.renkoFixed = summarise(
        api.renko().options({ reversalType: "FIXED", fixedBrickSize: 2 })(rows.map(r => ({ ...r }))),
    )
    out.renkoClose = summarise(
        api.renko().options({ reversalType: "FIXED", fixedBrickSize: 1.5, sourcePath: "close" })(
            rows.map(r => ({ ...r })),
        ),
    )
    out.pointAndFigure = summarise(
        api.pointAndFigure().options({ boxSize: 0.5, reversal: 3 })(rows.map(r => ({ ...r }))),
    )
    out.pointAndFigureBig = summarise(
        api.pointAndFigure().options({ boxSize: 2, reversal: 2, sourcePath: "close" })(rows.map(r => ({ ...r }))),
    )

    // Elder Impulse KHÔNG có mặt ở đây: `elderImpulse()` của bản gốc ném lỗi ngay khi
    // dựng, nên không có gì để so. Bản port đã sửa; xem docs/parity/indicators.md.

    // ── chỉ báo tự định nghĩa ─────────────────────────────────────────────────────

    const custom = api
        .algo()
        .windowSize(5)
        .accumulator(values => values.reduce((total, each) => total + each.close, 0) / values.length)
        .merge((datum, value) => {
            datum.custom = value
        })(rows.map(row => ({ ...row })))
    out.algo = { length: custom.length, sample: sample(custom.map(each => tidy(each.custom))) }

    // ── mặc định và siêu dữ liệu ──────────────────────────────────────────────────

    out.defaultsForComputation = tidy(api.defaultOptionsForComputation)
    out.defaultsForAppearance = tidy(api.defaultOptionsForAppearance.themes)

    // `type()` là API công khai — tooltip và legend đọc nó
    out.types = Object.fromEntries(
        [
            ["sma", api.sma],
            ["ema", api.ema],
            ["wma", api.wma],
            ["tma", api.tma],
            ["rsi", api.rsi],
            ["atr", api.atr],
            ["macd", api.macd],
            ["bollingerBand", api.bollingerBand],
            ["stochasticOscillator", api.stochasticOscillator],
            ["elderRay", api.elderRay],
            ["forceIndex", api.forceIndex],
            ["change", api.change],
            ["compare", api.compare],
            ["heikinAshi", api.heikinAshi],
            ["kagi", api.kagi],
            ["renko", api.renko],
            ["pointAndFigure", api.pointAndFigure],
            ["sar", api.sar],
        ].map(([name, factory]) => [name, factory().type()]),
    )

    return out
}
