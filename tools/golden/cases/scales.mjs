/**
 * Bài kiểm cho `scales`.
 *
 * File này chạy hai lần với hai `api` khác nhau — một là mã nguồn gốc, một là bản port —
 * rồi so kết quả. Vì cùng một đoạn mã sinh ra cả hai phía nên không có đường nào để hai
 * bên lệch nhau về *cách* kiểm; chỉ còn lệch về *kết quả*, đúng thứ cần đo.
 *
 * Kết quả phải JSON hoá được. Date đổi sang ISO, hàm thì gọi rồi lấy giá trị trả về.
 */

import { datasets, instants } from "../data.mjs"

export const name = "scales"

const iso = value => (value instanceof Date ? value.toISOString() : value)

/** Lấy mẫu thưa: giữ file golden đọc được mà vẫn chạm đầu, giữa, cuối. */
const sample = (array, count = 12) => {
    if (array.length <= count) return array.map((_, i) => i)
    const step = (array.length - 1) / (count - 1)
    return Array.from({ length: count }, (_, i) => Math.round(i * step))
}

const dumpIndexRow = row =>
    row === undefined
        ? null
        : {
              index: row.index,
              level: row.level,
              date: iso(row.date),
              formatted: typeof row.format === "function" ? row.format(row.date) : null,
          }

const dumpScale = scale => {
    const index = scale.index()
    const domain = scale.domain()
    const format = scale.tickFormat()

    const ticksByCount = {}
    for (const count of [2, 5, 10, 20, 50]) {
        const ticks = scale.ticks(count)
        ticksByCount[count] = {
            ticks,
            formatted: ticks.map(format),
        }
    }

    return {
        domain,
        range: scale.range(),
        clamp: scale.clamp(),
        indexLength: index.length,
        indexSample: sample(index).map(i => dumpIndexRow(index[i])),
        ticksByCount,
        applied: [0, 1, 10, 50.5, -3].map(x => scale(x)),
        inverted: [0, 100, 250.7, 800].map(x => scale.invert(x)),
        values: [0, 5, 20, 100].map(x => iso(scale.value(x))),
        // Bản gốc trả về scale nền cho rangeRound nhưng trả về chính nó cho range/domain/
        // clamp/nice. Ghi lại để bản port giữ nguyên chỗ không nhất quán này thay vì
        // "sửa" trong im lặng.
        returnsSelf: {
            domain: scale.domain(domain) === scale,
            range: scale.range(scale.range()) === scale,
            clamp: scale.clamp(scale.clamp()) === scale,
            nice: scale.nice() === scale,
            index: scale.index(index) === scale,
            rangeRound: scale.rangeRound(scale.range()) === scale,
        },
    }
}

export function run(api) {
    const out = { timeFormat: {}, provider: {}, scale: {}, misc: {} }

    for (const date of instants) {
        out.timeFormat[date.toISOString()] = api.timeFormat(date)
    }

    for (const [label, rows] of Object.entries(datasets)) {
        const provider = api.discontinuousTimeScaleProviderBuilder().inputDateAccessor(d => d.date)
        const { data, xScale, xAccessor, displayXAccessor } = provider(rows)

        const picks = sample(data)
        out.provider[label] = {
            dataLength: data.length,
            xValues: picks.map(i => xAccessor(data[i])),
            displayDates: picks.map(i => iso(displayXAccessor(data[i]))),
            indexRows: picks.map(i => dumpIndexRow(data[i].idx)),
            // Mọi cột mốc mà levelDefinition nhận ra, gộp theo mức — đây là chỗ dễ lệch
            // nhất khi port, vì nó phụ thuộc vào cả thứ tự duyệt lẫn phép chia dư.
            levelCounts: xScale.index().reduce((counts, row) => {
                counts[row.level] = (counts[row.level] ?? 0) + 1
                return counts
            }, {}),
        }

        xScale.domain([0, data.length - 1]).range([0, 800])
        out.scale[label] = dumpScale(xScale)
    }

    const utcProvider = api.discontinuousTimeScaleProviderBuilder().inputDateAccessor(d => d.date).utc()
    const utc = utcProvider(datasets.intraday)
    out.misc.utcIndexSample = sample(utc.xScale.index()).map(i => dumpIndexRow(utc.xScale.index()[i]))

    const shifted = api
        .discontinuousTimeScaleProviderBuilder()
        .inputDateAccessor(d => d.date)
        .initialIndex(-100)(datasets.daily)
    out.misc.initialIndex = {
        first: dumpIndexRow(shifted.xScale.index()[0]),
        last: dumpIndexRow(shifted.xScale.index()[shifted.xScale.index().length - 1]),
        ticks: shifted.xScale.domain([-100, -20]).range([0, 600]).ticks(10),
    }

    const builder = api.discontinuousTimeScaleProviderBuilder()
    out.misc.builderGetters = {
        initialIndex: builder.initialIndex(),
        indexAccessorIsFunction: typeof builder.indexAccessor() === "function",
        indexMutatorIsFunction: typeof builder.indexMutator() === "function",
        inputDateAccessorIsFunction: typeof builder.inputDateAccessor() === "function",
        withIndexUndefined: builder.withIndex() === undefined,
        indexCalculatorIsFunction: typeof builder.indexCalculator() === "function",
        chainsToSelf: builder.initialIndex(0) === builder,
    }

    const precomputed = api
        .discontinuousTimeScaleProviderBuilder()
        .inputDateAccessor(d => d.date)
        .indexCalculator()(datasets.monthly).index
    const reused = api
        .discontinuousTimeScaleProviderBuilder()
        .inputDateAccessor(d => d.date)
        .withIndex(precomputed)(datasets.monthly)
    out.misc.withIndex = {
        matchesFreshRun: reused.xScale.index().length === precomputed.length,
        sample: sample(reused.xScale.index()).map(i => dumpIndexRow(reused.xScale.index()[i])),
    }

    const plain = api.defaultScaleProvider(null)
    const applied = plain(datasets.daily, d => d.date)
    out.misc.defaultScaleProvider = {
        keys: Object.keys(applied).sort(),
        sameDataReference: applied.data === datasets.daily,
        xAccessorIsDisplayXAccessor: applied.xAccessor === applied.displayXAccessor,
        firstDate: iso(applied.xAccessor(datasets.daily[0])),
    }

    // Đường copy: phải tách rời hoàn toàn khỏi bản gốc.
    const original = api
        .discontinuousTimeScaleProviderBuilder()
        .inputDateAccessor(d => d.date)(datasets.daily)
        .xScale.domain([0, 100])
        .range([0, 500])
    const copy = original.copy().domain([50, 150])
    out.misc.copy = {
        originalDomain: original.domain(),
        copyDomain: copy.domain(),
        independent: original.domain()[0] !== copy.domain()[0],
    }

    return out
}
