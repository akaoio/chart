/**
 * Bài kiểm cho các hàm thuần trong `core/src/utils`.
 *
 * Bản gốc không export nhóm này ra ngoài package nên nó không nằm trong bảng parity,
 * nhưng `scales` dựa hẳn vào `slidingWindow` và `zipper`, và gần như mọi thứ về sau
 * cũng vậy. Sai ở đây thì sai lan khắp nơi mà không ai thấy.
 *
 * Chỉ kiểm phần thuần. `d3Window`, `clearCanvas`, `mousePosition`, `touchPosition` cần
 * DOM nên thuộc bậc 2.
 */

import { datasets } from "../data.mjs"

export const name = "utils"

const closes = datasets.daily.slice(0, 40).map(d => d.close)
const rows = datasets.daily.slice(0, 20)

export function run(api) {
    const out = {}

    out.identity = [api.identity(1), api.identity("a"), api.identity(null)]
    out.noop = api.noop() === undefined

    out.sign = [-5, -0.5, 0, 0.5, 5].map(api.sign)

    out.functor = {
        wrapsValue: api.functor(7)(),
        passesFunctionThrough: api.functor(x => x * 2)(21),
    }

    const nested = { a: { b: { c: 42 } }, list: [{ v: 1 }, { v: 2 }] }
    out.path = {
        empty: api.path()(nested) === nested,
        emptyWithDefault: api.path()(undefined, "fallback"),
        deep: api.path(["a", "b", "c"])(nested),
        missing: api.path(["a", "x", "c"])(nested, "fallback"),
        singleKeyNotArray: api.path("a")(nested).b.c,
        throughArray: api.path(["list", 1, "v"])(nested),
        nullMidway: api.path(["a", "b", "c", "d"])(nested, "fallback"),
    }

    out.isDefined = [0, "", false, null, undefined, NaN].map(api.isDefined)
    out.isNotDefined = [0, null, undefined].map(api.isNotDefined)
    out.isObject = [{}, [], null, "a", 1, new Date(0)].map(api.isObject)

    out.headLast = {
        head: api.head([3, 2, 1]),
        first: api.first([3, 2, 1]),
        firstIsHead: api.first === api.head,
        last: api.last([3, 2, 1]),
        headEmpty: api.head([]),
        lastEmpty: api.last([]),
        headUndefinedArray: api.head(undefined),
        lastUndefinedArray: api.last(undefined),
        // accessor bỏ qua phần tử cho ra undefined — dùng để nhảy qua khoảng trống đầu/cuối
        headWithAccessor: api.head([{ v: undefined }, { v: undefined }, { v: 9 }], d => d.v),
        lastWithAccessor: api.last([{ v: 1 }, { v: undefined }], d => d.v),
        headAccessorAllUndefined: api.head([{ v: undefined }], d => d.v),
    }

    out.getClosestValue = {
        scalar: api.getClosestValue(10, 7),
        array: api.getClosestValue([1, 5, 9], 6),
        negative: api.getClosestValue([-10, 10], -1),
    }

    out.mapObject = {
        values: api.mapObject({ a: 1, b: 2 }),
        doubled: api.mapObject({ a: 1, b: 2 }, v => v * 2),
        withKeys: api.mapObject({ a: 1, b: 2 }, (v, k) => `${k}=${v}`),
        empty: api.mapObject(),
    }

    const same = { x: 1 }
    out.shallowEqual = [
        api.shallowEqual(same, same),
        api.shallowEqual({ a: 1 }, { a: 1 }),
        api.shallowEqual({ a: 1 }, { a: 2 }),
        api.shallowEqual({ a: 1 }, { a: 1, b: 2 }),
        api.shallowEqual({ a: 1, b: 2 }, { a: 1 }),
        api.shallowEqual({ a: { n: 1 } }, { a: { n: 1 } }),
        api.shallowEqual(1, 1),
        api.shallowEqual(null, null),
        api.shallowEqual({ a: 1 }, null),
    ]

    out.zipper = {
        plain: api.zipper()([1, 2, 3], ["a", "b", "c"]),
        combined: api.zipper().combine((n, s) => `${s}${n}`)([1, 2, 3], ["a", "b", "c"]),
        ragged: api.zipper().combine((a, b) => a + b)([1, 2, 3, 4], [10, 20]),
        noArguments: api.zipper()(),
        threeWay: api.zipper().combine((a, b, c) => a + b + c)([1, 2], [10, 20], [100, 200]),
        combineGetter: typeof api.zipper().combine() === "function",
        chainsToSelf: (() => {
            const z = api.zipper()
            return z.combine(x => x) === z
        })(),
    }

    const sma = (period, source) =>
        api
            .slidingWindow()
            .windowSize(period)
            .source(source)
            .accumulator(values => Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 1e6) / 1e6)

    out.slidingWindow = {
        simple: sma(5, d => d)(closes.slice(0, 12)),
        overRows: sma(3, d => d.close)(rows).slice(0, 8),
        undefinedValue: api
            .slidingWindow()
            .windowSize(3)
            .undefinedValue("—")
            .source(d => d)
            .accumulator(v => v.join("+"))([1, 2, 3, 4, 5]),
        skipInitial: api
            .slidingWindow()
            .windowSize(2)
            .skipInitial(2)
            .source(d => d)
            .accumulator(v => v.join("+"))([1, 2, 3, 4, 5, 6]),
        // windowSize nhận cả hàm — functor() bọc lại
        functorWindowSize: api
            .slidingWindow()
            .windowSize(() => 2)
            .source(d => d)
            .accumulator(v => v.join("+"))([1, 2, 3]),
        misc: api
            .slidingWindow()
            .windowSize(2)
            .misc({ tag: "m" })
            .source(d => d)
            .accumulator((v, i, ai, misc) => `${misc.tag}${i}:${ai}`)([1, 2, 3, 4]),
        sourcePath: api
            .slidingWindow()
            .windowSize(2)
            .sourcePath(["close"])
            .accumulator(v => v.length)(rows.slice(0, 5)),
        defaultWindowSize: api.slidingWindow().windowSize(),
        getters: {
            skipInitial: api.slidingWindow().skipInitial(),
            undefinedValue: api.slidingWindow().undefinedValue() === undefined,
            sourceUndefined: api.slidingWindow().source() === undefined,
            accumulatorIsFunction: typeof api.slidingWindow().accumulator() === "function",
        },
    }

    out.accumulatingWindow = {
        groupsOfThree: api
            .accumulatingWindow()
            .accumulateTill((d, i, acc) => acc.length >= 3)
            .accumulator(w => w.join(""))([1, 2, 3, 4, 5, 6, 7]),
        discardTillStart: api
            .accumulatingWindow()
            .discardTillStart(true)
            .accumulateTill((d, i, acc) => d % 3 === 0)
            .accumulator(w => w.join(""))([1, 2, 3, 4, 5, 6, 7]),
        discardTillEnd: api
            .accumulatingWindow()
            .discardTillEnd(true)
            .accumulateTill((d, i, acc) => d % 3 === 0)
            .accumulator(w => w.join(""))([1, 2, 3, 4, 5, 6, 7]),
        withValue: api
            .accumulatingWindow()
            .value(d => d * 10)
            .accumulateTill((d, i, acc) => acc.length >= 2)
            .accumulator(w => w.join("+"))([1, 2, 3, 4, 5]),
        getters: {
            discardTillStart: api.accumulatingWindow().discardTillStart(),
            discardTillEnd: api.accumulatingWindow().discardTillEnd(),
            accumulateTillIsFunction: typeof api.accumulatingWindow().accumulateTill() === "function",
            valueIsFunction: typeof api.accumulatingWindow().value() === "function",
        },
    }

    const items = [10, 20, 30, 40, 50].map(v => ({ v }))
    const at = d => d.v
    out.closestItem = {
        indexes: [5, 10, 22, 30, 47, 50, 99].map(v => api.getClosestItemIndexes(items, v, at)),
        items: [5, 10, 22, 26, 30, 99].map(v => api.getClosestItem(items, v, at).v),
        dates: (() => {
            const byDate = [0, 1, 2, 3].map(i => ({ d: new Date(Date.UTC(2023, 0, 1 + i)) }))
            const accessor = x => x.d
            return [Date.UTC(2023, 0, 1), Date.UTC(2023, 0, 2, 13), Date.UTC(2023, 0, 9)].map(t =>
                api.getClosestItem(byDate, new Date(t), accessor).d.toISOString(),
            )
        })(),
    }

    const dashTypes = [
        undefined,
        "Solid",
        "ShortDash",
        "ShortDash2",
        "ShortDot",
        "ShortDashDot",
        "ShortDashDotDot",
        "Dot",
        "Dash",
        "LongDash",
        "DashDot",
        "LongDashDot",
        "LongDashDotDot",
    ]
    out.strokeDasharray = Object.fromEntries(
        dashTypes.map(type => [
            String(type),
            { svg: api.getStrokeDasharray(type), canvas: api.getStrokeDasharrayCanvas(type) },
        ]),
    )

    // Thang tuyến tính giả, đủ để plotDataLengthBarWidth chạy cả hai nhánh.
    const linear = (domain, range) => {
        const scale = x => range[0] + ((x - domain[0]) / (domain[1] - domain[0])) * (range[1] - range[0])
        scale.domain = () => domain
        scale.range = () => range
        scale.invert = y => domain[0] + ((y - range[0]) / (range[1] - range[0])) * (domain[1] - domain[0])
        return scale
    }
    const ordinal = (domain, range) => {
        const scale = x => range[0] + domain.indexOf(x) * 10
        scale.domain = () => domain
        scale.range = () => range
        return scale
    }
    out.barWidth = {
        numericDomain: api.plotDataLengthBarWidth(
            { widthRatio: 0.8 },
            { xScale: linear([0, 100], [0, 800]), xAccessor: d => d.x, plotData: [{ x: 0 }, { x: 50 }] },
        ),
        // domain không phải số: rơi vào nhánh dùng chính plotData
        dateDomain: api.plotDataLengthBarWidth(
            { widthRatio: 0.5 },
            {
                xScale: linear([new Date(Date.UTC(2023, 0, 1)), new Date(Date.UTC(2023, 0, 11))], [0, 500]),
                xAccessor: d => d.x,
                plotData: [0, 1, 2, 3, 4].map(i => ({ x: new Date(Date.UTC(2023, 0, 1 + i * 2)) })),
            },
        ),
        // thang không có invert: nhánh thứ ba
        ordinalScale: api.plotDataLengthBarWidth(
            { widthRatio: 0.9 },
            { xScale: ordinal(["a", "b", "c", "d"], [0, 400]), xAccessor: d => d.x, plotData: [] },
        ),
    }

    return out
}
