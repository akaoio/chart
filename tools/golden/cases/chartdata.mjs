/**
 * Bài kiểm cho phần thuần của `core`: ChartDataUtil, evaluator, zoomBehavior.
 *
 * Đây là đường dữ liệu của chart — từ "người dùng muốn nhìn khoảng nào" ra "vẽ những
 * điểm nào, thang y ra sao". Nó không đụng DOM nên chứng minh được tuyệt đối, và nếu
 * sai thì mọi thứ vẽ lên đều sai theo.
 *
 * Một chỗ có khớp nối: `getNewChartConfig` của bản gốc nhận React children rồi đọc
 * `each.props`. Bản port nhận thẳng props. Bên sinh golden data bọc props lại thành
 * React element — 3 dòng trong generate.mjs, không chứa logic chart nào.
 */

import { scaleLinear, scalePoint } from "d3-scale"
import { datasets } from "../data.mjs"

export const name = "chartdata"

const rows = datasets.daily
const xAccessor = datum => datum.index
const indexed = rows.map((row, index) => ({ ...row, index }))

const dumpScale = scale => ({ domain: scale.domain(), range: scale.range() })

const dumpConfig = config => ({
    id: config.id,
    origin: config.origin,
    padding: config.padding,
    width: config.width,
    height: config.height,
    flipYScale: config.flipYScale,
    yPan: config.yPan,
    yPanEnabled: config.yPanEnabled,
    yScale: dumpScale(config.yScale),
    realYDomain: config.realYDomain,
    yExtentsCount: config.yExtents === undefined ? null : config.yExtents.length,
    // yExtents là mảng hàm — gọi chúng trên một dòng dữ liệu để so kết quả thật
    yExtentsApplied:
        config.yExtents === undefined ? null : config.yExtents.map(each => each(indexed[10], 10, indexed)),
    originalYExtentsProp: Array.isArray(config.originalYExtentsProp) ? config.originalYExtentsProp : null,
})

export function run(api) {
    const out = {}

    const single = [{ id: 0, yExtents: datum => [datum.high, datum.low] }]
    const stacked = [
        { id: "price", height: 300, origin: [0, 0], yExtents: datum => [datum.high, datum.low] },
        { id: "volume", height: 100, origin: (width, height) => [0, height - 100], yExtents: datum => datum.volume },
    ]

    out.getChartOrigin = {
        fixed: api.getChartOrigin([10, 20], 800, 400),
        computed: api.getChartOrigin((width, height) => [width / 2, height - 50], 800, 400),
    }

    out.getDimensions = {
        inherits: api.getDimensions({ width: 800, height: 400 }, {}),
        overrides: api.getDimensions({ width: 800, height: 400 }, { height: 120 }),
    }

    out.getNewChartConfig = {
        single: api.getNewChartConfig({ width: 800, height: 400 }, single).map(dumpConfig),
        stacked: api.getNewChartConfig({ width: 800, height: 400 }, stacked).map(dumpConfig),
        skipsInvalid: api
            .getNewChartConfig({ width: 800, height: 400 }, [null, { noId: true }, { id: 7 }])
            .map(config => config.id),
        fixedExtents: api
            .getNewChartConfig({ width: 800, height: 400 }, [{ id: 0, yExtents: [0, 100] }])
            .map(dumpConfig),
    }

    // Domain đã pan có được giữ qua lần dựng lại không — chỗ này quyết định việc kéo
    // dọc có bị nhảy về chỗ cũ sau mỗi lần cập nhật dữ liệu hay không.
    const panned = api.getNewChartConfig({ width: 800, height: 400 }, [{ id: 0, yExtents: [0, 100], yPanEnabled: true }])
    panned[0].yScale.domain([25, 75])
    out.getNewChartConfig.keepsPannedDomain = api
        .getNewChartConfig({ width: 800, height: 400 }, [{ id: 0, yExtents: [0, 100], yPanEnabled: true }], panned)
        .map(dumpConfig)
    out.getNewChartConfig.fixedExtentsBeatPan = api
        .getNewChartConfig({ width: 800, height: 400 }, [{ id: 0, yExtents: [0, 100] }], panned)
        .map(dumpConfig)

    const configs = api.getNewChartConfig({ width: 800, height: 400 }, stacked)
    const moreProps = {
        plotData: indexed.slice(0, 60),
        fullData: indexed,
        xAccessor,
        displayXAccessor: xAccessor,
    }

    out.getChartConfigWithUpdatedYScales = {
        plain: api.getChartConfigWithUpdatedYScales(configs, moreProps, [0, 59]).map(dumpConfig),
        // dy = kéo dọc 40px, nhưng yPanEnabled chưa bật nên không được đổi gì
        draggedWithoutPanEnabled: api
            .getChartConfigWithUpdatedYScales(configs, moreProps, [0, 59], 40)
            .map(dumpConfig),
        draggedWithPanEnabled: api
            .getChartConfigWithUpdatedYScales(
                api.getNewChartConfig({ width: 800, height: 400 }, stacked.map(c => ({ ...c, yPanEnabled: true }))),
                moreProps,
                [0, 59],
                40,
            )
            .map(dumpConfig),
        // chỉ chart dưới con trỏ mới được kéo theo
        onlyChartsToPan: api
            .getChartConfigWithUpdatedYScales(
                api.getNewChartConfig({ width: 800, height: 400 }, stacked.map(c => ({ ...c, yPanEnabled: true }))),
                moreProps,
                [0, 59],
                40,
                ["price"],
            )
            .map(dumpConfig),
        withCalculator: api
            .getChartConfigWithUpdatedYScales(
                api.getNewChartConfig({ width: 800, height: 400 }, [
                    { id: 0, yExtentsCalculator: ({ plotData }) => [0, plotData.length] },
                ]),
                moreProps,
                [0, 59],
            )
            .map(dumpConfig),
    }

    out.getCurrentCharts = [
        api.getCurrentCharts(configs, [400, 10]),
        api.getCurrentCharts(configs, [400, 150]),
        api.getCurrentCharts(configs, [400, 350]),
        api.getCurrentCharts(configs, [400, 999]),
    ]

    // Thang d3 thật. Cả hai phía đều phân giải d3 từ node_modules của repo này nên
    // không có chuyện lệch phiên bản làm nhiễu kết quả.
    const linear = (domain, range) => scaleLinear().domain(domain).range(range)
    // scalePoint không có invert — đó chính là nhánh thứ hai của getCurrentItem
    const ordinal = (domain, range) => scalePoint().domain(domain).range(range)

    const plotData = indexed.slice(0, 60)
    const xScale = linear([0, 59], [0, 800])

    out.getCurrentItem = [0, 137, 400, 799, 2000].map(x => api.getCurrentItem(xScale, xAccessor, [x, 0], plotData).index)
    out.getCurrentItemOrdinal = api.getCurrentItem(
        ordinal([0, 1, 2, 3], [0, 100, 200, 300]),
        xAccessor,
        [180, 0],
        plotData.slice(0, 4),
    ).index
    out.getXValue = [0, 137, 400, 799, 2000].map(x => api.getXValue(xScale, xAccessor, [x, 0], plotData))

    out.zoomAnchors = {
        mouse: api.mouseBasedZoomAnchor({ xScale, xAccessor, mouseXY: [400, 0], plotData }),
        lastVisible: api.lastVisibleItemBasedZoomAnchor({ xScale, xAccessor, mouseXY: [400, 0], plotData }),
        rightDomain: api.rightDomainBasedZoomAnchor({ xScale, xAccessor, mouseXY: [400, 0], plotData }),
    }

    const evaluate = options =>
        api.evaluator({
            xScale: linear([0, 259], [0, 800]),
            useWholeData: false,
            clamp: false,
            pointsPerPxThreshold: 2,
            minPointsPerPxThreshold: 1 / 100,
            flipXScale: false,
            ...options,
        }).filterData

    const dumpFiltered = ({ plotData: filtered, domain }) => ({
        count: filtered.length,
        firstIndex: filtered.length ? filtered[0].index : null,
        lastIndex: filtered.length ? filtered[filtered.length - 1].index : null,
        domain,
    })

    const initial = linear([0, 259], [0, 800])
    out.evaluator = {
        wholeRange: dumpFiltered(evaluate()(indexed, [0, 259], xAccessor, initial)),
        zoomedIn: dumpFiltered(evaluate()(indexed, [100, 140], xAccessor, initial)),
        // vượt ra ngoài dữ liệu ở cả hai đầu
        beyondBothEnds: dumpFiltered(evaluate()(indexed, [-50, 400], xAccessor, initial)),
        clampBoth: dumpFiltered(evaluate({ clamp: true })(indexed, [-50, 400], xAccessor, initial)),
        clampLeft: dumpFiltered(evaluate({ clamp: "left" })(indexed, [-50, 400], xAccessor, initial)),
        clampRight: dumpFiltered(evaluate({ clamp: "right" })(indexed, [-50, 400], xAccessor, initial)),
        clampFunction: dumpFiltered(
            evaluate({ clamp: (domain, headTail) => [Math.max(domain[0], headTail[0]), domain[1]] })(
                indexed,
                [-50, 400],
                xAccessor,
                initial,
            ),
        ),
        useWholeData: dumpFiltered(evaluate({ useWholeData: true })(indexed, [10, 20], xAccessor, initial)),
        // quá nhiều điểm cho số pixel có — phải bị cắt bớt
        tooDense: dumpFiltered(
            api.evaluator({
                xScale: linear([0, 259], [0, 100]),
                useWholeData: false,
                clamp: false,
                pointsPerPxThreshold: 0.5,
                minPointsPerPxThreshold: 1 / 100,
                flipXScale: false,
            }).filterData(indexed, [0, 259], xAccessor, linear([0, 259], [0, 100])),
        ),
        ignoreThresholds: dumpFiltered(
            evaluate()(indexed, [0, 259], xAccessor, initial, { ignoreThresholds: true }),
        ),
        flipXScale: dumpFiltered(evaluate({ flipXScale: true })(indexed, [100, 140], xAccessor, initial)),
    }

    return out
}
