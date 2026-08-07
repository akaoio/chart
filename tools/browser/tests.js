import { ChartCanvas, GenericChartComponent, getAxisCanvas } from "../../src/core/index.js"
import { batched, defineProperties } from "../../src/core/element.js"
import { anchoredBoxGeometry } from "../../src/interactive/components/InteractiveAnchoredBox.js"
import { CircleMarker, getVolumeCandleData } from "../../src/series/index.js"
import "../../src/coordinates/index.js"
import "../../src/tooltip/index.js"
import "../../src/annotations/index.js"
import "../../src/interactive/index.js"
import "../../src/axes/index.js"
import { discontinuousTimeScaleProviderBuilder } from "../../src/scales/index.js"

/**
 * Một series giả, chỉ để đếm.
 *
 * Nó ghi lại mọi lần được yêu cầu vẽ và mọi thứ nó nhìn thấy lúc đó. Nhờ vậy các bài
 * kiểm khẳng định được điều thật sự quan trọng — "cái được vẽ có đúng dữ liệu đang hiển
 * thị không" — chứ không phải "gọi hàm mà không nổ".
 */
class ProbeSeries extends GenericChartComponent {
    draws = []
    strokes = 0
    mouseMoves = 0
    strokeColour = "#ff0000"

    get drawOn() {
        return ["pan", "mousemove", "drag"]
    }

    /** Chỉ được gọi khi sự kiện đã qua cửa lọc theo pane. */
    onMouseMove() {
        this.mouseMoves++
    }

    canvasToDraw(contexts) {
        return getAxisCanvas(contexts)
    }

    canvasDraw(context, moreProps) {
        const { plotData, xScale, xAccessor, chartConfig } = moreProps

        this.draws.push({
            count: plotData?.length ?? 0,
            domain: xScale?.domain?.() ?? null,
            firstX: plotData?.length ? xAccessor(plotData[0]) : null,
            paneId: chartConfig?.id ?? null,
            paneHeight: chartConfig?.height ?? null,
            mouseXY: moreProps.mouseXY ?? null,
        })

        if (!plotData?.length || !chartConfig) return

        // vẽ thật, để bài kiểm soi được pixel
        context.beginPath()
        context.strokeStyle = this.strokeColour
        context.lineWidth = 2
        plotData.forEach((datum, index) => {
            const x = xScale(xAccessor(datum))
            const y = chartConfig.yScale(datum.close)
            if (index === 0) context.moveTo(x, y)
            else context.lineTo(x, y)
        })
        context.stroke()
        this.strokes++
    }
}
customElements.define("probe-series", ProbeSeries)

/** Dữ liệu tất định — không random, không Date.now. */
const makeData = (count = 200) => {
    let state = 42
    const next = () => (state = (state * 48271) % 2147483647) / 2147483647

    let close = 100
    return Array.from({ length: count }, (_, index) => {
        const open = close
        close = Math.round((open + (next() - 0.5) * 4) * 100) / 100
        return {
            date: new Date(Date.UTC(2024, 0, 1 + index)),
            open,
            close,
            high: Math.max(open, close) + 1,
            low: Math.min(open, close) - 1,
            volume: Math.round(next() * 1e6),
        }
    })
}

const stage = document.querySelector("#stage")
const settle = (frames = 3) =>
    new Promise(resolve => {
        const step = left => (left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1)))
        step(frames)
    })

/** Dựng một chart hoàn chỉnh và trả về các phần của nó. */
const mount = ({ panes = [{ chartId: 0 }], count = 200, width = 800, height = 400 } = {}) => {
    const provider = discontinuousTimeScaleProviderBuilder().inputDateAccessor(datum => datum.date)
    const { data, xScale, xAccessor, displayXAccessor } = provider(makeData(count))

    const canvas = document.createElement("chart-canvas")
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    Object.assign(canvas, {
        data,
        xScale,
        xAccessor,
        displayXAccessor,
        ratio: 1,
        width,
        height,
        margin: { top: 10, right: 40, bottom: 30, left: 0 },
        seriesName: "probe",
    })

    const series = []
    for (const paneProps of panes) {
        const pane = document.createElement("chart-pane")
        Object.assign(pane, { yExtents: datum => [datum.high, datum.low], ...paneProps })

        const probe = document.createElement("probe-series")
        pane.append(probe)
        canvas.append(pane)
        series.push(probe)
    }

    stage.append(canvas)
    return { canvas, series, data, xAccessor }
}

const cleanup = () => {
    stage.textContent = ""
}

// ── tiện ích khẳng định ───────────────────────────────────────────────────────────

const makeChecker = () => {
    const checks = []
    const record = (label, pass, expected, actual) =>
        checks.push({ label, pass, expected: String(expected), actual: String(actual) })

    return {
        checks,
        is: (label, actual, expected) => record(label, Object.is(actual, expected), expected, actual),
        ok: (label, actual) => record(label, !!actual, "đúng", actual),
        not: (label, actual, unexpected) =>
            record(label, actual !== unexpected, `khác ${unexpected}`, actual),
        gt: (label, actual, bound) => record(label, actual > bound, `> ${bound}`, actual),
        near: (label, actual, expected, tolerance) =>
            record(label, Math.abs(actual - expected) <= tolerance, `${expected} ±${tolerance}`, actual),
    }
}

/** Kéo chuột thật qua rect bắt sự kiện: xuống, di, lên. */
const dragAcross = async (canvas, fromX, toX, y = 100) => {
    const rect = canvas.shadowRoot.querySelector("[data-event-capture]")
    const box = rect.getBoundingClientRect()

    const at = (type, clientX, target) =>
        target.dispatchEvent(
            new MouseEvent(type, {
                clientX,
                clientY: box.top + y,
                bubbles: true,
                composed: true,
                button: 0,
                buttons: type === "mouseup" ? 0 : 1,
            }),
        )

    at("mousedown", box.left + fromX, rect)
    await settle(1)
    at("mousemove", box.left + toX, window)
    await settle(2)
    at("mouseup", box.left + toX, window)
    await settle(2)
}

const moveMouse = async (canvas, x, y) => {
    const rect = canvas.shadowRoot.querySelector("[data-event-capture]")
    const box = rect.getBoundingClientRect()

    rect.dispatchEvent(new MouseEvent("mouseenter", { clientX: box.left + x, clientY: box.top + y, bubbles: true }))
    await settle(1)
    window.dispatchEvent(new MouseEvent("mousemove", { clientX: box.left + x, clientY: box.top + y, bubbles: true }))
    await settle(2)
}

// ── các bài kiểm ──────────────────────────────────────────────────────────────────

const TESTS = {
    "dựng lên là có dữ liệu, có thang, và vẽ thật ra canvas": async () => {
        const t = makeChecker()
        const { canvas, series } = mount()
        await settle()

        const state = canvas.getState()
        t.ok("có state", state)
        t.gt("plotData có điểm", state.plotData.length, 0)
        t.is("một pane", state.chartConfigs.length, 1)
        t.gt("pane có chiều cao", state.chartConfigs[0].height, 0)

        t.gt("series đã được vẽ", series[0].draws.length, 0)
        t.gt("nét đã được stroke", series[0].strokes, 0)

        const last = series[0].draws.at(-1)
        t.is("số điểm khi vẽ khớp plotData", last.count, state.plotData.length)
        t.is("pane id truyền tới series", last.paneId, 0)

        // soi pixel: canvas axes phải có màu đỏ ở đâu đó
        const context = canvas.getCanvasContexts().axes
        const pixels = context.getImageData(0, 0, context.canvas.width, context.canvas.height).data
        let red = 0
        for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i] > 200 && pixels[i + 3] > 0) red++
        }
        t.gt("có pixel đỏ trên canvas", red, 100)

        cleanup()
        return t.checks
    },

    "kéo chuột làm đổi domain và vẽ lại với dữ liệu mới": async () => {
        const t = makeChecker()
        const { canvas, series } = mount()
        await settle()

        const before = canvas.getState().xScale.domain().map(Number)
        const drawsBefore = series[0].draws.length

        await dragAcross(canvas, 600, 300)

        const after = canvas.getState().xScale.domain().map(Number)

        t.not("domain đã đổi", after[0], before[0])
        t.gt("kéo sang trái thì domain tiến về sau", after[0], before[0])
        t.gt("có vẽ thêm khi kéo", series[0].draws.length, drawsBefore)

        const last = series[0].draws.at(-1)
        t.is("lần vẽ cuối dùng domain mới", String(last.domain.map(Number)), String(after))

        cleanup()
        return t.checks
    },

    "di chuột đặt currentItem và toạ độ theo pane": async () => {
        const t = makeChecker()
        const { canvas, series } = mount()
        await settle()

        await moveMouse(canvas, 400, 120)

        const state = canvas.getState()
        t.ok("có currentItem", state.currentItem)
        t.gt("currentCharts không rỗng", state.currentCharts.length, 0)

        // 399.5 chứ không phải 400, và đó là đúng: vùng vẽ bị dịch nửa pixel
        // (`translate(margin.left + 0.5, ...)`) để nét 1px rơi trọn vào một hàng pixel
        // thay vì đè lên hai hàng. Toạ độ chuột quy về hệ của chart nên mang theo đúng
        // nửa pixel ấy.
        t.is("mouseXY mang nửa pixel của phép dịch cho nét sắc", state.mouseXY[0], 399.5)

        const seen = series[0].draws.at(-1)
        t.ok("series thấy mouseXY", seen.mouseXY !== null)
        // pane này có origin [0, 0] nên trừ đi vẫn thế; pane thứ hai được kiểm ở bài dưới
        t.is("series nhận mouseXY đã trừ origin của pane", seen.mouseXY[0], 399.5)

        cleanup()
        return t.checks
    },

    "getState/setState đưa chart về đúng hình cũ": async () => {
        const t = makeChecker()
        const { canvas, series } = mount()
        await settle()

        const snapshot = canvas.getState()
        const originalDomain = snapshot.xScale.domain().map(Number)
        const originalCount = snapshot.plotData.length

        await dragAcross(canvas, 600, 250)
        const moved = canvas.getState().xScale.domain().map(Number)
        t.not("đã đi chỗ khác", moved[0], originalDomain[0])

        canvas.setState(snapshot)
        await settle()

        const restored = canvas.getState()
        t.is("domain trở về như cũ", String(restored.xScale.domain().map(Number)), String(originalDomain))
        t.is("plotData trở về như cũ", restored.plotData.length, originalCount)

        const last = series[0].draws.at(-1)
        t.is("hình vẽ lại theo state cũ", String(last.domain.map(Number)), String(originalDomain))

        cleanup()
        return t.checks
    },

    "gỡ series ra thì nó thôi được vẽ, chart vẫn chạy": async () => {
        const t = makeChecker()
        const { canvas, series } = mount()
        await settle()

        const probe = series[0]
        t.gt("đã vẽ khi còn gắn", probe.draws.length, 0)

        // Đếm subscription qua API công khai. Chỉ khẳng định "không vẽ nữa" là chưa đủ:
        // series đã gỡ tự bỏ qua lệnh vẽ vì mất tham chiếu canvas, nên phép thử đó vẫn
        // xanh kể cả khi unsubscribe không gỡ gì — đăng ký rác cứ thế tích lại.
        const before = canvas.getAllPanConditions().length

        probe.remove()
        await settle()

        t.is("danh sách đăng ký ngắn đi đúng một", canvas.getAllPanConditions().length, before - 1)

        const drawsAtRemoval = probe.draws.length
        await dragAcross(canvas, 600, 400)

        t.is("gỡ rồi thì không vẽ nữa", probe.draws.length, drawsAtRemoval)
        t.ok("chart vẫn sống", canvas.getState().plotData.length > 0)

        cleanup()
        return t.checks
    },

    "gỡ chart giữa lúc đang kéo thì không để lại listener trên window": async () => {
        const t = makeChecker()
        const { canvas } = mount()
        await settle()

        const rect = canvas.shadowRoot.querySelector("[data-event-capture]")
        const box = rect.getBoundingClientRect()

        // bắt đầu kéo rồi gỡ chart ngay giữa chừng
        rect.dispatchEvent(
            new MouseEvent("mousedown", {
                clientX: box.left + 500,
                clientY: box.top + 100,
                bubbles: true,
                button: 0,
                buttons: 1,
            }),
        )
        await settle(1)

        const domainWhileDragging = canvas.getState().xScale.domain().map(Number)
        canvas.remove()
        await settle()

        // chuột vẫn đang di, nhưng chart đã đi rồi
        let threw = null
        try {
            window.dispatchEvent(new MouseEvent("mousemove", { clientX: box.left + 100, clientY: box.top + 100 }))
            window.dispatchEvent(new MouseEvent("mouseup", { clientX: box.left + 100, clientY: box.top + 100 }))
            await settle(2)
        } catch (error) {
            threw = error.message
        }

        t.is("không nổ", threw, null)
        t.is(
            "chart không còn xử lý chuột nữa",
            String(canvas.getState().xScale.domain().map(Number)),
            String(domainWhileDragging),
        )

        cleanup()
        return t.checks
    },

    "hai chart trên cùng trang không lẫn vào nhau": async () => {
        const t = makeChecker()
        const first = mount({ count: 200 })
        const second = mount({ count: 60 })
        await settle()

        t.is("chart 1 có dữ liệu riêng", first.canvas.getState().fullData.length, 200)
        t.is("chart 2 có dữ liệu riêng", second.canvas.getState().fullData.length, 60)

        t.is("series 1 thuộc canvas 1", first.series[0].canvas, first.canvas)
        t.is("series 2 thuộc canvas 2", second.series[0].canvas, second.canvas)

        const secondDrawsBefore = second.series[0].draws.length
        await dragAcross(first.canvas, 600, 300)

        t.gt("kéo chart 1 thì chart 1 vẽ lại", first.series[0].draws.length, 1)
        t.is("kéo chart 1 KHÔNG làm chart 2 vẽ lại", second.series[0].draws.length, secondDrawsBefore)

        cleanup()
        return t.checks
    },

    "hai pane chồng nhau: mỗi pane có thang y và vùng riêng": async () => {
        const t = makeChecker()
        const { canvas, series } = mount({
            panes: [
                { chartId: "price", height: 260, origin: [0, 0] },
                { chartId: "volume", height: 80, origin: (width, height) => [0, height - 80], yExtents: d => d.volume },
            ],
        })
        await settle()

        const configs = canvas.getState().chartConfigs
        t.is("hai pane", configs.length, 2)
        t.is("pane giá cao 260", configs[0].height, 260)
        t.is("pane khối lượng cao 80", configs[1].height, 80)
        t.gt("pane khối lượng nằm dưới", configs[1].origin[1], configs[0].origin[1])

        t.not("hai thang y khác nhau", String(configs[0].yScale.domain()), String(configs[1].yScale.domain()))

        t.is("series 1 thấy pane của nó", series[0].draws.at(-1).paneId, "price")
        t.is("series 2 thấy pane của nó", series[1].draws.at(-1).paneId, "volume")

        // Nét của pane dưới phải NẰM ở nửa dưới. Chỉ đếm "có pixel màu" là chưa đủ:
        // nếu quên dịch gốc toạ độ về góc pane thì cả hai pane vẽ chồng lên nhau ở
        // trên cùng mà số pixel vẫn y hệt.
        series[1].strokeColour = "#0000ff"
        canvas.redraw()
        await settle()

        const context = canvas.getCanvasContexts().axes
        const { width: pixelWidth, height: pixelHeight } = context.canvas
        const pixels = context.getImageData(0, 0, pixelWidth, pixelHeight).data

        let topBlue = Infinity
        let bottomBlue = -Infinity
        for (let y = 0; y < pixelHeight; y++) {
            for (let x = 0; x < pixelWidth; x++) {
                const i = (y * pixelWidth + x) * 4
                if (pixels[i + 2] > 200 && pixels[i] < 100 && pixels[i + 3] > 0) {
                    if (y < topBlue) topBlue = y
                    if (y > bottomBlue) bottomBlue = y
                }
            }
        }

        // pane khối lượng: origin y 280 + margin.top 10 = 290, cao 80
        t.ok("có vẽ pane khối lượng", topBlue !== Infinity)
        t.gt("nét pane dưới bắt đầu dưới pane trên", topBlue, 270)
        t.ok("và kết thúc trong vùng của nó", bottomBlue <= 375)

        // chuột trong pane dưới: chỉ pane đó nằm trong currentCharts
        await moveMouse(canvas, 400, 330)
        const state = canvas.getState()
        t.ok("currentCharts chỉ chứa pane dưới", state.currentCharts.join(",") === "volume")

        cleanup()
        return t.checks
    },

    "sự kiện chuột chỉ tới series của pane đang trỏ": async () => {
        const t = makeChecker()
        const { canvas, series } = mount({
            panes: [
                { chartId: "price", height: 260, origin: [0, 0] },
                { chartId: "volume", height: 80, origin: (width, height) => [0, height - 80], yExtents: d => d.volume },
            ],
        })
        await settle()

        // Vẽ lại thì CẢ HAI đều vẽ, và đúng như vậy: cả hai dùng chung một lớp canvas
        // vừa bị xoá sạch, ai không vẽ lại thì biến mất. Cửa lọc theo pane nằm ở tầng
        // xử lý sự kiện — hover, click, callback — chứ không ở tầng vẽ.
        const priceDrawsBefore = series[0].draws.length

        await moveMouse(canvas, 400, 330)

        t.gt("cả hai đều vẽ lại vì canvas dùng chung", series[0].draws.length, priceDrawsBefore)

        t.is("chỉ series pane dưới nhận sự kiện chuột", series[1].mouseMoves, 1)
        t.is("series pane trên không nhận gì", series[0].mouseMoves, 0)

        await moveMouse(canvas, 400, 60)

        t.is("giờ đến lượt pane trên nhận", series[0].mouseMoves, 1)
        t.is("và pane dưới không nhận thêm", series[1].mouseMoves, 1)

        cleanup()
        return t.checks
    },

    "chart lồng trong chart: series bám chart gần nhất": async () => {
        const t = makeChecker()

        // Không phải trường hợp lạ: một trang so sánh có thể lồng chart trong chart.
        // Đây là chỗ duy nhất kiểm được rằng "cha gần nhất" thật sự là gần nhất.
        const outer = mount({ count: 200 })
        await settle()

        const holder = document.createElement("div")
        outer.canvas.append(holder)

        const innerBits = mount({ count: 50 })
        holder.append(innerBits.canvas)
        await settle()

        t.is("series bên trong bám canvas bên trong", innerBits.series[0].canvas, innerBits.canvas)
        t.is("series bên ngoài vẫn bám canvas bên ngoài", outer.series[0].canvas, outer.canvas)
        t.is("canvas trong có dữ liệu riêng", innerBits.canvas.getState().fullData.length, 50)
        t.is("canvas ngoài có dữ liệu riêng", outer.canvas.getState().fullData.length, 200)

        cleanup()
        return t.checks
    },

    "thêm series sau khi chart đã dựng thì nó vẫn tìm được chart": async () => {
        const t = makeChecker()
        const { canvas } = mount()
        await settle()

        const pane = canvas.querySelector("chart-pane")
        const late = document.createElement("probe-series")
        pane.append(late)
        await settle()

        t.is("series muộn tìm thấy canvas", late.canvas, canvas)
        t.gt("series muộn được vẽ", late.draws.length, 0)
        t.is("và thấy đúng pane", late.draws.at(-1).paneId, 0)

        cleanup()
        return t.checks
    },

    "đổi dữ liệu khi đang xem điểm mới nhất thì chart trượt theo": async () => {
        const t = makeChecker()
        const { canvas, data } = mount({ count: 100 })
        await settle()

        const before = canvas.getState()
        const beforeEnd = Number(before.xScale.domain()[1])
        const beforeLast = before.fullData.length

        // thêm 10 điểm nữa, giữ nguyên phần đầu
        const provider = discontinuousTimeScaleProviderBuilder().inputDateAccessor(datum => datum.date)
        const extended = provider(
            makeData(110).map((row, index) => (index < 100 ? { ...row } : row)),
        )
        canvas.data = extended.data
        canvas.xScale = extended.xScale
        await settle()

        const after = canvas.getState()
        t.is("dữ liệu đầy đủ dài thêm", after.fullData.length, beforeLast + 10)
        t.gt("cửa sổ trượt sang phải", Number(after.xScale.domain()[1]), beforeEnd)

        cleanup()
        return t.checks
    },
}

TESTS["series và trục thật vẽ ra pixel trong chart thật"] = async () => {
    const t = makeChecker()

    // Không dùng ProbeSeries: đây là các phần tử thật người dùng sẽ viết trong HTML.
    const provider = discontinuousTimeScaleProviderBuilder().inputDateAccessor(datum => datum.date)
    const { data, xScale, xAccessor, displayXAccessor } = provider(makeData(120))

    const canvas = document.createElement("chart-canvas")
    canvas.style.width = "800px"
    canvas.style.height = "400px"
    Object.assign(canvas, {
        data,
        xScale,
        xAccessor,
        displayXAccessor,
        ratio: 1,
        width: 800,
        height: 400,
        margin: { top: 10, right: 60, bottom: 30, left: 0 },
        seriesName: "thật",
    })

    const pane = document.createElement("chart-pane")
    Object.assign(pane, { chartId: "price", yExtents: datum => [datum.high, datum.low] })

    const candles = document.createElement("chart-candlestick-series")
    const line = document.createElement("chart-line-series")
    line.yAccessor = datum => datum.close
    line.strokeStyle = "#9c27b0"
    const xAxisElement = document.createElement("chart-x-axis")
    const yAxisElement = document.createElement("chart-y-axis")

    pane.append(candles, line, xAxisElement, yAxisElement)
    canvas.append(pane)
    stage.append(canvas)
    await settle()

    t.ok("candlestick tìm thấy pane", candles.chartId === "price")
    t.ok("trục x tìm thấy pane", xAxisElement.chartId === "price")
    t.ok("trục x tính được cấu hình", xAxisElement.axisProps !== null)
    t.is("trục x đặt ở đáy pane", xAxisElement.axisProps.transform[1], canvas.getState().chartConfigs[0].height)
    t.is("trục y đặt ở mép phải pane", yAxisElement.axisProps.transform[0], canvas.getState().chartConfigs[0].width)

    const context = canvas.getCanvasContexts().axes
    const { width: pixelWidth, height: pixelHeight } = context.canvas
    const pixels = context.getImageData(0, 0, pixelWidth, pixelHeight).data

    let purple = 0
    let green = 0
    let red = 0
    let black = 0
    for (let i = 0; i < pixels.length; i += 4) {
        const [r, g, b, a] = [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]]
        if (a < 32) continue
        if (r > 130 && r < 190 && b > 150 && g < 80) purple++
        else if (g > 130 && r < 90 && b > 110 && b < 190) green++
        else if (r > 200 && g < 110 && b < 110) red++
        else if (r < 60 && g < 60 && b < 60) black++
    }

    t.gt("nến tăng vẽ ra pixel xanh", green, 50)
    t.gt("nến giảm vẽ ra pixel đỏ", red, 50)
    t.gt("đường giá vẽ ra pixel tím", purple, 50)
    t.gt("trục vẽ ra pixel đen", black, 50)

    // Nhãn trục: chỉ có nếu tickHelper chạy và fillText được gọi
    const labelled = xAxisElement.axisProps.ticks
    t.gt("trục x có tick", labelled, 0)

    cleanup()
    return t.checks
}

TESTS["kéo chart thì series và trục cùng đi theo"] = async () => {
    const t = makeChecker()

    const provider = discontinuousTimeScaleProviderBuilder().inputDateAccessor(datum => datum.date)
    const { data, xScale, xAccessor, displayXAccessor } = provider(makeData(200))

    const canvas = document.createElement("chart-canvas")
    canvas.style.width = "800px"
    canvas.style.height = "400px"
    Object.assign(canvas, {
        data, xScale, xAccessor, displayXAccessor,
        ratio: 1, width: 800, height: 400,
        margin: { top: 10, right: 60, bottom: 30, left: 0 },
        seriesName: "kéo",
    })

    const pane = document.createElement("chart-pane")
    Object.assign(pane, { chartId: 0, yExtents: datum => [datum.high, datum.low] })
    pane.append(document.createElement("chart-candlestick-series"), document.createElement("chart-y-axis"))
    canvas.append(pane)
    stage.append(canvas)
    await settle()

    const context = canvas.getCanvasContexts().axes
    const signature = () => {
        const pixels = context.getImageData(0, 0, context.canvas.width, context.canvas.height).data
        let sum = 0
        for (let i = 0; i < pixels.length; i += 4) sum += pixels[i + 3] ? pixels[i] + pixels[i + 1] * 3 : 0
        return sum
    }

    const before = signature()
    const domainBefore = canvas.getState().xScale.domain().map(Number)

    await dragAcross(canvas, 600, 300)

    const after = signature()
    const domainAfter = canvas.getState().xScale.domain().map(Number)

    t.not("domain đã đổi", domainAfter[0], domainBefore[0])
    t.not("hình vẽ trên canvas cũng đổi theo", after, before)
    t.gt("vẫn còn thứ được vẽ sau khi kéo", after, 0)

    cleanup()
    return t.checks
}

TESTS["cả 25 series dựng được như phần tử trong chart thật"] = async () => {
    const t = makeChecker()

    // Dữ liệu mang đủ trường cho mọi series, kể cả các series gắn chỉ báo
    const raw = makeData(120).map((row, index) => {
        const macd = Math.sin(index / 4) * 2
        return {
            ...row,
            bb: { top: row.high + 2, middle: (row.high + row.low) / 2, bottom: row.low - 2 },
            macd: { macd, signal: Math.sin((index - 2) / 4) * 2, divergence: macd - Math.sin((index - 2) / 4) * 2 },
            rsi: 50 + Math.round(Math.cos(index / 3) * 30),
            stochastic: { K: 50 + Math.round(Math.cos(index / 3) * 40), D: 50 + Math.round(Math.cos(index / 5) * 30) },
            elderRay: { bullPower: (index % 5) - 2, bearPower: 2 - (index % 7) },
            sar: index % 3 === 0 ? row.high + 1 : row.low - 1,
            absoluteChange: row.close - row.open,
            fullyFormed: index < 119,
            startAs: "yang",
            current: row.close,
            reverseAt: row.close - 3,
            direction: index % 2 === 0 ? 1 : -1,
            boxes: [{ open: 100, close: 102 }, { open: 102, close: 104 }],
        }
    })

    const provider = discontinuousTimeScaleProviderBuilder().inputDateAccessor(datum => datum.date)
    const { data, xScale, xAccessor, displayXAccessor } = provider(raw)

    const canvas = document.createElement("chart-canvas")
    canvas.style.width = "800px"
    canvas.style.height = "400px"
    Object.assign(canvas, {
        data, xScale, xAccessor, displayXAccessor,
        ratio: 1, width: 800, height: 400,
        margin: { top: 10, right: 60, bottom: 30, left: 0 },
        seriesName: "tất cả",
    })

    const pane = document.createElement("chart-pane")
    Object.assign(pane, { chartId: 0, yExtents: datum => [datum.high, datum.low] })

    // Mỗi series một phần tử, đặt property đúng như người dùng sẽ làm
    const wanted = [
        ["chart-line-series", { yAccessor: d => d.close }],
        ["chart-area-series", { yAccessor: d => d.close }],
        ["chart-area-only-series", { yAccessor: d => d.close }],
        ["chart-alternating-fill-area-series", { yAccessor: d => d.close, baseAt: 100 }],
        ["chart-straight-line", { yValue: 100 }],
        ["chart-bar-series", { yAccessor: d => d.volume }],
        ["chart-stacked-bar-series", { yAccessor: [d => d.volume / 2, d => d.volume / 3] }],
        ["chart-grouped-bar-series", { yAccessor: [d => d.volume / 2, d => d.volume / 3] }],
        ["chart-overlay-bar-series", { yAccessor: [d => d.volume / 2, d => d.volume / 4] }],
        ["chart-candlestick-series", {}],
        ["chart-ohlc-series", {}],
        ["chart-scatter-series", { yAccessor: d => d.close, marker: CircleMarker }],
        ["chart-bollinger-series", { yAccessor: d => d.bb }],
        ["chart-macd-series", { yAccessor: d => d.macd }],
        ["chart-rsi-series", { yAccessor: d => d.rsi }],
        ["chart-stochastic-series", { yAccessor: d => d.stochastic }],
        ["chart-elder-ray-series", { yAccessor: d => d.elderRay }],
        ["chart-sar-series", { yAccessor: d => d.sar }],
        ["chart-renko-series", {}],
        ["chart-kagi-series", {}],
        ["chart-point-and-figure-series", {}],
        ["chart-volume-profile-series", {}],
        ["chart-x-axis", {}],
        ["chart-y-axis", {}],
    ]

    const made = []
    for (const [tag, props] of wanted) {
        const element = document.createElement(tag)
        t.ok(`${tag} đã đăng ký`, element.constructor !== HTMLElement)
        Object.assign(element, props)
        pane.append(element)
        made.push(element)
    }

    canvas.append(pane)
    stage.append(canvas)
    await settle()

    t.is("mọi phần tử đều tìm được pane", made.filter(e => e.chartId === 0).length, made.length)
    t.gt("chart vẫn có dữ liệu sau khi vẽ tất cả", canvas.getState().plotData.length, 0)

    // AlternateDataSeries: bọc một series bằng dữ liệu khác
    const alternate = document.createElement("chart-alternate-data")
    alternate.data = raw.map((row, i) => ({ ...row, idx: data[i].idx, close: row.close + 5 }))
    const inner = document.createElement("chart-line-series")
    inner.yAccessor = d => d.close
    alternate.append(inner)
    pane.append(alternate)
    await settle()

    t.is("series bên trong bám lớp dữ liệu thay thế", inner.canvas, alternate)
    t.gt("lớp thay thế lọc ra được dữ liệu trong khung nhìn", alternate.contextValues.plotData.length, 0)

    cleanup()
    return t.checks
}

TESTS["coordinates, tooltip và annotation dựng được và vẽ ra pixel"] = async () => {
    const t = makeChecker()

    const provider = discontinuousTimeScaleProviderBuilder().inputDateAccessor(datum => datum.date)
    const { data, xScale, xAccessor, displayXAccessor } = provider(makeData(120))

    const canvas = document.createElement("chart-canvas")
    canvas.style.width = "800px"
    canvas.style.height = "400px"
    Object.assign(canvas, {
        data, xScale, xAccessor, displayXAccessor,
        ratio: 1, width: 800, height: 400,
        margin: { top: 10, right: 60, bottom: 30, left: 0 },
        seriesName: "bậc4",
    })

    const pane = document.createElement("chart-pane")
    Object.assign(pane, { chartId: 0, yExtents: datum => [datum.high, datum.low] })

    const wanted = [
        ["chart-cross-hair-cursor", {}],
        ["chart-cursor", {}],
        ["chart-current-coordinate", { yAccessor: d => d.close }],
        ["chart-mouse-coordinate-x", { displayFormat: v => `t${v}` }],
        ["chart-mouse-coordinate-x-v2", { displayFormat: v => `t${v}` }],
        ["chart-mouse-coordinate-y", { displayFormat: v => v.toFixed(2) }],
        ["chart-price-coordinate", { price: 100 }],
        ["chart-edge-indicator", { yAccessor: d => d.close }],
        ["chart-ohlc-tooltip", {}],
        ["chart-single-value-tooltip", { yLabel: "Giá", yAccessor: d => d.close }],
        ["chart-hover-tooltip", {
            tooltip: { content: ({ currentItem }) => ({ x: "x", y: [{ label: "C", value: String(currentItem.close) }] }) },
        }],
        ["chart-label", { text: "AKAO", x: () => 400, y: () => 200 }],
        ["chart-annotate", {
            with: props => ({ tag: "circle", attrs: { cx: props.xScale(props.xAccessor(props.datum)), cy: 20, r: 3, fill: "#ff00ff" } }),
            when: (d, i) => i % 20 === 0,
        }],
    ]

    const made = []
    for (const [tag, props] of wanted) {
        const element = document.createElement(tag)
        t.ok(`${tag} đã đăng ký`, element.constructor !== HTMLElement)
        Object.assign(element, props)
        pane.append(element)
        made.push(element)
    }

    // một series để có gì đó dưới các lớp trên
    const candles = document.createElement("chart-candlestick-series")
    pane.insertBefore(candles, pane.firstChild)

    canvas.append(pane)
    stage.append(canvas)
    await settle()

    // đưa chuột vào để các lớp phụ thuộc con trỏ có việc mà làm
    await moveMouse(canvas, 400, 150)

    const mouseContext = canvas.getCanvasContexts().mouseCoord
    const mousePixels = mouseContext.getImageData(0, 0, mouseContext.canvas.width, mouseContext.canvas.height).data
    let painted = 0
    for (let i = 3; i < mousePixels.length; i += 4) if (mousePixels[i] > 0) painted++

    t.gt("lớp chuột có được vẽ", painted, 500)

    // annotation vẽ bằng SVG nên phải có node thật trong pane
    const annotate = made.find(e => e.localName === "chart-annotate")
    const circles = annotate.canvas.paneGroup(0).querySelectorAll("circle")
    t.gt("annotation sinh ra node SVG thật", circles.length, 0)
    t.is("và nó là circle như đã mô tả", circles[0].getAttribute("fill"), "#ff00ff")

    // tooltip SVG cũng vậy
    const ohlcTooltip = made.find(e => e.localName === "chart-ohlc-tooltip")
    const texts = ohlcTooltip.canvas.paneGroup(0).querySelectorAll("text")
    t.gt("tooltip sinh ra chữ thật, không phải pixel", texts.length, 0)
    t.ok("chữ trong tooltip đọc được", texts[0].textContent.includes("O"))

    cleanup()
    return t.checks
}

/**
 * Dựng một chart có công cụ vẽ tay, trả về những thứ cần để thao tác.
 *
 * Đây là bộ máy chứng minh mà bậc 6 cần và golden data không thay được: giá trị của một
 * công cụ vẽ nằm ở CHUỖI thao tác — bấm chỗ này, kéo tới chỗ kia, thả, rồi kéo lại đầu
 * mút — chứ không ở một hàm có thể gọi rồi so kết quả.
 */
const mountWithTool = (tagName, toolProps = {}) => {
    const provider = discontinuousTimeScaleProviderBuilder().inputDateAccessor(datum => datum.date)
    const { data, xScale, xAccessor, displayXAccessor } = provider(makeData(120))

    const canvas = document.createElement("chart-canvas")
    canvas.style.width = "800px"
    canvas.style.height = "400px"
    Object.assign(canvas, {
        data, xScale, xAccessor, displayXAccessor,
        ratio: 1, width: 800, height: 400,
        margin: { top: 10, right: 60, bottom: 30, left: 0 },
        seriesName: "tương tác",
    })

    const pane = document.createElement("chart-pane")
    Object.assign(pane, { chartId: 0, yExtents: datum => [datum.high, datum.low] })

    const series = document.createElement("chart-candlestick-series")
    const tool = document.createElement(tagName)
    Object.assign(tool, toolProps)

    pane.append(series, tool)
    canvas.append(pane)
    stage.append(canvas)

    return { canvas, pane, tool, data, xAccessor }
}

/** Bấm chuột tại một điểm trên chart — đủ cả enter, move, down, up để tool nhận được. */
const clickAt = async (canvas, x, y) => {
    const rect = canvas.shadowRoot.querySelector("[data-event-capture]")
    const box = rect.getBoundingClientRect()

    const at = (type, target, extra = {}) =>
        target.dispatchEvent(
            new MouseEvent(type, {
                clientX: box.left + x,
                clientY: box.top + y,
                bubbles: true,
                composed: true,
                button: 0,
                ...extra,
            }),
        )

    at("mouseenter", rect)
    at("mousemove", window)
    await settle(2)
    at("mousedown", rect, { buttons: 1 })
    await settle(1)
    at("mouseup", window, { buttons: 0 })
    at("click", rect)
    await settle(2)
}

/**
 * Chờ qua cửa sổ nhấp đúp.
 *
 * Hai lần bấm trong vòng 400ms **vào cùng một chỗ** là một cú NHẤP ĐÚP, không phải hai cú
 * bấm. Bản gốc không đo khoảng cách, nên với nó hai cú bấm ở đâu cũng vậy; ở đây có đo —
 * xem `DOUBLE_CLICK_SLOP`. Vài bài dưới đây bấm hai lần gần nhau về toạ độ, nên vẫn phải
 * chờ thật.
 */
const pastDoubleClickWindow = () => new Promise(resolve => setTimeout(resolve, 450))

/** Di chuột không bấm. */
const hoverAt = async (canvas, x, y) => {
    const rect = canvas.shadowRoot.querySelector("[data-event-capture]")
    const box = rect.getBoundingClientRect()

    rect.dispatchEvent(new MouseEvent("mouseenter", { clientX: box.left + x, clientY: box.top + y, bubbles: true }))
    window.dispatchEvent(new MouseEvent("mousemove", { clientX: box.left + x, clientY: box.top + y, bubbles: true }))
    await settle(2)
}

TESTS["vẽ được một trendline bằng hai lần bấm"] = async () => {
    const t = makeChecker()

    const completed = []
    const started = []

    const { canvas, tool } = mountWithTool("chart-trend-line", {
        enabled: true,
        snap: false,
        trends: [],
        onStart: () => started.push(true),
        onComplete: (event, trends) => completed.push(trends),
    })
    await settle()

    t.ok("tool dựng được", tool.isConnected)
    t.gt("tool tạo ra phần tử con", tool.children.length, 0)

    // bấm lần một: cố định đầu thứ nhất
    await clickAt(canvas, 200, 150)
    t.is("onStart được gọi", started.length, 1)
    t.is("chưa hoàn thành gì", completed.length, 0)

    // di chuột: đường tạm chạy theo con trỏ
    await hoverAt(canvas, 400, 250)
    const temporary = tool.querySelector("chart-interactive-straight-line")
    t.ok("có đường tạm bám theo chuột", temporary !== null)

    // bấm lần hai: hoàn thành
    await pastDoubleClickWindow()
    await clickAt(canvas, 400, 250)

    t.is("onComplete được gọi đúng một lần", completed.length, 1)
    t.is("và báo về đúng một trendline", completed[0].length, 1)
    t.ok("trendline có hai đầu", completed[0][0].start !== undefined && completed[0][0].end !== undefined)
    t.ok("và được đánh dấu đang chọn", completed[0][0].selected === true)

    // hai đầu phải khác nhau — nếu không thì đó là đường dài 0
    const [start, end] = [completed[0][0].start, completed[0][0].end]
    t.not("hai đầu không trùng nhau", String(start), String(end))

    cleanup()
    return t.checks
}

TESTS["bấm mà không di chuột thì không tạo ra đường dài 0"] = async () => {
    const t = makeChecker()

    const completed = []
    const { canvas } = mountWithTool("chart-trend-line", {
        enabled: true,
        snap: false,
        trends: [],
        onComplete: (event, trends) => completed.push(trends),
    })
    await settle()

    const rect = canvas.shadowRoot.querySelector("[data-event-capture]")
    const box = rect.getBoundingClientRect()

    // Đưa chuột vào một lần để chart biết con trỏ ở đâu
    rect.dispatchEvent(new MouseEvent("mouseenter", { clientX: box.left + 300, clientY: box.top + 200, bubbles: true }))
    window.dispatchEvent(new MouseEvent("mousemove", { clientX: box.left + 300, clientY: box.top + 200, bubbles: true }))
    await settle(2)

    /** Bấm mà TUYỆT ĐỐI không di chuột — đây mới là điều kiện mà cửa chặn canh. */
    const clickWithoutMoving = async () => {
        const at = (type, target, extra = {}) =>
            target.dispatchEvent(
                new MouseEvent(type, {
                    clientX: box.left + 300,
                    clientY: box.top + 200,
                    bubbles: true,
                    composed: true,
                    button: 0,
                    ...extra,
                }),
            )
        at("mousedown", rect, { buttons: 1 })
        await settle(1)
        at("mouseup", window, { buttons: 0 })
        at("click", rect)
        await settle(2)
    }

    await clickWithoutMoving()
    await pastDoubleClickWindow()
    await clickWithoutMoving()

    t.is("không có trendline nào được tạo", completed.length, 0)

    cleanup()
    return t.checks
}

TESTS["trendline đã vẽ thì kéo được, và kéo xong báo lại toạ độ mới"] = async () => {
    const t = makeChecker()

    const completed = []
    const { canvas, tool } = mountWithTool("chart-trend-line", {
        enabled: false,
        snap: false,
        trends: [{ start: [20, 100], end: [60, 105], selected: true, type: "LINE" }],
        onComplete: (event, trends) => completed.push(trends),
    })
    await settle()

    const each = tool.querySelector("chart-each-trend-line")
    t.ok("wrapper được tạo cho trendline có sẵn", each !== null)
    t.gt("wrapper tạo ra đường và chốt kéo", each.children.length, 2)

    // đã chọn nên chốt phải hiện
    const handles = [...each.querySelectorAll("chart-clickable-circle")]
    t.is("có đúng hai chốt", handles.length, 2)
    t.ok("chốt đang hiện vì đường đang được chọn", handles[0].show === true)

    // kéo cả đường
    const rect = canvas.shadowRoot.querySelector("[data-event-capture]")
    const box = rect.getBoundingClientRect()
    const state = canvas.getState()
    const xOf = value => state.xScale(value)
    const yOf = value => state.chartConfigs[0].yScale(value)

    // vào giữa đường rồi kéo xuống
    const midX = (xOf(20) + xOf(60)) / 2
    const midY = (yOf(100) + yOf(105)) / 2

    rect.dispatchEvent(new MouseEvent("mouseenter", { clientX: box.left + midX, clientY: box.top + midY, bubbles: true }))
    window.dispatchEvent(new MouseEvent("mousemove", { clientX: box.left + midX, clientY: box.top + midY, bubbles: true }))
    await settle(2)

    rect.dispatchEvent(
        new MouseEvent("mousedown", { clientX: box.left + midX, clientY: box.top + midY, bubbles: true, button: 0, buttons: 1 }),
    )
    await settle(1)
    // Kéo CHÉO, không chỉ dọc: kéo dọc thì bỏ hẳn phần dịch ngang cũng không lộ ra
    window.dispatchEvent(
        new MouseEvent("mousemove", { clientX: box.left + midX + 80, clientY: box.top + midY + 60, bubbles: true, buttons: 1 }),
    )
    await settle(2)
    window.dispatchEvent(
        new MouseEvent("mouseup", { clientX: box.left + midX + 80, clientY: box.top + midY + 60, bubbles: true, buttons: 0 }),
    )
    await settle(2)

    t.is("kéo xong thì onComplete báo lại", completed.length, 1)

    if (completed.length > 0) {
        const moved = completed[0][0]
        // kéo xuống nghĩa là giá giảm
        t.ok("đầu thứ nhất đã đi xuống", moved.start[1] < 100)
        t.ok("đầu thứ hai cũng đi xuống", moved.end[1] < 105)
        // độ dốc giữ nguyên: cả hai đầu dịch cùng một lượng
        const before = 105 - 100
        const after = moved.end[1] - moved.start[1]
        t.near("độ dốc giữ nguyên khi kéo cả đường", after, before, 0.5)

        // kéo sang phải nghĩa là cả hai đầu tiến về sau theo trục thời gian
        t.gt("đầu thứ nhất dịch sang phải", moved.start[0], 20)
        t.gt("đầu thứ hai dịch sang phải", moved.end[0], 60)
        const spanBefore = 60 - 20
        t.near("độ dài theo trục x giữ nguyên", moved.end[0] - moved.start[0], spanBefore, 1.5)
    }

    cleanup()
    return t.checks
}

TESTS["đổi property của một phần tử thì chart vẽ lại"] = async () => {
    const t = makeChecker()

    const { canvas, pane } = mountWithTool("chart-trend-line", { enabled: false, trends: [] })

    const line = document.createElement("chart-line-series")
    line.yAccessor = datum => datum.close
    line.strokeStyle = "#ff00ff"
    pane.append(line)
    await settle()

    const context = canvas.getCanvasContexts().axes
    const countOf = (test) => {
        const pixels = context.getImageData(0, 0, context.canvas.width, context.canvas.height).data
        let total = 0
        for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i + 3] > 0 && test(pixels[i], pixels[i + 1], pixels[i + 2])) total++
        }
        return total
    }

    const magenta = (r, g, b) => r > 200 && g < 90 && b > 200
    // Vàng: không nến nào (#26a69a, #ef5350) hay pixel khử răng cưa nào của chúng rơi vào
    const yellow = (r, g, b) => r > 200 && g > 200 && b < 60

    t.gt("đường vẽ bằng màu ban đầu", countOf(magenta), 50)
    t.is("chưa có màu mới", countOf(yellow), 0)

    // chỉ đổi MỘT property, không gọi redraw tay
    line.strokeStyle = "#ffff00"
    await settle()

    t.gt("đổi property xong thì màu mới xuất hiện", countOf(yellow), 50)
    t.is("và màu cũ biến mất", countOf(magenta), 0)

    cleanup()
    return t.checks
}

/** Kéo chuột theo đường chéo từ một điểm tới điểm khác, có bấm giữ. */
const dragOn = async (canvas, from, to) => {
    const rect = canvas.shadowRoot.querySelector("[data-event-capture]")
    const box = rect.getBoundingClientRect()

    const at = (type, target, [x, y], extra = {}) =>
        target.dispatchEvent(
            new MouseEvent(type, {
                clientX: box.left + x,
                clientY: box.top + y,
                bubbles: true,
                composed: true,
                button: 0,
                ...extra,
            }),
        )

    at("mouseenter", rect, from)
    at("mousemove", window, from)
    await settle(2)
    at("mousedown", rect, from, { buttons: 1 })
    await settle(1)
    // qua một điểm giữa: kéo một phát tới đích thì vài công cụ không kịp thấy là đang kéo
    at("mousemove", window, [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2], { buttons: 1 })
    await settle(1)
    at("mousemove", window, to, { buttons: 1 })
    await settle(2)
    at("mouseup", window, to, { buttons: 0 })
    // Trình duyệt thật vẫn phát `click` sau khi kéo; chỗ nào không muốn nó thì đã có
    // cửa chặn của EventCapture ("kéo rồi thì không tính là bấm").
    at("click", rect, to)
    await settle(2)
}

/** Đếm pixel khác trống trên lớp canvas chuột — nơi mọi công cụ vẽ. */
const mouseLayerPixels = canvas => {
    const context = canvas.getCanvasContexts().mouseCoord
    const pixels = context.getImageData(0, 0, context.canvas.width, context.canvas.height).data
    let total = 0
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 0) total++
    return total
}

TESTS["vẽ được quạt Gann bằng hai lần bấm"] = async () => {
    const t = makeChecker()

    const completed = []
    const { canvas, tool } = mountWithTool("chart-gann-fan-tool", {
        enabled: true,
        fans: [],
        onComplete: (event, fans) => completed.push(fans),
    })
    await settle()

    await clickAt(canvas, 200, 120)
    await hoverAt(canvas, 450, 280)

    t.ok("có quạt tạm bám theo chuột", tool.querySelector("chart-gann-fan") !== null)

    await pastDoubleClickWindow()
    await clickAt(canvas, 450, 280)

    t.is("onComplete được gọi một lần", completed.length, 1)
    t.is("và báo về đúng một quạt", completed[0].length, 1)
    t.not("hai đầu của tia 1/1 khác nhau", String(completed[0][0].startXY), String(completed[0][0].endXY))

    // dựng lại với quạt vừa vẽ để đếm chín tia thật sự được vẽ ra
    cleanup()
    const second = mountWithTool("chart-gann-fan-tool", { enabled: false, fans: completed[0] })
    await settle()

    const fan = second.tool.querySelector("chart-gann-fan")
    t.ok("quạt đã lưu được dựng lại", fan !== null)
    t.gt("quạt vẽ thật ra pixel", mouseLayerPixels(second.canvas), 500)

    cleanup()
    return t.checks
}

TESTS["kênh song song: hai lần bấm ra đường, lần thứ ba đặt bề rộng"] = async () => {
    const t = makeChecker()

    const completed = []
    const { canvas, tool } = mountWithTool("chart-equidistant-channel", {
        enabled: true,
        channels: [],
        onComplete: (event, channels) => completed.push(channels),
    })
    await settle()

    await clickAt(canvas, 180, 150)
    await pastDoubleClickWindow()
    await hoverAt(canvas, 500, 220)
    await clickAt(canvas, 500, 220)

    t.is("hai lần bấm chưa xong — còn phải đặt bề rộng", completed.length, 0)

    // lần ba không bấm mà chỉ di: dy chạy theo chuột
    await hoverAt(canvas, 500, 300)
    await pastDoubleClickWindow()
    await clickAt(canvas, 500, 300)

    t.is("lần bấm thứ ba mới hoàn thành", completed.length, 1)
    t.is("và báo về đúng một kênh", completed[0].length, 1)
    t.ok("kênh có bề rộng khác 0", Math.abs(completed[0][0].dy) > 0)

    cleanup()
    return t.checks
}

TESTS["Fibonacci: hai lần bấm ra sáu mức"] = async () => {
    const t = makeChecker()

    const completed = []
    const { canvas, tool } = mountWithTool("chart-fibonacci-retracement", {
        enabled: true,
        retracements: [],
        onComplete: (event, retracements) => completed.push(retracements),
    })
    await settle()

    await clickAt(canvas, 200, 120)
    await hoverAt(canvas, 500, 300)
    await pastDoubleClickWindow()
    await clickAt(canvas, 500, 300)

    t.is("onComplete được gọi một lần", completed.length, 1)
    t.is("và báo về đúng một bộ mức", completed[0].length, 1)

    cleanup()
    const second = mountWithTool("chart-fibonacci-retracement", { enabled: false, retracements: completed[0] })
    await settle()

    const each = second.tool.querySelector("chart-each-fib-retracement")
    t.ok("wrapper được dựng", each !== null)
    t.is("sáu mức là sáu đường", each.querySelectorAll("chart-interactive-straight-line").length, 6)
    t.is("mỗi mức có một nhãn", each.querySelectorAll("chart-interactive-label").length, 6)

    cleanup()
    return t.checks
}

TESTS["kênh hồi quy dựng từ dữ liệu nằm giữa hai lần bấm"] = async () => {
    const t = makeChecker()

    const completed = []
    const { canvas } = mountWithTool("chart-standard-deviation-channel", {
        enabled: true,
        channels: [],
        onComplete: (event, channels) => completed.push(channels),
    })
    await settle()

    await clickAt(canvas, 200, 150)
    await hoverAt(canvas, 550, 150)
    await pastDoubleClickWindow()
    await clickAt(canvas, 550, 150)

    t.is("onComplete được gọi một lần", completed.length, 1)
    // kênh chỉ nhớ hai mốc; hình của nó do dữ liệu nằm giữa quyết định
    t.ok("kênh có mốc đầu và mốc cuối", Array.isArray(completed[0][0].start) && Array.isArray(completed[0][0].end))
    t.not("hai mốc x khác nhau", String(completed[0][0].start[0]), String(completed[0][0].end[0]))

    cleanup()
    const second = mountWithTool("chart-standard-deviation-channel", { enabled: false, channels: completed[0] })
    await settle()
    t.gt("kênh vẽ thật ra pixel", mouseLayerPixels(second.canvas), 300)

    cleanup()
    return t.checks
}

TESTS["đặt được nhãn chữ bằng một lần bấm, rồi kéo đi"] = async () => {
    const t = makeChecker()

    const chosen = []
    const dragged = []
    const { canvas, tool } = mountWithTool("chart-interactive-text-tool", {
        enabled: true,
        textList: [],
        onChoosePosition: (event, text) => chosen.push(text),
        onDragComplete: (event, list) => dragged.push(list),
    })
    await settle()

    await clickAt(canvas, 300, 200)

    t.is("một lần bấm là đủ", chosen.length, 1)
    t.ok("nhãn có chỗ đứng", Array.isArray(chosen[0].position))
    t.ok("và có chữ mặc định", typeof chosen[0].text === "string")

    // đặt nhãn vào rồi kéo nó đi
    tool.textList = [{ ...chosen[0], selected: true }]
    await settle()

    const state = canvas.getState()
    const at = chosen[0].position
    const x = state.xScale(at[0])
    const y = state.chartConfigs[0].yScale(at[1])

    // Phải vẽ một lần trước đã: bề rộng chữ chỉ canvas mới đo được, mà chưa đo thì
    // chưa biết hộp rộng bao nhiêu để mà trỏ vào.
    await hoverAt(canvas, x, y)
    await dragOn(canvas, [x, y], [x + 90, y + 70])

    t.is("kéo xong thì onDragComplete báo lại", dragged.length, 1)

    if (dragged.length > 0) {
        const moved = dragged[0][0].position
        t.gt("nhãn dịch sang phải", moved[0], at[0])
        t.ok("và đi xuống", moved[1] < at[1])
    }

    cleanup()
    return t.checks
}

TESTS["cảnh báo giá: kéo thì đổi giá, bấm dấu ✕ thì xoá"] = async () => {
    const t = makeChecker()

    const dragged = []
    const deleted = []

    const alert = {
        id: "a1",
        draggable: true,
        yValue: 0,
        bgFill: "#FFFFFF",
        stroke: "#6574CD",
        strokeDasharray: "ShortDash2",
        strokeWidth: 1,
        textFill: "#6574CD",
        fontFamily: "sans-serif",
        fontSize: 12,
        fontStyle: "normal",
        fontWeight: "normal",
        text: "Alert",
        selected: false,
        textBox: {
            height: 24,
            left: 20,
            padding: { left: 10, right: 5 },
            closeIcon: { padding: { left: 5, right: 8 }, width: 8 },
        },
        edge: {
            stroke: "#6574CD",
            strokeOpacity: 1,
            strokeWidth: 1,
            fill: "#FFFFFF",
            fillOpacity: 1,
            orient: "right",
            at: "right",
            arrowWidth: 10,
            dx: 0,
            rectWidth: 50,
            rectHeight: 20,
            displayFormat: value => value.toFixed(2),
        },
    }

    const { canvas, tool } = mountWithTool("chart-interactive-y-coordinate-tool", {
        yCoordinateList: [],
        onDragComplete: (event, list) => dragged.push(list),
        onDelete: (event, each) => deleted.push(each),
    })
    await settle()

    // đặt cảnh báo vào giữa khung giá đang hiển thị
    const state = canvas.getState()
    const [low, high] = state.chartConfigs[0].yScale.domain()
    const price = (low + high) / 2
    tool.yCoordinateList = [{ ...alert, yValue: price }]
    await settle()

    const yOf = value => canvas.getState().chartConfigs[0].yScale(value)
    const lineY = Math.round(yOf(price))

    t.gt("cảnh báo vẽ thật ra pixel", mouseLayerPixels(canvas), 200)

    // kéo đường xuống: giá phải giảm
    await dragOn(canvas, [400, lineY], [400, lineY + 60])

    t.is("kéo xong thì onDragComplete báo lại", dragged.length, 1)
    if (dragged.length > 0) t.ok("giá đã giảm", dragged[0][0].yValue < price)

    // Dấu ✕ nằm sau chữ trong nhãn, mà chữ rộng bao nhiêu thì chỉ canvas mới biết — nên
    // dò dọc theo đường thay vì đoán một toạ độ.
    const closeIcon = tool.querySelector("chart-clickable-shape")
    t.ok("có dấu ✕", closeIcon !== null)

    const responds = []
    for (let x = 20; x <= 200; x += 2) {
        await hoverAt(canvas, x, lineY)
        if (closeIcon.moreProps?.hovering === true) responds.push(x)
    }

    t.gt("dấu ✕ có chỗ đứng riêng trên đường", responds.length, 0)
    t.ok("và chỉ chiếm một khúc nhỏ", responds.length < 20)

    const middle = responds[Math.floor(responds.length / 2)]
    await pastDoubleClickWindow()
    await clickAt(canvas, middle, lineY)

    t.is("bấm dấu ✕ thì onDelete báo lại", deleted.length, 1)
    if (deleted.length > 0) t.is("và báo đúng cảnh báo ấy", deleted[0].id, "a1")

    // ngay cạnh đó, trên chính đường ấy, bấm không xoá gì
    deleted.length = 0
    await pastDoubleClickWindow()
    await clickAt(canvas, responds[responds.length - 1] + 30, lineY)
    t.is("bấm cạnh dấu ✕ thì không xoá", deleted.length, 0)

    cleanup()
    return t.checks
}

TESTS["quét chọn một khoảng bằng cách kéo"] = async () => {
    const t = makeChecker()

    const brushed = []
    const { canvas } = mountWithTool("chart-brush", {
        enabled: true,
        onBrush: selection => brushed.push(selection),
    })
    await settle()

    await dragOn(canvas, [200, 120], [520, 300])

    t.is("kéo xong thì onBrush báo lại", brushed.length, 1)

    if (brushed.length > 0) {
        const { start, end } = brushed[0]
        t.ok("có mốc đầu", start !== undefined && start.xValue !== undefined)
        t.ok("có mốc cuối", end !== undefined && end.xValue !== undefined)
        t.gt("quét sang phải nên mốc cuối lớn hơn", end.xValue, start.xValue)
        t.ok("kéo xuống nên giá cuối thấp hơn", end.yValue < start.yValue)
    }

    // bấm mà không kéo thì không phải là một lần quét
    brushed.length = 0
    await pastDoubleClickWindow()
    await clickAt(canvas, 300, 200)
    t.is("bấm suông không tính là quét", brushed.length, 0)

    cleanup()
    return t.checks
}

/**
 * Chỗ bản port CỐ TÌNH khác bản gốc.
 *
 * `isHover` của ChannelWithArea bên bản gốc đưa toạ độ pixel vào một hàm chờ toạ độ giá
 * trị, nên thân kênh không bao giờ trỏ vào được — quét cả khung ở bản gốc trúng 0/68.961
 * điểm. Bản port bỏ lần nhân thang thừa ấy; bài này đo kết quả trong chart thật.
 */
TESTS["thân kênh song song trỏ vào được — chỗ bản gốc trỏ mãi không trúng"] = async () => {
    const t = makeChecker()

    const { canvas, tool } = mountWithTool("chart-equidistant-channel", {
        enabled: false,
        channels: [{ startXY: [20, 0], endXY: [60, 0], dy: 0, selected: false }],
    })
    await settle()

    // đặt kênh vào đúng khung giá đang hiển thị
    const state = canvas.getState()
    const [low, high] = state.chartConfigs[0].yScale.domain()
    const startPrice = low + (high - low) * 0.4
    const endPrice = low + (high - low) * 0.6
    const spread = (high - low) * 0.1

    tool.channels = [{ startXY: [20, startPrice], endXY: [60, endPrice], dy: spread, selected: false }]
    await settle()

    const each = tool.querySelector("chart-each-equidistant-channel")
    const channel = each.querySelector("chart-channel-with-area")
    t.ok("kênh được dựng", channel !== null)

    const xOf = value => canvas.getState().xScale(value)
    const yOf = value => canvas.getState().chartConfigs[0].yScale(value)

    // đi vào đúng giữa đường thứ nhất
    const midX = (xOf(20) + xOf(60)) / 2
    const midY = (yOf(startPrice) + yOf(endPrice)) / 2

    await hoverAt(canvas, midX, midY)
    t.ok("trỏ vào thân kênh thì kênh biết", channel.moreProps?.hovering === true)

    // ra xa thì thôi
    await hoverAt(canvas, midX, midY - 90)
    t.ok("ra xa thì thôi", channel.moreProps?.hovering === false)

    cleanup()
    return t.checks
}

/**
 * Chart có cả hai trục, để kéo cho giãn.
 *
 * Trục là thứ duy nhất trong thư viện vừa vẽ canvas vừa đặt một phần tử SVG bắt chuột —
 * nên nó chỉ chứng minh được trong trình duyệt thật, không có cách nào khác.
 */
const mountWithAxes = (axisProps = {}) => {
    const provider = discontinuousTimeScaleProviderBuilder().inputDateAccessor(datum => datum.date)
    const { data, xScale, xAccessor, displayXAccessor } = provider(makeData(200))

    const canvas = document.createElement("chart-canvas")
    canvas.style.width = "800px"
    canvas.style.height = "400px"
    Object.assign(canvas, {
        data, xScale, xAccessor, displayXAccessor,
        ratio: 1, width: 800, height: 400,
        margin: { top: 10, right: 60, bottom: 30, left: 0 },
        seriesName: "trục",
    })

    const pane = document.createElement("chart-pane")
    Object.assign(pane, { chartId: 0, yExtents: datum => [datum.high, datum.low] })

    const series = document.createElement("chart-candlestick-series")
    const xAxis = document.createElement("chart-x-axis")
    const yAxis = document.createElement("chart-y-axis")
    Object.assign(xAxis, axisProps.x ?? {})
    Object.assign(yAxis, axisProps.y ?? {})

    pane.append(series, xAxis, yAxis)
    canvas.append(pane)
    stage.append(canvas)

    return { canvas, pane, xAxis, yAxis, data, xAccessor }
}

const zoomRectFor = (canvas, tag) => canvas.shadowRoot.querySelector(`[data-axis-zoom="${tag}"]`)

/** Kéo trên chính cái rect bắt chuột của trục. */
const dragAxis = async (rect, from, to) => {
    const box = rect.getBoundingClientRect()

    const at = (type, target, [x, y], extra = {}) =>
        target.dispatchEvent(
            new MouseEvent(type, {
                clientX: box.left + x,
                clientY: box.top + y,
                bubbles: true,
                composed: true,
                button: 0,
                ...extra,
            }),
        )

    at("mousedown", rect, from, { buttons: 1 })
    await settle(1)

    // Đứng yên thì TUYỆT ĐỐI không phát mousemove — trình duyệt thật cũng vậy, và đó
    // đúng là điều kiện mà cửa chặn "kéo rồi thì không tính là bấm" canh.
    if (from[0] !== to[0] || from[1] !== to[1]) {
        at("mousemove", window, [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2], { buttons: 1 })
        await settle(1)
        at("mousemove", window, to, { buttons: 1 })
        await settle(2)
    }

    at("mouseup", window, to, { buttons: 0 })
    await settle(2)
}

const span = ([low, high]) => high - low
const middle = ([low, high]) => (low + high) / 2

TESTS["kéo trục thời gian thì chart giãn ra quanh giữa trục"] = async () => {
    const t = makeChecker()

    const { canvas } = mountWithAxes()
    await settle()

    const rect = zoomRectFor(canvas, "chart-x-axis")
    t.ok("trục thời gian có vùng bắt chuột", rect !== null)
    t.is("và nó vô hình", rect.getAttribute("opacity"), "0")

    const before = canvas.getState().xScale.domain()

    // Kéo về phía giữa trục: hai đầu range xích lại, mà domain đọc ở đúng hai chỗ ấy
    // trên thang cũ — nên khoảng nhìn hẹp đi, chart phóng to.
    await dragAxis(rect, [700, 12], [500, 12])
    const after = canvas.getState().xScale.domain()

    t.ok("kéo vào giữa thì nhìn được ít phiên hơn", span(after) < span(before))
    t.near("giữa trục đứng yên", middle(after), middle(before), span(before) * 0.05)

    // kéo ra xa giữa: ngược lại
    const beforeOut = canvas.getState().xScale.domain()
    await dragAxis(rect, [500, 12], [700, 12])
    const afterOut = canvas.getState().xScale.domain()

    t.gt("kéo ra xa thì nhìn được nhiều phiên hơn", span(afterOut), span(beforeOut))

    cleanup()
    return t.checks
}

TESTS["kéo trục giá thì đổi khung giá của pane"] = async () => {
    const t = makeChecker()

    const { canvas } = mountWithAxes()
    await settle()

    const rect = zoomRectFor(canvas, "chart-y-axis")
    t.ok("trục giá có vùng bắt chuột", rect !== null)

    const before = canvas.getState().chartConfigs[0].yScale.domain()

    await dragAxis(rect, [20, 300], [20, 200])
    const after = canvas.getState().chartConfigs[0].yScale.domain()

    t.not("khung giá đã đổi", String(after), String(before))
    t.near("giữa khung giá đứng yên", middle(after), middle(before), span(before) * 0.05)
    t.ok("pane đánh dấu là đã tự đặt khung giá", canvas.getState().chartConfigs[0].yPanEnabled === true)

    // và trục x không bị kéo theo
    cleanup()
    return t.checks
}

TESTS["zoomEnabled sai thì trục không kéo được nữa"] = async () => {
    const t = makeChecker()

    const { canvas, xAxis } = mountWithAxes()
    await settle()

    const rect = zoomRectFor(canvas, "chart-x-axis")
    const before = canvas.getState().xScale.domain()

    await dragAxis(rect, [700, 12], [500, 12])
    t.not("bật thì kéo được", String(canvas.getState().xScale.domain()), String(before))

    xAxis.zoomEnabled = false
    await settle()

    t.is("tắt thì vùng bắt chuột biến mất", zoomRectFor(canvas, "chart-x-axis"), null)

    const stuck = canvas.getState().xScale.domain()
    // kéo lên chính cái rect cũ: nó không còn trong tài liệu nữa
    await dragAxis(rect, [700, 12], [400, 12])
    t.is("và kéo không đổi gì", String(canvas.getState().xScale.domain()), String(stuck))

    cleanup()
    return t.checks
}

TESTS["showTicks sai thì trục thời gian cũng không kéo được"] = async () => {
    const t = makeChecker()

    const { canvas } = mountWithAxes({ x: { showTicks: false } })
    await settle()

    t.is("không có vạch thì không có gì để kéo", zoomRectFor(canvas, "chart-x-axis"), null)
    t.ok("trục giá vẫn kéo được", zoomRectFor(canvas, "chart-y-axis") !== null)

    cleanup()
    return t.checks
}

TESTS["bấm hai lần lên trục là nhấp đúp, kéo rồi nhả thì không"] = async () => {
    const t = makeChecker()

    const doubles = []
    const { canvas, xAxis } = mountWithAxes()
    await settle()

    xAxis.querySelector("chart-axis-zoom-capture").onDoubleClick = (event, position) => doubles.push(position)
    await settle()

    const rect = zoomRectFor(canvas, "chart-x-axis")

    // bấm rồi nhả, không di chuột — hai lần liên tiếp
    await dragAxis(rect, [400, 12], [400, 12])
    t.is("lần đầu chưa phải nhấp đúp", doubles.length, 0)

    await dragAxis(rect, [400, 12], [400, 12])
    t.is("lần thứ hai mới là nhấp đúp", doubles.length, 1)

    // kéo thật rồi nhả: không tính là bấm
    doubles.length = 0
    await dragAxis(rect, [400, 12], [300, 12])
    await dragAxis(rect, [400, 12], [300, 12])
    t.is("kéo rồi nhả không thành nhấp đúp", doubles.length, 0)

    cleanup()
    return t.checks
}

/**
 * Tên thuộc tính SVG, đúng như tài liệu chờ đợi.
 *
 * Mô tả SVG trong thư viện viết theo lối React — `className`, `strokeWidth`, `fontSize` —
 * vì bản gốc viết thế. Đưa thẳng những tên ấy vào tài liệu thì **không nổ**: trình duyệt
 * cất một thuộc tính không ai đọc, phần tử vẽ ra trần trụi, và `class` không tồn tại nên
 * `pointer-events` không bao giờ áp. Nút zoom bấm không ăn chính là vì thế.
 *
 * Bộ so golden không bắt được: nó quy chuẩn tên **ở cả hai phía** trước khi so, nên hai
 * bên vẫn khớp trong khi thứ đi vào tài liệu thì sai. Bài này soi tài liệu thật.
 */
const SVG_CAMEL_CASE_OK = new Set(["viewBox", "preserveAspectRatio", "textLength", "lengthAdjust", "gradientTransform"])

TESTS["SVG dựng ra dùng đúng tên thuộc tính của SVG"] = async () => {
    const t = makeChecker()

    const { canvas, pane } = mountWithTool("chart-zoom-buttons", {})
    await settle()

    // đủ thứ vẽ bằng SVG: tooltip, annotation, nút zoom
    const tooltip = document.createElement("chart-ohlc-tooltip")
    Object.assign(tooltip, { origin: [8, 12], fontSize: 13, fontFamily: "monospace" })

    const average = document.createElement("chart-single-value-tooltip")
    Object.assign(average, { origin: [8, 40], yLabel: "Đóng", yAccessor: datum => datum.close })

    pane.append(tooltip, average)
    await settle(4)

    const nodes = [...canvas.shadowRoot.querySelectorAll("svg *")]
    t.gt("có node SVG để soi", nodes.length, 10)

    const wrong = []
    for (const node of nodes) {
        for (const attribute of node.attributes) {
            if (/[A-Z]/.test(attribute.name) && !SVG_CAMEL_CASE_OK.has(attribute.name)) {
                wrong.push(`${node.localName}[${attribute.name}]`)
            }
        }
    }
    t.is("không thuộc tính nào còn viết hoa kiểu React", wrong.slice(0, 5).join(" "), "")

    // và những cái tên ấy phải THẬT SỰ tới nơi, không chỉ là không sai
    const text = canvas.shadowRoot.querySelector("svg text")
    t.ok("chữ trong tooltip có font-family", text?.getAttribute("font-family") !== null)
    t.ok("chữ trong tooltip có font-size", text?.getAttribute("font-size") !== null)

    const hit = canvas.shadowRoot.querySelector("svg circle.chart-enable-interaction")
    t.ok("nút zoom có class, nên mới nhận được con trỏ", hit !== null)
    t.is(
        "và class ấy bật pointer-events",
        hit === null ? "" : getComputedStyle(hit).pointerEvents,
        "all",
    )

    cleanup()
    return t.checks
}

TESTS["bấm nút zoom thì chart phóng to thật"] = async () => {
    const t = makeChecker()

    const { canvas } = mountWithTool("chart-zoom-buttons", {})
    await settle(4)

    const before = canvas.getState().xScale.domain()
    const span = ([from, to]) => to - from

    const button = kind => canvas.shadowRoot.querySelector(`svg circle.chart-enable-interaction.${kind}`)

    t.ok("có ba nút", ["in", "out", "reset"].every(kind => button(kind) !== null))

    // Bấm đúng lên vòng tròn bắt sự kiện — nếu class không tới nơi thì nó không tồn tại
    // để mà bấm, và bài này đổ ngay ở dòng trên.
    button("in").dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }))
    await new Promise(resolve => setTimeout(resolve, 200))

    const zoomedIn = canvas.getState().xScale.domain()
    t.ok("bấm + thì nhìn được ít phiên hơn", span(zoomedIn) < span(before))

    button("out").dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }))
    await new Promise(resolve => setTimeout(resolve, 200))

    t.gt("bấm − thì nhìn được nhiều hơn lúc vừa phóng", span(canvas.getState().xScale.domain()), span(zoomedIn))

    // ── nút reset ─────────────────────────────────────────────────────────────────
    //
    // Bản gốc để `onReset` trống, nên nút này vẽ ra rồi nằm đó. Ở đây không đặt gì thì
    // nó đưa chart về đúng hình lúc mở — cả khung nhìn x lẫn khung giá người dùng đã kéo.

    button("in").dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }))
    await new Promise(resolve => setTimeout(resolve, 200))
    canvas.yAxisZoom(0, [50, 60])
    await settle(2)

    const disturbed = {
        x: span(canvas.getState().xScale.domain()),
        y: canvas.getState().chartConfigs[0].yScale.domain().join(),
    }
    t.not("đã làm cho chart khác hẳn lúc mở", String(disturbed.x), String(span(before)))

    button("reset").dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }))
    await settle(4)

    t.near("bấm reset thì khung nhìn x về như cũ", span(canvas.getState().xScale.domain()), span(before), 0.001)
    t.not(
        "và khung giá cũng thôi bị ghim",
        canvas.getState().chartConfigs[0].yScale.domain().join(),
        disturbed.y,
    )

    cleanup()
    return t.checks
}

/**
 * Cử chỉ ngón tay: ai được nhận cái gì.
 *
 * `touch-action` là chỗ DUY NHẤT nói được điều này với trình duyệt, và nó phải nói trước
 * khi ngón tay chạm xuống — không có API nào giành lại sau. Bài này khẳng định giá trị
 * đã khai báo; phần thực thi là hợp đồng của nền tảng.
 *
 * Bản thân cú cuộn thì bộ kiểm không dựng lại được: cuộn bằng chạm do compositor lo,
 * mà Chromium chạy nền không cho sự kiện chạm tổng hợp đi tới đó. Vuốt trên chữ cũng
 * không cuộn — nên "không cuộn" ở đây không nói lên điều gì, và không được dùng làm
 * bằng chứng.
 */
TESTS["cử chỉ ngón tay được chia đúng chỗ"] = async () => {
    const t = makeChecker()

    const { canvas } = mountWithAxes()
    await settle(4)

    const capture = canvas.shadowRoot.querySelector("[data-event-capture]")
    t.is(
        "vùng chart: cuộn dọc để cho trang, kéo ngang và bấu để cho chart",
        getComputedStyle(capture).touchAction,
        "pan-y",
    )

    const axis = zoomRectFor(canvas, "chart-y-axis")
    t.is(
        "dải trên trục giá: giữ cả cử chỉ dọc, vì kéo dọc ở đó là giãn thang giá",
        axis === null ? "" : getComputedStyle(axis).touchAction,
        "none",
    )

    cleanup()
    return t.checks
}

/** Tài liệu nói series bọc trong `<div>` vẫn tìm được pane. Đo xem có đúng không. */
TESTS["series bọc trong div vẫn tìm được pane"] = async () => {
    const t = makeChecker()

    const { canvas, pane } = mountWithAxes()

    const wrapper = document.createElement("div")
    const line = document.createElement("chart-line-series")
    Object.assign(line, { yAccessor: datum => datum.close, strokeStyle: "#ff00ff", strokeWidth: 2 })
    wrapper.append(line)
    pane.append(wrapper)

    await settle(4)

    t.ok("series nằm trong div", line.parentElement === wrapper)
    t.ok("vẫn nhận ra chart", line.canvas === canvas)
    t.ok("và nhận ra pane của nó", line.pane === pane)

    const context = canvas.getCanvasContexts().axes
    const pixels = context.getImageData(0, 0, context.canvas.width, context.canvas.height).data
    let magenta = 0
    for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] > 0 && pixels[i] > 200 && pixels[i + 1] < 90 && pixels[i + 2] > 200) magenta++
    }
    t.gt("và vẽ ra thật", magenta, 50)

    cleanup()
    return t.checks
}

/**
 * Kéo mãi cũng không rời khỏi dữ liệu.
 *
 * Kéo quá tay — hay giật chuột ra hẳn ngoài cửa sổ — thì domain được hỏi nằm hoàn toàn
 * ngoài dữ liệu. `filterData` trượt cửa sổ ấy về sát mép gần nhất và giữ nguyên bề rộng,
 * nên chart dừng ở mép chứ không trôi vào khoảng trống và cũng không nổ.
 *
 * Bản gốc chữa chuyện này bằng cách nạp lại khung hình trước, qua hai biến nó tự đặt tên
 * là `hackyWayToStopPanBeyondBounds`. Bản port chữa ở `filterData`, nơi câu trả lời chỉ
 * phụ thuộc vào dữ liệu và domain được hỏi. Xem docs/parity/core.md.
 */
/**
 * Gỡ một phần tử ra khỏi cây thì thứ nó đã vẽ phải biến mất NGAY, không đợi ai chạm vào.
 *
 * Lúc vào cây, phần tử tự hẹn một lần vẽ. Lúc ra thì trước đây không ai xin vẽ lại: SVG của
 * nó được gỡ, còn những gì nó đã tô lên canvas dùng chung vẫn nằm đó. Người dùng thấy đúng
 * điều ấy: "bấm clear thì các thứ đã vẽ không biến mất, nhưng sau đó nếu chạm vào chart thì
 * chúng biến mất".
 *
 * Lỗi có sẵn từ lâu mà không thấy, vì bị một lỗi khác che: mỗi lần dựng lại cây con đều ghi
 * lại toàn bộ prop của con, kể cả prop không đổi, và mỗi lượt ghi lại xin một lần vẽ. Vá cái
 * churn ấy xong thì lỗi này lộ ra.
 *
 * Bài này đếm pixel trước và sau khi gỡ, và **không** chạm vào biểu đồ ở giữa — vì chính cái
 * "phải chạm mới xong" là điều đang bị bắt lỗi.
 */
TESTS["gỡ phần tử ra thì hình nó vẽ biến mất ngay, không cần chạm vào chart"] = async () => {
    const t = makeChecker()

    const { canvas } = mount()
    const pane = canvas.querySelector("chart-pane")

    const series = document.createElement("chart-candlestick-series")
    pane.append(series)
    await settle(6)

    const painted = () => {
        const context = canvas.getCanvasContexts().axes
        const pixels = context.getImageData(0, 0, context.canvas.width, context.canvas.height).data
        let count = 0
        for (let at = 3; at < pixels.length; at += 4) if (pixels[at] > 0) count++
        return count
    }

    const before = painted()
    t.gt("có vẽ ra pixel để mà xoá", before, 1000)

    series.remove()
    await settle(6)

    const after = painted()

    t.ok(`gỡ ra thì pixel giảm hẳn (${before} → ${after})`, after < before / 2)

    cleanup()
    return t.checks
}

/**
 * Một vòng lặp ghi-vẽ-ghi phải làm chart CHẬM, không được làm trang chết.
 *
 * Người dùng báo: "nó đơ tới mức không refresh được luôn". Đó là dấu hiệu rất cụ thể của một
 * chuỗi `queueMicrotask`: microtask chạy TRƯỚC khi trình duyệt lấy lại quyền, nên một
 * microtask hẹn thêm một microtask nữa thì vòng lặp sự kiện không bao giờ được nhường. Trang
 * không vẽ, không nhận thao tác, không refresh được — phải đóng tab.
 *
 * Chuỗi ấy rất dễ hình thành ở đây: ghi một prop thì hẹn dựng lại, dựng lại thì ghi prop của
 * con, con ghi prop thì lại hẹn. Chỉ cần một giá trị trong vòng ấy đổi mỗi lượt là không có
 * điểm dừng.
 *
 * Nên bài này dựng đúng cái vòng vô tận ấy — một phần tử mà `propertyChanged` luôn ghi một
 * giá trị MỚI — rồi khẳng định điều duy nhất đáng khẳng định: sau một khung hình, trang vẫn
 * chạy. `requestAnimationFrame` chỉ nổ được nếu vòng lặp sự kiện còn sống, nên chính nó là
 * phép thử. Không có `deferred` thì bài này treo cả bộ kiểm.
 */
TESTS["vòng lặp ghi-vẽ-ghi làm chart chậm, không làm trang chết"] = async () => {
    const t = makeChecker()

    const { canvas } = mount()
    const pane = canvas.querySelector("chart-pane")

    let writes = 0

    class LoopProbe extends GenericChartComponent {
        #props = defineProperties(this, { spin: 0 })

        get drawOn() {
            return ["mousemove", "pan"]
        }
        canvasToDraw(contexts) {
            return getAxisCanvas(contexts)
        }
        canvasDraw() {}

        /**
         * Đúng hình dạng vòng lặp của các công cụ vẽ thật: ghi → HOÃN → ghi → hoãn.
         *
         * `propertyChanged = batched(...)` là đúng cách mọi công cụ vẽ trong thư viện làm
         * (`batched(() => this.update())`), và `update()` thì ghi lại prop của con. Ghi thẳng
         * trong `propertyChanged` thì chỉ là đệ quy đồng bộ và tràn stack — một hình dạng
         * khác, không phải hình dạng làm chết trang.
         */
        propertyChanged = batched(() => {
            writes++
            if (writes < 5000) this.spin = writes + 1
        })
    }
    if (!customElements.get("loop-probe")) customElements.define("loop-probe", LoopProbe)

    const probe = document.createElement("loop-probe")
    pane.append(probe)
    await settle(4)

    probe.spin = 1

    // Chờ đúng một khung hình. Nếu chuỗi microtask giữ vòng lặp sự kiện thì lời hẹn này
    // không bao giờ tới, và bài kiểm treo — đó cũng là một kết quả, chỉ là kết quả tệ nhất.
    const alive = await new Promise(resolve => {
        const timer = setTimeout(() => resolve(false), 3000)
        requestAnimationFrame(() => {
            clearTimeout(timer)
            resolve(true)
        })
    })

    t.ok("vòng lặp vẫn nhường lại lượt cho trình duyệt", alive)
    t.gt("và vòng lặp thật sự đã chạy, không phải bài kiểm rỗng", writes, 4)
    // Chặn ở ngưỡng chuỗi rồi nhường, chứ không chạy hết 5000 lượt trong một lượt duy nhất.
    t.ok(`chuỗi microtask bị chặn ở ngưỡng, không chạy tràn (${writes} lượt)`, writes < 20)

    cleanup()
    return t.checks
}

TESTS["kéo mãi cũng không kéo chart ra khỏi dữ liệu"] = async () => {
    const t = makeChecker()

    const { canvas, data, xAccessor } = mountWithAxes()
    await settle(4)

    const rect = canvas.shadowRoot.querySelector("[data-event-capture]")
    const box = rect.getBoundingClientRect()

    const at = (type, target, x, extra = {}) =>
        target.dispatchEvent(
            new MouseEvent(type, { clientX: box.left + x, clientY: box.top + 200, bubbles: true, ...extra }),
        )

    const domain = () => canvas.getState().xScale.domain()
    const span = () => domain()[1] - domain()[0]
    const bars = () => canvas.getState().plotData.length
    const lastX = xAccessor(data[data.length - 1])

    const drag = async (steps, size) => {
        at("mouseenter", rect, 700)
        at("mousedown", rect, 700, { buttons: 1 })
        for (let step = 1; step <= steps; step++) {
            at("mousemove", window, 700 - step * size, { buttons: 1 })
            await settle(1)
        }
        at("mouseup", window, 700 - steps * size, { buttons: 0 })
        await settle(3)
    }

    const before = { span: span(), bars: bars() }

    // Kéo sang trái rất xa: đẩy chart về phía tương lai, nơi không còn dữ liệu nào.
    await drag(12, 60)

    t.near("bề rộng khung nhìn giữ nguyên", span(), before.span, before.span * 0.02)
    t.gt("vẫn còn dữ liệu trên màn hình", bars(), 0)
    t.ok("và cây nến cuối cùng vẫn nằm trong khung", domain()[1] >= lastX)

    // Kéo thêm nữa: đã ở mép rồi thì không đi đâu được nữa.
    const atEdge = { left: domain()[0], right: domain()[1], bars: bars() }
    await drag(12, 60)

    t.near("kéo tiếp không dịch được nữa", domain()[0], atEdge.left, 0.001)
    t.near("mép phải cũng đứng yên", domain()[1], atEdge.right, 0.001)
    t.is("và số phiên hiển thị y nguyên", bars(), atEdge.bars)

    // Và một cú giật khổng lồ trong MỘT nhịp — chuột bị lôi ra tận ngoài cửa sổ.
    at("mouseenter", rect, 700)
    at("mousedown", rect, 700, { buttons: 1 })
    at("mousemove", window, -20000, { buttons: 1 })
    await settle(2)
    at("mousemove", window, -60000, { buttons: 1 })
    await settle(2)
    at("mouseup", window, -60000, { buttons: 0 })
    await settle(3)

    t.gt("giật một phát ra ngoài vũ trụ cũng không làm chart trắng", bars(), 0)
    t.ok("và domain vẫn là số", Number.isFinite(domain()[1]))
    t.near("vẫn đứng đúng ở mép", domain()[0], atEdge.left, 0.001)

    cleanup()
    return t.checks
}

TESTS["chart-click-callback nói được đã bấm vào cây nến nào"] = async () => {
    const t = makeChecker()

    const seen = []
    const { canvas } = mountWithTool("chart-click-callback", {
        onClick: (event, moreProps) => seen.push(moreProps),
        onMouseMove: () => {},
    })
    await settle(4)

    t.is("chưa bấm thì chưa báo gì", seen.length, 0)

    await clickAt(canvas, 300, 180)

    t.is("bấm một cái thì báo một lần", seen.length, 1)

    if (seen.length > 0) {
        const { currentItem, mouseXY, chartConfig } = seen[0]
        t.ok("báo kèm cây nến dưới con trỏ", currentItem?.date instanceof Date)
        t.ok("và toạ độ pixel trong pane", Array.isArray(mouseXY) && Number.isFinite(mouseXY[0]))
        t.ok("và cấu hình pane để đổi ngược ra giá", typeof chartConfig?.yScale === "function")

        // đúng cây nến ấy chứ không phải cây bên cạnh
        const state = canvas.getState()
        const nearest = state.plotData.reduce((best, datum) =>
            Math.abs(state.xScale(state.xAccessor(datum)) - mouseXY[0]) <
            Math.abs(state.xScale(state.xAccessor(best)) - mouseXY[0])
                ? datum
                : best,
        )
        t.is("là cây nến gần con trỏ nhất", String(currentItem.date), String(nearest.date))
    }

    cleanup()
    return t.checks
}

TESTS["chart-drawing-object-selector chọn đúng đối tượng bị bấm"] = async () => {
    const t = makeChecker()

    const reports = []

    const { canvas, pane } = mountWithTool("chart-trend-line", {
        enabled: false,
        // hai đường ở hai chỗ khác hẳn nhau
        trends: [
            { start: [10, 100], end: [40, 100], selected: false, type: "LINE" },
            { start: [10, 108], end: [40, 108], selected: false, type: "LINE" },
        ],
    })

    const trendTool = pane.querySelector("chart-trend-line")

    const selector = document.createElement("chart-drawing-object-selector")
    Object.assign(selector, {
        getInteractiveNodes: () => ({ trend: { type: "trend", chartId: 0, node: trendTool } }),
        drawingObjectMap: { trend: "trends" },
        // `getInteraction` dùng `mapObject`, mà `mapObject` của bản gốc trả về MỘT MẢNG
        // chứ không phải object cùng khoá — đúng như lodash. Nên đọc theo thứ tự, không
        // theo tên.
        onSelect: (event, interactives) => reports.push(interactives[0].objects),
    })
    pane.append(selector)
    await settle(4)

    const state = canvas.getState()
    const yOf = value => state.chartConfigs[0].yScale(value)
    const xOf = value => state.xScale(value)

    // bấm lên đường thứ nhất
    await hoverAt(canvas, xOf(25), yOf(100))
    await clickAt(canvas, xOf(25), yOf(100))

    // `objects` là chính danh sách đối tượng, mỗi cái kèm `selected` — không phải mảng
    // boolean. Đó là hình dạng `isHoverForInteractiveType` trả về.
    const chosen = () => reports[reports.length - 1].map(object => object.selected === true)

    t.gt("bấm lên đường thì selector báo", reports.length, 0)
    if (reports.length > 0) {
        t.is("đường thứ nhất được chọn", chosen()[0], true)
        t.is("và đường thứ hai thì không", chosen()[1], false)
    }

    // rồi bấm lên đường thứ hai
    reports.length = 0
    await pastDoubleClickWindow()
    await hoverAt(canvas, xOf(25), yOf(108))
    await clickAt(canvas, xOf(25), yOf(108))

    if (reports.length > 0) {
        t.is("giờ đến lượt đường thứ hai", chosen()[1], true)
        t.is("và đường thứ nhất thôi được chọn", chosen()[0], false)
    }

    // bấm ra chỗ trống: không đường nào
    reports.length = 0
    await pastDoubleClickWindow()
    await hoverAt(canvas, xOf(25), yOf(130))
    await clickAt(canvas, xOf(25), yOf(130))

    if (reports.length > 0) {
        t.is("bấm ra chỗ trống thì không đường nào được chọn", chosen().filter(Boolean).length, 0)
    }

    cleanup()
    return t.checks
}

/**
 * Kéo dọc phải đi đúng bằng quãng đường ngón tay đi — và đi ngay lúc ấy.
 *
 * Lỗi anh Huy tìm ra trên trang thật: chỉ cần chạm vào trục giá một lần (thứ bật
 * `yPanEnabled`), rồi kéo nến theo chiều dọc, thì nến trôi xa gấp mấy lần con trỏ, không
 * nhúc nhích trong lúc kéo, rồi nhảy một phát khi thả tay. Hai nguyên nhân rời nhau:
 *
 *   1. `handlePan` nạp kết quả từng khung hình vào `#state`, mà `#panHelper` lại tính
 *      `dy` từ mốc đặt tay xuống — nên mỗi khung cộng thêm một lần nữa lên một thang đã
 *      dịch rồi. Độ dịch phình theo bình phương.
 *   2. Sự kiện `pan` mang danh sách pane dưới tên `chartConfigs`, còn phép thu hẹp về
 *      một pane lại đi tìm `chartConfig` — nên suốt cú kéo, mọi phần tử vẫn vẽ theo
 *      thang y cũ.
 *
 * Bài này đo cả hai: vẽ ra ở đâu trong lúc kéo, và dừng ở đâu sau khi thả.
 */
TESTS["kéo dọc đi đúng quãng đường của con trỏ, và đi ngay lúc kéo"] = async () => {
    const t = makeChecker()

    const { canvas, pane } = mountWithAxes()

    // Một phần tử chỉ để ghi lại: mỗi lần được yêu cầu vẽ, thang y nó NHÌN THẤY là gì.
    const painted = []
    class DomainProbe extends GenericChartComponent {
        get drawOn() {
            return ["pan", "mousemove", "drag"]
        }
        canvasToDraw(contexts) {
            return getAxisCanvas(contexts)
        }
        canvasDraw(context, moreProps) {
            if (moreProps.chartConfig?.yScale) painted.push(moreProps.chartConfig.yScale.domain()[0])
        }
    }
    if (!customElements.get("domain-probe")) customElements.define("domain-probe", DomainProbe)
    pane.append(document.createElement("domain-probe"))

    await settle(4)

    const rect = canvas.shadowRoot.querySelector("[data-event-capture]")
    const box = rect.getBoundingClientRect()
    const at = (type, target, y, extra = {}) =>
        target.dispatchEvent(
            new MouseEvent(type, { clientX: box.left + 400, clientY: box.top + y, bubbles: true, ...extra }),
        )

    // Chưa chạm vào trục giá thì kéo dọc KHÔNG được đổi gì — đúng như anh Huy mô tả.
    const untouched = canvas.getState().chartConfigs[0].yScale.domain().join()
    at("mouseenter", rect, 200)
    at("mousedown", rect, 200, { buttons: 1 })
    at("mousemove", window, 320, { buttons: 1 })
    await settle(2)
    at("mouseup", window, 320, { buttons: 0 })
    await settle(3)

    t.is("chưa động vào trục giá thì kéo dọc không đổi gì", canvas.getState().chartConfigs[0].yScale.domain().join(), untouched)

    // Chạm vào trục giá: đúng thao tác bật `yPanEnabled` mà người dùng làm.
    canvas.yAxisZoom(0, canvas.getState().chartConfigs[0].yScale.domain())
    await settle(2)

    const yScale = () => canvas.getState().chartConfigs[0].yScale
    const perPixel = Math.abs(yScale().invert(0) - yScale().invert(1))
    const before = yScale().domain()[0]

    at("mouseenter", rect, 200)
    at("mousedown", rect, 200, { buttons: 1 })

    const seen = []
    for (const step of [20, 40, 60, 80, 100]) {
        at("mousemove", window, 200 + step, { buttons: 1 })
        await settle(2)
        seen.push({ step, drawn: painted[painted.length - 1] - before })
    }

    at("mouseup", window, 300, { buttons: 0 })
    await settle(3)

    // 1) Trong lúc kéo, hình vẽ đi theo con trỏ — không đứng im.
    t.ok("kéo dọc thì nến di chuyển ngay trong lúc kéo", seen.every(each => Math.abs(each.drawn) > 0))

    // 2) Và đi đúng quãng đường ấy, không hơn. Sai số một pixel là đủ chặt.
    for (const { step, drawn } of seen) {
        t.near(`kéo ${step}px thì thang y dịch đúng ${step}px`, drawn, step * perPixel, perPixel * 1.5)
    }

    // 3) Thả tay ra không nhảy đi đâu cả.
    t.near("thả tay ra thì đứng đúng chỗ đang vẽ", yScale().domain()[0] - before, 100 * perPixel, perPixel * 1.5)

    cleanup()
    return t.checks
}

/**
 * Dữ liệu khách phải là dữ liệu khách **trong lúc kéo**, không chỉ lúc đứng yên.
 *
 * Người dùng thấy: đường của dữ liệu khách thưa, nhưng vừa đặt tay kéo là nó khớp khít
 * từng cây nến, thả tay ra thì lại thưa như cũ. Lý do nằm ở đường dẫn nóng: `pan` không
 * dựng lại gì cả, nó phát thẳng state mới tới từng phần tử đã đăng ký, và trong gói ấy có
 * `plotData` của **chart**. `getMoreProps()` trải `this.moreProps` sau cùng, nên cái vừa
 * phát vào đè lên `plotData` mà lớp dữ liệu thay thế cấp — series con vẽ closes của chính
 * bộ nến. Thả tay thì `refreshFromContext()` đặt lại từ context, nên nó tự khỏi.
 *
 * Bài này canh đúng cái nhìn thấy: số hàng mà series con NHÌN THẤY mỗi lần được vẽ.
 */
TESTS["dữ liệu khách vẫn là của khách trong lúc kéo"] = async () => {
    const t = makeChecker()

    const { canvas, pane } = mountWithAxes()
    const { data, xAccessor } = canvas

    // Khách thưa hẳn: một hàng mỗi năm hàng của chart. Dữ liệu khách khớp một-đối-một thì
    // bài này không thể đỏ, vì hai con số bằng nhau — đó chính là chỗ bài cũ mù.
    const guest = []
    for (let index = 0; index < data.length; index += 5) {
        guest.push({ idx: data[index].idx, close: 500 + index })
    }

    const alternate = document.createElement("chart-alternate-data")
    alternate.data = guest

    const seen = []
    class GuestProbe extends GenericChartComponent {
        get drawOn() {
            return ["pan", "mousemove", "drag"]
        }
        canvasToDraw(contexts) {
            return getAxisCanvas(contexts)
        }
        canvasDraw(context, moreProps) {
            seen.push(moreProps.plotData.length)
        }
    }
    if (!customElements.get("guest-probe")) customElements.define("guest-probe", GuestProbe)

    alternate.append(document.createElement("guest-probe"))
    pane.append(alternate)
    await settle(4)

    const host = canvas.getState().plotData.length
    const narrowed = alternate.contextValues.plotData.length

    t.gt("khách có hàng trong khung nhìn", narrowed, 0)
    t.ok("khách thưa hơn chart hẳn một bậc", narrowed < host / 3)

    // Kéo ngang thật, và đọc lại từng lần vẽ TRONG lúc tay còn đặt xuống.
    const rect = canvas.shadowRoot.querySelector("[data-event-capture]")
    const box = rect.getBoundingClientRect()
    const at = (type, target, x, extra = {}) =>
        target.dispatchEvent(
            new MouseEvent(type, { clientX: box.left + x, clientY: box.top + 200, bubbles: true, ...extra }),
        )

    at("mouseenter", rect, 400)
    at("mousedown", rect, 400, { buttons: 1 })

    seen.length = 0
    for (const step of [20, 40, 60, 80]) {
        at("mousemove", window, 400 - step, { buttons: 1 })
        await settle(2)
    }

    const duringPan = [...seen]

    at("mouseup", window, 320, { buttons: 0 })
    await settle(3)

    t.gt("có vẽ lại trong lúc kéo", duringPan.length, 0)
    t.ok(
        "trong lúc kéo, series con vẫn chỉ thấy hàng của khách",
        duringPan.every(count => count > 0 && count < host / 3),
    )
    t.is(
        "không lần vẽ nào thấy đúng số hàng của chart",
        duringPan.filter(count => count === host).length,
        0,
    )

    cleanup()
    return t.checks
}

/** Một cú vuốt bằng ngón tay, dựng bằng TouchEvent thật của trình duyệt. */
const swipeTouch = async (canvas, from, to, steps = 5) => {
    const rect = canvas.shadowRoot.querySelector("[data-event-capture]")
    const box = rect.getBoundingClientRect()

    const touchAt = (x, y) =>
        new Touch({ identifier: 1, target: rect, clientX: box.left + x, clientY: box.top + y })

    const fire = (type, target, x, y) => {
        const touches = type === "touchend" ? [] : [touchAt(x, y)]
        target.dispatchEvent(new TouchEvent(type, { touches, targetTouches: touches, changedTouches: [touchAt(x, y)], bubbles: true, cancelable: true }))
    }

    fire("touchstart", rect, from[0], from[1])
    await settle(1)

    for (let step = 1; step <= steps; step++) {
        const at = axis => from[axis] + ((to[axis] - from[axis]) * step) / steps
        fire("touchmove", window, at(0), at(1))
        await settle(1)
    }

    fire("touchend", window, to[0], to[1])
    await settle(3)
}

/**
 * Ngón tay phải kéo được đối tượng đã vẽ, và lúc ấy chart KHÔNG được pan.
 *
 * Đây là chỗ bản gốc dừng lại: `#handleMouseDown` có nhánh quyết định "cú này là pan hay là
 * kéo một đối tượng" — hỏi `getPanConditions()` của mọi phần tử — còn `#handleTouchStart`
 * thì không, một ngón tay luôn là pan. Nên trên điện thoại tám công cụ vẽ chỉ đặt được rồi
 * thôi. Xem issue #3.
 *
 * Bài này canh hai nửa của cùng một cử chỉ, vì một nửa đúng mà nửa kia sai thì vẫn là sai:
 * đối tượng phải đi theo ngón tay, **và** khung nhìn phải đứng im.
 */
TESTS["ngón tay kéo được đối tượng đã chọn, và chart không pan theo"] = async () => {
    const t = makeChecker()

    const completed = []
    const { canvas, tool } = mountWithTool("chart-trend-line", {
        enabled: false,
        snap: false,
        trends: [{ start: [20, 100], end: [60, 105], selected: true, type: "LINE" }],
        // `TrendLine` báo mọi thay đổi qua `onComplete`, kể cả sau một cú kéo — không có
        // `onDragComplete` riêng. Đó là hình dạng của bản gốc.
        onComplete: (event, trends) => completed.push(trends),
    })
    await settle(4)

    const state = canvas.getState()
    const xOf = value => state.xScale(value)
    const yOf = value => state.chartConfigs[0].yScale(value)

    const midX = (xOf(20) + xOf(60)) / 2
    const midY = (yOf(100) + yOf(105)) / 2

    const domainBefore = canvas.getState().xScale.domain().map(Number)

    // Kéo CHÉO từ giữa đường: kéo dọc thôi thì bỏ hẳn phần dịch ngang cũng không lộ ra.
    await swipeTouch(canvas, [midX, midY], [midX + 80, midY + 60])

    const domainAfter = canvas.getState().xScale.domain().map(Number)

    t.is("kéo xong thì onComplete báo lại", completed.length, 1)
    t.is("và khung nhìn đứng im, không pan theo", domainAfter.join(), domainBefore.join())

    if (completed.length > 0) {
        const moved = completed[0][0]
        t.ok("đầu thứ nhất đi xuống", moved.start[1] < 100)
        t.ok("đầu thứ hai cũng đi xuống", moved.end[1] < 105)
        t.near("độ dốc giữ nguyên", moved.end[1] - moved.start[1], 105 - 100, 0.5)
        t.gt("đầu thứ nhất dịch sang phải", moved.start[0], 20)
        t.near("độ dài theo trục x giữ nguyên", moved.end[0] - moved.start[0], 60 - 20, 1.5)
    }

    cleanup()
    return t.checks
}

/**
 * Cú kéo đã thuộc về một đối tượng thì trang không được cuộn theo — còn cú pan thì được.
 *
 * Vùng bắt sự kiện khai `touch-action: pan-y`, cố ý, để người đọc cuộn được qua biểu đồ.
 * Nhưng khi một đối tượng đã nhận cú kéo thì kéo nó xuống dưới không được biến thành cuộn
 * trang. Cách duy nhất nói điều ấy với trình duyệt là `preventDefault` trên `touchmove`, và
 * nó chỉ có tác dụng nếu listener không passive — mà `touchmove` trên `window` thì trình
 * duyệt mặc định coi là passive.
 *
 * Bài này đọc thẳng `defaultPrevented` của chính sự kiện được phát ra, vì đó là thứ trình
 * duyệt thật sẽ đọc. Đo bằng "đối tượng có đi không" thì không phân biệt được: chạm tổng hợp
 * qua CDP có thể không kích hoạt cơ chế cuộn của thiết bị thật, nên nhìn thì vẫn đúng.
 */
TESTS["cú kéo của đối tượng chặn cuộn trang, cú pan thì không"] = async () => {
    const t = makeChecker()

    const { canvas } = mountWithTool("chart-trend-line", {
        enabled: false,
        snap: false,
        trends: [{ start: [20, 100], end: [60, 105], selected: true, type: "LINE" }],
    })
    await settle(4)

    const state = canvas.getState()
    const midX = (state.xScale(20) + state.xScale(60)) / 2
    const midY = (state.chartConfigs[0].yScale(100) + state.chartConfigs[0].yScale(105)) / 2

    const rect = canvas.shadowRoot.querySelector("[data-event-capture]")
    const box = rect.getBoundingClientRect()

    /** Một cú chạm rồi một cú di, trả về `defaultPrevented` của cú di ấy. */
    const dragFrom = async (x, y) => {
        const touchAt = (atX, atY) =>
            new Touch({ identifier: 1, target: rect, clientX: box.left + atX, clientY: box.top + atY })
        const make = (type, atX, atY, active = true) =>
            new TouchEvent(type, {
                touches: active ? [touchAt(atX, atY)] : [],
                targetTouches: active ? [touchAt(atX, atY)] : [],
                changedTouches: [touchAt(atX, atY)],
                bubbles: true,
                cancelable: true,
            })

        rect.dispatchEvent(make("touchstart", x, y))
        await settle(1)

        const move = make("touchmove", x, y + 40)
        window.dispatchEvent(move)
        await settle(2)

        const end = make("touchend", x, y + 40, false)
        window.dispatchEvent(end)
        rect.dispatchEvent(end)
        await settle(2)

        return move.defaultPrevented
    }

    t.is("kéo trên đối tượng đã chọn thì chặn cuộn", await dragFrom(midX, midY), true)
    t.is("kéo trên chỗ trống thì để trang cuộn", await dragFrom(600, midY + 120), false)

    cleanup()
    return t.checks
}

/**
 * Ngón tay được trỏ trúng rộng hơn con chuột.
 *
 * Mọi phép dò trúng trong thư viện đặt theo con chuột: công cụ tương tác lấy `tolerance: 4`,
 * chốt kéo lấy bán kính cộng 7. Đầu ngón tay rộng cỡ 30 pixel CSS, nên với 4px thì phải đặt
 * ngón tay đúng vào một đường mảnh — điều không ai làm được.
 *
 * Bài này đo đúng chỗ chênh: một điểm cách đường 8 pixel. Con chuột ở đó phải **trượt** (giữ
 * nguyên độ chính xác của chuột, không nới bừa cho cả hai), còn ngón tay ở đó phải **trúng**.
 */
TESTS["ngón tay trỏ trúng rộng hơn chuột, và chuột không bị nới theo"] = async () => {
    const t = makeChecker()

    const { canvas } = mountWithTool("chart-trend-line", {
        enabled: false,
        snap: false,
        trends: [{ start: [20, 100], end: [60, 100], selected: true, type: "LINE" }],
    })
    await settle(4)

    const state = canvas.getState()
    const line = canvas.querySelector("chart-interactive-straight-line")
    const midX = (state.xScale(20) + state.xScale(60)) / 2
    const onLine = state.chartConfigs[0].yScale(100)

    // 8 pixel: ngoài `tolerance` 4 của chuột, trong 4 + 12 của ngón tay.
    const nearY = onLine + 8

    await hoverAt(canvas, midX, nearY)
    const mouseHit = line.moreProps.hovering

    // Cùng một điểm, nhưng bằng ngón tay: touchstart tự thiết lập `hovering`.
    await swipeTouch(canvas, [midX, nearY], [midX, nearY])
    const touchHit = line.moreProps.hovering

    t.is("chuột cách 8px thì trượt", mouseHit, false)
    t.is("ngón tay cách 8px thì trúng", touchHit, true)

    cleanup()
    return t.checks
}

/**
 * Cú chạm ngay sau một lần rê chuột vẫn phải quyết định đúng.
 *
 * `ChartCanvas.handleMouseMove` chỉ nhận một lần mỗi khung hình — đúng cho việc rê chuột, vì
 * con trỏ sinh ra hàng trăm sự kiện mỗi giây. Nhưng `EventCapture` cũng dùng chính lời gọi
 * ấy để thiết lập `hovering` ngay trước khi quyết định "cú này là pan hay là kéo một đối
 * tượng". Nếu khung hình trước còn đang chờ thì lời gọi bị bỏ, phép quyết định đọc trạng
 * thái cũ, và cú chạm quyết định sai.
 *
 * Không thấy được bằng mắt, nên phải dựng đúng cái bẫy: rê chuột ra chỗ trống cho `hovering`
 * thành false, rồi phát thêm một `mousemove` mà KHÔNG chờ khung hình nào — cái đó bật cờ
 * chặn và cờ còn đang bật — rồi chạm ngay vào đối tượng.
 */
TESTS["cú chạm ngay sau một lần rê chuột vẫn quyết định đúng"] = async () => {
    const t = makeChecker()

    const completed = []
    const { canvas } = mountWithTool("chart-trend-line", {
        enabled: false,
        snap: false,
        trends: [{ start: [20, 100], end: [60, 105], selected: true, type: "LINE" }],
        onComplete: (event, trends) => completed.push(trends),
    })
    await settle(4)

    const state = canvas.getState()
    const midX = (state.xScale(20) + state.xScale(60)) / 2
    const midY = (state.chartConfigs[0].yScale(100) + state.chartConfigs[0].yScale(105)) / 2

    // Rê chuột ra chỗ trống, chờ hẳn: `hovering` của đường thành false.
    await hoverAt(canvas, midX, midY + 120)

    // Rồi một `mousemove` nữa, KHÔNG chờ khung hình — cờ chặn bật lên và còn đang bật.
    const rect = canvas.shadowRoot.querySelector("[data-event-capture]")
    const box = rect.getBoundingClientRect()
    window.dispatchEvent(
        new MouseEvent("mousemove", { clientX: box.left + midX, clientY: box.top + midY + 120, bubbles: true }),
    )

    // Chạm ngay vào đường, trong cùng khung hình ấy.
    await swipeTouch(canvas, [midX, midY], [midX + 60, midY + 40])

    t.is("cú chạm vẫn nhận ra đối tượng dưới ngón tay", completed.length, 1)

    cleanup()
    return t.checks
}

/**
 * Ngược lại: ngón tay đặt vào chỗ TRỐNG thì vẫn phải pan, và không đối tượng nào đi theo.
 *
 * Nửa này canh chỗ dễ hỏng nhất của phép sửa trên: nếu phép quyết định trả "drag" quá rộng
 * tay thì trên điện thoại chart mất luôn khả năng pan, mà lỗi ấy trông không giống lỗi —
 * chỉ là vuốt không ăn.
 */
TESTS["ngón tay đặt vào chỗ trống thì vẫn pan, đối tượng đứng im"] = async () => {
    const t = makeChecker()

    const dragged = []
    const { canvas } = mountWithTool("chart-trend-line", {
        enabled: false,
        snap: false,
        trends: [{ start: [20, 100], end: [60, 105], selected: true, type: "LINE" }],
        onComplete: (event, trends) => dragged.push(trends),
    })
    await settle(4)

    const state = canvas.getState()
    // Xa đường: dưới đáy pane, cách đường vài chục pixel.
    const farY = state.chartConfigs[0].yScale(state.chartConfigs[0].yScale.domain()[0]) - 10

    // Đo cả hai thiết bị trong CÙNG bối cảnh: nếu con chuột cũng không pan được thì cái
    // chặn nằm ở chỗ khác, không phải ở phép sửa cho ngón tay.
    const beforeMouse = canvas.getState().xScale.domain().map(Number)
    await dragAcross(canvas, 600, 450, farY)
    const afterMouse = canvas.getState().xScale.domain().map(Number)

    const before = canvas.getState().xScale.domain().map(Number)
    await swipeTouch(canvas, [600, farY], [450, farY])
    const after = canvas.getState().xScale.domain().map(Number)

    t.not("chuột: vuốt chỗ trống thì khung nhìn dịch", afterMouse.join(), beforeMouse.join())
    t.not("ngón tay: vuốt chỗ trống thì khung nhìn dịch", after.join(), before.join())
    t.is("và không đối tượng nào bị kéo", dragged.length, 0)

    cleanup()
    return t.checks
}

/**
 * Ngón tay kéo đi đâu thì chart đi theo đấy.
 *
 * Bản gốc đảo dấu ở nhánh chạm — `dx = panOrigin[0] - mouseXY[0]` — nên trên màn hình
 * cảm ứng chart chạy **ngược** chiều ngón tay. Đo trên trang thật: vuốt sang phải 150px
 * thì domain x dịch +25.8, trong khi cùng cú kéo bằng chuột cho −25.0.
 */
TESTS["ngón tay kéo đi đâu thì chart đi theo đấy"] = async () => {
    const t = makeChecker()

    const { canvas } = mountWithAxes()
    await settle(4)

    const xDomain = () => canvas.getState().xScale.domain()
    const yDomain = () => canvas.getState().chartConfigs[0].yScale.domain()

    // ── ngang ─────────────────────────────────────────────────────────────────────
    const xBefore = xDomain()[0]
    await swipeTouch(canvas, [200, 200], [400, 200])

    t.ok("vuốt sang phải thì nhìn lùi về quá khứ", xDomain()[0] < xBefore)

    const xAfterRight = xDomain()[0]
    await swipeTouch(canvas, [400, 200], [200, 200])

    t.ok("vuốt sang trái thì đi ngược lại", xDomain()[0] > xAfterRight)

    // ── dọc ───────────────────────────────────────────────────────────────────────
    //
    // Chỉ kéo dọc được sau khi người dùng đã tự đặt khung giá — cùng cửa chặn với chuột.
    canvas.yAxisZoom(0, yDomain())
    await settle(2)

    const yBefore = yDomain()[0]
    await swipeTouch(canvas, [200, 150], [200, 250])

    t.ok("vuốt xuống thì khung giá đi lên theo ngón tay", yDomain()[0] > yBefore)

    const yAfterDown = yDomain()[0]
    await swipeTouch(canvas, [200, 250], [200, 150])

    t.ok("vuốt lên thì đi ngược lại", yDomain()[0] < yAfterDown)

    cleanup()
    return t.checks
}

/** Bấm rồi nhả tại chỗ, hai lần trong 300ms — cửa sổ nhấp đúp của dải trên trục. */
const doubleClickAxis = async (rect, x, y) => {
    const box = rect.getBoundingClientRect()
    const at = (type, target) =>
        target.dispatchEvent(
            new MouseEvent(type, { clientX: box.left + x, clientY: box.top + y, bubbles: true, button: 0 }),
        )

    for (const round of [1, 2]) {
        at("mousedown", rect)
        await settle(1)
        at("mouseup", window)
        await settle(1)
    }
    await settle(2)
}

/**
 * Nhấp đúp lên trục là đường về — thứ mà cả bản gốc lẫn bản port trước đây không có.
 *
 * `AxisZoomCapture` vốn đã nhận diện được cú nhấp đúp và gọi `onDoubleClick`, nhưng không
 * ai đưa gì vào, nên phép ấy tính ra rồi bị ném đi. Chạm vào cột giá một lần là kẹt ở chế
 * độ thủ công mãi — không cử chỉ nào đưa lại về tự-vừa-khung.
 */
TESTS["nhấp đúp lên cột giá thì về tự-vừa-khung"] = async () => {
    const t = makeChecker()

    const { canvas } = mountWithAxes()
    await settle(4)

    const config = () => canvas.getState().chartConfigs[0]
    const auto = config().realYDomain.join()

    // người dùng tự đặt khung giá: đúng thao tác bật chế độ thủ công
    canvas.yAxisZoom(0, [50, 60])
    await settle(2)

    t.is("đã sang chế độ thủ công", config().yPanEnabled, true)
    t.not("và khung giá không còn vừa dữ liệu", config().yScale.domain().join(), auto)

    await doubleClickAxis(zoomRectFor(canvas, "chart-y-axis"), 20, 200)

    t.is("nhấp đúp thì khung giá vừa lại dữ liệu", config().yScale.domain().join(), auto)
    t.is("và chế độ thủ công tắt", config().yPanEnabled, false)

    // nên kéo dọc cũng thôi ăn — đúng như trước khi chạm vào cột giá
    const before = config().yScale.domain().join()
    const rect = canvas.shadowRoot.querySelector("[data-event-capture]")
    const box = rect.getBoundingClientRect()
    const at = (type, target, y, extra = {}) =>
        target.dispatchEvent(
            new MouseEvent(type, { clientX: box.left + 400, clientY: box.top + y, bubbles: true, ...extra }),
        )

    at("mouseenter", rect, 200)
    at("mousedown", rect, 200, { buttons: 1 })
    at("mousemove", window, 320, { buttons: 1 })
    await settle(2)
    at("mouseup", window, 320, { buttons: 0 })
    await settle(3)

    t.is("và kéo dọc thôi ăn", config().yScale.domain().join(), before)

    cleanup()
    return t.checks
}

TESTS["nhấp đúp lên trục thời gian thì về mức zoom mặc định"] = async () => {
    const t = makeChecker()

    const { canvas } = mountWithAxes()
    await settle(4)

    const domain = () => canvas.getState().xScale.domain()
    const span = () => domain()[1] - domain()[0]
    const centre = () => (domain()[0] + domain()[1]) / 2

    const defaultSpan = span()

    // phóng to hẳn vào, rồi kéo đi chỗ khác
    canvas.xAxisZoom([domain()[0] + defaultSpan * 0.4, domain()[1] - defaultSpan * 0.4])
    await settle(2)

    t.ok("đã phóng to", span() < defaultSpan * 0.5)
    const zoomedCentre = centre()

    await doubleClickAxis(zoomRectFor(canvas, "chart-x-axis"), 400, 12)

    t.near("nhấp đúp thì nến về kích cỡ mặc định", span(), defaultSpan, 1)
    t.near("và vẫn đang xem đúng quãng ấy", centre(), zoomedCentre, defaultSpan * 0.02)

    // thu nhỏ quá mức cũng về đúng chỗ ấy
    canvas.xAxisZoom([domain()[0] - defaultSpan, domain()[1] + defaultSpan])
    await settle(2)
    t.ok("đã thu nhỏ", span() > defaultSpan * 1.5)

    await doubleClickAxis(zoomRectFor(canvas, "chart-x-axis"), 400, 12)
    t.near("nhấp đúp lần nữa cũng về mặc định", span(), defaultSpan, 1)

    cleanup()
    return t.checks
}

TESTS["onDoubleClick của mình đặt thì thắng phép mặc định"] = async () => {
    const t = makeChecker()

    const seen = []
    const { canvas, yAxis } = mountWithAxes({ y: { onDoubleClick: (event, position) => seen.push(position) } })
    await settle(4)

    canvas.yAxisZoom(0, [50, 60])
    await settle(2)
    const manual = canvas.getState().chartConfigs[0].yScale.domain().join()

    await doubleClickAxis(zoomRectFor(canvas, "chart-y-axis"), 20, 200)

    t.is("hàm của mình được gọi", seen.length, 1)
    t.ok("kèm toạ độ trong dải trục", Array.isArray(seen[0]) && Number.isFinite(seen[0][1]))
    t.is("và phép mặc định không chạy", canvas.getState().chartConfigs[0].yScale.domain().join(), manual)

    cleanup()
    return t.checks
}

/**
 * Con của `chart-alternate-data` phải thấy hàng dưới con trỏ CỦA BỘ DỮ LIỆU THỨ HAI.
 *
 * `currentItem` là hàng dữ liệu nằm dưới con trỏ, và nó do `getMutableState()` cấp — mà cái
 * đó `chart-alternate-data` chuyển tiếp thẳng về chart. Nên nó là hàng của mảng dữ liệu
 * CHÍNH, không phải của bộ dữ liệu thứ hai. Hệ quả: đặt một tooltip hay
 * `chart-current-coordinate` vào trong `chart-alternate-data` thì nó đọc số của dữ liệu
 * chính, dù series ngay cạnh đang vẽ bộ thứ hai. Bản gốc cũng vậy.
 *
 * Cùng một lý lẽ với `plotData`: phần tử này tồn tại để quyết định con của nó thấy bộ dữ
 * liệu nào, và "hàng dưới con trỏ" là một phần của bộ dữ liệu ấy.
 */
TESTS["con của chart-alternate-data thấy hàng dưới con trỏ của bộ dữ liệu thứ hai"] = async () => {
    const t = makeChecker()

    const { canvas } = mount()
    const pane = canvas.querySelector("chart-pane")
    const { data } = canvas

    // Thưa hẳn, và mang một trường mà dữ liệu chính KHÔNG có, để phân biệt được nguồn.
    const guest = []
    for (let index = 0; index < data.length; index += 5) {
        guest.push({ idx: data[index].idx, close: 500 + index, guestOnly: index })
    }

    const alternate = document.createElement("chart-alternate-data")
    alternate.data = guest

    const seen = []
    const listener = document.createElement("chart-click-callback")
    listener.onMouseMove = (event, moreProps) => seen.push(moreProps.currentItem)
    alternate.append(listener)
    pane.append(alternate)
    await settle(4)

    await hoverAt(canvas, 400, 150)

    const item = seen[seen.length - 1]

    t.gt("có báo hàng dưới con trỏ", seen.length, 0)
    t.ok("là một hàng của bộ dữ liệu thứ hai", item?.guestOnly !== undefined)
    t.ok(
        "và đúng là một trong những hàng đã truyền vào",
        guest.some(each => each.guestOnly === item?.guestOnly),
    )

    // Đường thứ hai, và là đường khác hẳn: gói phát ra lúc di chuột đi qua `subscribe`, còn
    // một lần vẽ có `force` thì đi qua `refreshFromContext()` → `getMutableState()`. Hai
    // đường phải trả cùng một câu trả lời, nếu không `currentItem` đổi nghĩa tuỳ theo lần
    // vẽ vừa rồi do cái nào gây ra.
    listener.refreshFromContext()
    const refreshed = listener.getMoreProps().currentItem

    t.ok("đường refreshFromContext cũng trả hàng của bộ thứ hai", refreshed?.guestOnly !== undefined)

    cleanup()
    return t.checks
}

/**
 * Hai cú bấm nhanh ở HAI CHỖ KHÁC NHAU là hai cú bấm, không phải một cú nhấp đúp.
 *
 * Bản gốc chỉ hỏi thời gian: cú bấm thứ hai trong 400ms ở bất kỳ đâu cũng thành nhấp đúp,
 * và cú bấm ấy bị ăn mất. Hậu quả nhìn thấy được: chọn công cụ Text rồi gõ hai nhãn ở hai
 * đầu biểu đồ, nhanh tay một chút, thì cái thứ hai không xuất hiện — không lỗi, không dấu
 * vết. Trên điện thoại thì gần như luôn xảy ra.
 *
 * Bài này bấm hai lần cách nhau 100ms: một cặp cùng chỗ (phải ra nhấp đúp) và một cặp cách
 * nhau 200px (phải ra hai cú bấm).
 */
TESTS["hai cú bấm nhanh ở hai chỗ khác nhau là hai cú bấm"] = async () => {
    const t = makeChecker()

    const { canvas } = mount()
    const pane = canvas.querySelector("chart-pane")

    const clicks = []
    const doubles = []
    const listener = document.createElement("chart-click-callback")
    listener.onClick = (event, moreProps) => clicks.push(moreProps.mouseXY[0])
    listener.onDoubleClick = () => doubles.push(true)
    pane.append(listener)
    await settle(4)

    // Không có `pastDoubleClickWindow()` ở giữa: cả bài này là về chuyện bấm nhanh.
    // Hai chỗ khác nhau: phải là hai cú bấm.
    await clickAt(canvas, 150, 120)
    await clickAt(canvas, 350, 200)

    t.is("hai chỗ khác nhau → hai cú bấm", clicks.length, 2)
    t.is("hai chỗ khác nhau → không có nhấp đúp", doubles.length, 0)

    // Cùng một chỗ, nhanh: phải là một cú nhấp đúp.
    clicks.length = 0
    doubles.length = 0
    await clickAt(canvas, 500, 150)
    await clickAt(canvas, 500, 150)

    t.is("cùng một chỗ → có nhấp đúp", doubles.length, 1)
    t.is("cùng một chỗ → chỉ tính một cú bấm", clicks.length, 1)

    // Lệch vài pixel vẫn là nhấp đúp — ngón tay không đặt lại đúng một pixel.
    clicks.length = 0
    doubles.length = 0
    await clickAt(canvas, 600, 150)
    await clickAt(canvas, 604, 153)

    t.is("lệch 4px vẫn là nhấp đúp", doubles.length, 1)

    cleanup()
    return t.checks
}

/**
 * `onContextMenu` đặt lên trục thì phải có chỗ nhận.
 *
 * Bản gốc truyền prop này từ `XAxis`/`YAxis` xuống dải bắt chuột của trục. Ở đây dải ấy do
 * chính trục dựng ra bên trong, nên người dùng không với tới — `AxisZoomCapture` có đọc
 * `onContextMenu`, mà không ai đặt được vào. Prop tồn tại trên giấy, không tồn tại thật.
 */
TESTS["bấm chuột phải trên dải trục thì gọi onContextMenu của trục"] = async () => {
    const t = makeChecker()

    const seen = []
    const { canvas } = mountWithAxes({
        y: { onContextMenu: (event, position) => seen.push(position) },
    })
    await settle(4)

    const rect = zoomRectFor(canvas, "chart-y-axis")
    const box = rect.getBoundingClientRect()
    rect.dispatchEvent(
        new MouseEvent("contextmenu", {
            clientX: box.left + 20,
            clientY: box.top + 180,
            bubbles: true,
            composed: true,
            cancelable: true,
        }),
    )
    await settle(2)

    t.is("hàm của mình được gọi đúng một lần", seen.length, 1)
    t.ok("kèm toạ độ trong dải trục", Array.isArray(seen[0]) && Number.isFinite(seen[0][1]))

    cleanup()
    return t.checks
}

/**
 * Rê chuột lên dải trục thì con trỏ nói được là kéo được.
 *
 * Bản gốc đặt mũi trỏ thường lúc nghỉ và chỉ đổi con trỏ **trong lúc đang kéo** — mà
 * `zoomCursorClassName` lại mặc định rỗng, nên chẳng đổi gì cả. Gợi ý nằm sai chỗ: nó chỉ
 * xuất hiện khi người ta đã tìm ra cử chỉ rồi.
 */
TESTS["con trỏ trên dải trục nói được là kéo được"] = async () => {
    const t = makeChecker()

    const { canvas } = mountWithAxes()
    await settle(4)

    const cursorOf = node => (node === null ? "" : getComputedStyle(node).cursor)

    t.is("dải cột giá: kéo dọc", cursorOf(zoomRectFor(canvas, "chart-y-axis")), "ns-resize")
    t.is("dải trục thời gian: kéo ngang", cursorOf(zoomRectFor(canvas, "chart-x-axis")), "ew-resize")

    // và không bôi sang chỗ khác: thân chart vẫn là crosshair
    t.is(
        "thân chart vẫn crosshair",
        cursorOf(canvas.shadowRoot.querySelector("[data-event-capture]")),
        "crosshair",
    )

    // Cái rác đi kèm: không trục nào đặt `className`, nên chuỗi class từng kết thúc bằng
    // một lớp tên `undefined`. Rẻ để canh, và canh luôn cho cả chart.
    const junk = [...canvas.shadowRoot.querySelectorAll("*")]
        .map(node => node.getAttribute?.("class"))
        .filter(each => typeof each === "string" && each.split(/\s+/).includes("undefined"))

    t.is("không phần tử nào mang class tên `undefined`", junk.length, 0)

    cleanup()
    return t.checks
}

TESTS["zoomCursorClassName của mình đặt thì thắng trong lúc kéo"] = async () => {
    const t = makeChecker()

    const { canvas } = mountWithAxes({ y: { zoomCursorClassName: "chart-grabbing-cursor" } })
    await settle(4)

    const rect = () => zoomRectFor(canvas, "chart-y-axis")
    t.is("lúc nghỉ vẫn là con trỏ co giãn", getComputedStyle(rect()).cursor, "ns-resize")

    const box = rect().getBoundingClientRect()
    const at = (type, target, y, extra = {}) =>
        target.dispatchEvent(
            new MouseEvent(type, { clientX: box.left + 20, clientY: box.top + y, bubbles: true, ...extra }),
        )

    at("mousedown", rect(), 100, { buttons: 1 })
    await settle(2)
    at("mousemove", window, 140, { buttons: 1 })
    await settle(2)

    t.is("đang kéo thì theo lớp của mình", getComputedStyle(rect()).cursor, "grabbing")

    at("mouseup", window, 140, { buttons: 0 })
    await settle(2)

    t.is("thả tay thì về con trỏ co giãn", getComputedStyle(rect()).cursor, "ns-resize")

    cleanup()
    return t.checks
}

TESTS["đặt đường trục bằng một cú bấm, cả bốn mode đều vẽ ra hình"] = async () => {
    const t = makeChecker()

    const completed = []
    const { canvas, tool } = mountWithTool("chart-axis-line", {
        enabled: true,
        mode: "horizontal",
        lines: [],
        onComplete: (event, lines) => {
            completed.push(lines)
            tool.lines = lines
        },
    })
    await settle()

    await clickAt(canvas, 300, 200)

    t.is("một cú bấm là onComplete được gọi", completed.length, 1)
    t.is("và báo về đúng một đường", completed[0].length, 1)
    t.ok("đường mang toạ độ neo", Array.isArray(completed[0][0].at) && completed[0][0].at.length === 2)
    t.is("đường nhớ mode của nó", completed[0][0].mode, "horizontal")
    t.ok("và được đánh dấu đang chọn", completed[0][0].selected === true)

    // Cả bốn mode cùng lúc: mỗi mode một đường, tất cả phải thành hình thật trên canvas
    tool.enabled = false
    const [xValue, yValue] = completed[0][0].at
    tool.lines = [
        { at: [xValue, yValue], mode: "horizontal", selected: false },
        { at: [xValue, yValue * 0.98], mode: "horizontalRay", selected: false },
        { at: [xValue + 5, yValue], mode: "vertical", selected: false },
        { at: [xValue + 10, yValue * 1.02], mode: "cross", selected: false },
    ]
    await settle(3)

    t.is("bốn đường là bốn wrapper", tool.querySelectorAll("chart-each-axis-line").length, 4)
    t.gt("và tất cả vẽ ra pixel thật", mouseLayerPixels(canvas), 400)

    // Kéo đường ngang: trỏ vào đúng y của nó (x nào cũng được — nó chạy hết pane)
    tool.lines = [{ at: [xValue, yValue], mode: "horizontal", selected: true }]
    await settle(3)

    const before = tool.lines[0].at[1]
    await dragOn(canvas, [500, 200], [500, 260])

    t.is("kéo xong onComplete báo lại", completed.length, 2)
    t.not("và neo giá đã đổi", completed[1][0].at[1], before)

    cleanup()
    return t.checks
}

TESTS["vẽ hình chữ nhật và elip bằng hai cú bấm"] = async () => {
    const t = makeChecker()

    const completed = []
    const { canvas, tool } = mountWithTool("chart-shape-tool", {
        enabled: true,
        shape: "rectangle",
        snap: false,
        shapes: [],
        onComplete: (event, shapes) => {
            completed.push(shapes)
            tool.shapes = shapes
        },
    })
    await settle()

    await clickAt(canvas, 200, 120)
    t.is("bấm lần một chưa hoàn thành gì", completed.length, 0)

    await hoverAt(canvas, 450, 260)
    t.ok("có hình tạm bám theo chuột", tool.querySelector("chart-interactive-shape") !== null)

    await pastDoubleClickWindow()
    await clickAt(canvas, 450, 260)

    t.is("bấm lần hai là xong một hình", completed.length, 1)
    t.is("báo về đúng một hình", completed[0].length, 1)
    t.is("hình nhớ nó là chữ nhật", completed[0][0].shape, "rectangle")
    t.not("hai góc không trùng nhau", String(completed[0][0].start), String(completed[0][0].end))

    // Elip vẽ bằng cùng một phần tử — đổi shape của đối tượng là đổi hình trên canvas.
    // Cả hai lần đếm đều ở trạng thái KHÔNG chọn: lần đầu viết bài này đếm lúc hình còn
    // selected (tay cầm + nét dày) nên phép so "hình đổi" đúng cả khi nhánh elip bị xoá —
    // mutation lọt lưới, đúng bài "dữ liệu kiểm phải dữ hơn dữ liệu thật".
    tool.enabled = false
    tool.shapes = [{ ...completed[0][0], selected: false }]
    await settle(3)
    const pixelsAsRect = mouseLayerPixels(canvas)

    tool.shapes = [{ ...completed[0][0], shape: "ellipse", selected: false }]
    await settle(3)
    const pixelsAsEllipse = mouseLayerPixels(canvas)
    t.gt("elip vẫn vẽ ra pixel thật", pixelsAsEllipse, 200)
    t.not("và hình đổi thật sự trên canvas", pixelsAsEllipse, pixelsAsRect)

    // Kéo thân: cả hai góc dời cùng một quãng — kích thước không đổi
    tool.shapes = [{ ...completed[0][0], selected: true }]
    await settle(3)

    const spanX = completed[0][0].end[0] - completed[0][0].start[0]
    await dragOn(canvas, [325, 190], [375, 230])

    t.is("kéo xong onComplete báo lại", completed.length, 2)
    const moved = completed[1][0]
    t.near("bề ngang giữ nguyên khi kéo thân", moved.end[0] - moved.start[0], spanX, 1.5)

    cleanup()
    return t.checks
}

TESTS["thước đo hai điểm đọc ra số thật"] = async () => {
    const t = makeChecker()

    const completed = []
    const { canvas, tool, data, xAccessor } = mountWithTool("chart-measure", {
        enabled: true,
        mode: "both",
        snap: false,
        measures: [],
        onComplete: (event, measures) => {
            completed.push(measures)
            tool.measures = measures
        },
    })
    await settle()

    await clickAt(canvas, 200, 150)
    await hoverAt(canvas, 450, 250)
    await pastDoubleClickWindow()
    await clickAt(canvas, 450, 250)

    t.is("hai cú bấm là một thước đo", completed.length, 1)
    const measure = completed[0][0]
    t.is("thước nhớ mode", measure.mode, "both")

    // Số nến đo được phải khớp khoảng hai đầu trên trục x — thước nói dối thì vô dụng
    const bars = Math.round(measure.end[0] - measure.start[0])
    t.gt("đo qua một quãng nến thật", bars, 10)
    t.ok(
        "hai đầu nằm trong vùng dữ liệu",
        measure.start[0] >= xAccessor(data[0]) && measure.end[0] <= xAccessor(data[data.length - 1]),
    )

    // Hộp số vẽ ra thật: thước không hộp số chỉ là một cái khung rỗng
    t.gt("thước vẽ ra pixel thật (khung + mũi tên + hộp số)", mouseLayerPixels(canvas), 500)

    cleanup()
    return t.checks
}

TESTS["ba cú bấm dựng một pitchfork, ba biến thể neo ba chỗ khác nhau"] = async () => {
    const t = makeChecker()

    const completed = []
    const { canvas, tool } = mountWithTool("chart-pitchfork", {
        enabled: true,
        variant: "standard",
        snap: false,
        forks: [],
        onComplete: (event, forks) => {
            completed.push(forks)
            tool.forks = forks
        },
    })
    await settle()

    await clickAt(canvas, 150, 250)
    t.is("bấm lần một chưa hoàn thành gì", completed.length, 0)

    await hoverAt(canvas, 400, 120)
    t.ok("một điểm thì hình tạm là một đoạn thẳng", tool.querySelector("chart-interactive-straight-line") !== null)

    await pastDoubleClickWindow()
    await clickAt(canvas, 400, 120)
    t.is("bấm lần hai vẫn chưa hoàn thành", completed.length, 0)

    await hoverAt(canvas, 450, 300)
    t.ok("hai điểm thì hình tạm là phuộc thật", tool.querySelector("chart-interactive-pitchfork") !== null)

    await pastDoubleClickWindow()
    await clickAt(canvas, 450, 300)

    t.is("bấm lần ba là xong một phuộc", completed.length, 1)
    const fork = completed[0][0]
    t.ok("phuộc có đủ ba điểm", fork.p1 !== undefined && fork.p2 !== undefined && fork.p3 !== undefined)
    t.is("phuộc nhớ biến thể", fork.variant, "standard")

    // Ba biến thể phải vẽ ra ba hình khác nhau — neo trung tuyến là chỗ chúng khác nhau
    tool.enabled = false
    const pixelsBy = {}
    for (const variant of ["standard", "schiff", "modifiedSchiff"]) {
        tool.forks = [{ ...fork, variant, selected: false }]
        await settle(3)
        pixelsBy[variant] = mouseLayerPixels(canvas)
    }
    t.gt("standard vẽ ra pixel thật", pixelsBy.standard, 200)
    t.not("schiff khác standard trên canvas", pixelsBy.schiff, pixelsBy.standard)
    t.not("modifiedSchiff khác schiff trên canvas", pixelsBy.modifiedSchiff, pixelsBy.schiff)

    // Kéo thân: cả ba điểm dời cùng quãng — dáng phuộc không đổi
    tool.forks = [{ ...fork, selected: true }]
    await settle(3)

    // Nắm vào trung tuyến: đường từ (150,250) về trung điểm hai chân (425,210) đi qua đây
    const spanBefore = fork.p2[0] - fork.p1[0]
    await dragOn(canvas, [300, 228], [340, 268])

    t.is("kéo xong onComplete báo lại", completed.length, 2)
    const moved = completed[1][0]
    t.near("khoảng cách p1→p2 giữ nguyên khi kéo thân", moved.p2[0] - moved.p1[0], spanBefore, 1.5)

    cleanup()
    return t.checks
}

TESTS["một cú bấm trồng một kế hoạch vị thế đúng tỉ lệ R/R"] = async () => {
    const t = makeChecker()

    const completed = []
    const { canvas, tool } = mountWithTool("chart-position-tool", {
        enabled: true,
        side: "long",
        barSpan: 15,
        stopFraction: 0.02,
        riskReward: 2,
        positions: [],
        onComplete: (event, positions) => {
            completed.push(positions)
            tool.positions = positions
        },
    })
    await settle()

    await clickAt(canvas, 300, 200)

    t.is("một cú bấm là onComplete được gọi", completed.length, 1)
    const plan = completed[0][0]

    t.ok("long: target nằm trên entry", plan.target > plan.entry)
    t.ok("long: stop nằm dưới entry", plan.stop < plan.entry)
    t.near("khoảng lời gấp đúng riskReward lần khoảng lỗ", (plan.target - plan.entry) / (plan.entry - plan.stop), 2, 0.001)
    t.is("bề ngang đúng barSpan", Math.round(plan.x2Value - plan.x1Value), 15)

    t.gt("kế hoạch vẽ ra pixel thật (hai vùng + ba nhãn)", mouseLayerPixels(canvas), 500)

    // Kéo thân: cả ba mức dời cùng nhau — tỉ lệ không đổi
    tool.enabled = false
    await settle(2)

    await dragOn(canvas, [320, 200], [360, 240])

    t.is("kéo xong onComplete báo lại", completed.length, 2)
    const movedPlan = completed[1][0]
    t.not("entry đã dời", movedPlan.entry, plan.entry)
    t.near(
        "và tỉ lệ R/R giữ nguyên qua cú kéo",
        (movedPlan.target - movedPlan.entry) / (movedPlan.entry - movedPlan.stop),
        (plan.target - plan.entry) / (plan.entry - plan.stop),
        0.01,
    )

    cleanup()
    return t.checks
}

TESTS["ba cú bấm dựng một fib extension, mức chiếu đúng công thức C + (B − A) · r"] = async () => {
    const t = makeChecker()

    const completed = []
    const { canvas, tool } = mountWithTool("chart-fib-extension", {
        enabled: true,
        snap: false,
        extensions: [],
        onComplete: (event, extensions) => {
            completed.push(extensions)
            tool.extensions = extensions
        },
    })
    await settle()

    await clickAt(canvas, 150, 250)
    t.is("bấm lần một chưa hoàn thành gì", completed.length, 0)

    await hoverAt(canvas, 380, 130)
    t.ok("một điểm thì hình tạm là đoạn thẳng", tool.querySelector("chart-interactive-straight-line") !== null)

    await pastDoubleClickWindow()
    await clickAt(canvas, 380, 130)
    t.is("bấm lần hai vẫn chưa hoàn thành", completed.length, 0)

    await hoverAt(canvas, 470, 200)
    t.ok("hai điểm thì hình tạm là nguyên bộ mức", tool.querySelector("chart-each-fib-extension") !== null)

    await pastDoubleClickWindow()
    await clickAt(canvas, 470, 200)

    t.is("bấm lần ba là xong", completed.length, 1)
    const extension = completed[0][0]
    t.ok("đủ ba điểm", extension.p1 !== undefined && extension.p2 !== undefined && extension.p3 !== undefined)

    // Công thức mức: 0% nằm đúng tại C, 100% tại C + (B − A)
    const swing = extension.p2[1] - extension.p1[1]
    t.gt("swing khác 0 — không thì mọi mức trùng nhau", Math.abs(swing), 0)
    t.gt("vẽ ra pixel thật (sáu mức + nhãn)", mouseLayerPixels(canvas), 300)

    // Kéo thân (nắm vào mức 0% đi qua C): cả ba điểm dời cùng quãng — swing giữ nguyên
    await dragOn(canvas, [520, 200], [560, 240])
    t.is("kéo xong onComplete báo lại", completed.length, 2)
    const moved = completed[1][0]
    t.near("swing giữ nguyên qua cú kéo", moved.p2[1] - moved.p1[1], swing, Math.abs(swing) * 0.02)

    cleanup()
    return t.checks
}

TESTS["setCrosshair vẽ crosshair không cần chuột, và null thì xoá"] = async () => {
    const t = makeChecker()

    const { canvas } = mountWithTool("chart-click-callback", {})
    const crosshair = document.createElement("chart-cross-hair-cursor")
    canvas.querySelector("chart-pane").append(crosshair)
    await settle(3)

    const before = mouseLayerPixels(canvas)
    canvas.setCrosshair([300, 150])
    await settle(3)

    const state = canvas.getMutableState()
    t.is("mouseXY đúng chỗ tiêm vào — x", state.mouseXY[0], 300)
    t.is("mouseXY đúng chỗ tiêm vào — y", state.mouseXY[1], 150)
    t.ok("có currentItem dưới crosshair", state.currentItem !== undefined && state.currentItem !== null)
    t.gt("crosshair vẽ ra pixel thật", mouseLayerPixels(canvas), before)

    canvas.setCrosshair(null)
    await settle(3)
    t.is("null thì lớp chuột sạch như cũ", mouseLayerPixels(canvas), before)

    cleanup()
    return t.checks
}

TESTS["callout: hai cú bấm — mũi neo rồi hộp chữ, kéo hộp không dời neo"] = async () => {
    const t = makeChecker()

    const completed = []
    const { canvas, tool } = mountWithTool("chart-callout", {
        enabled: true,
        snap: false,
        defaultText: "Ghi chú",
        callouts: [],
        onComplete: (event, callouts) => {
            completed.push(callouts)
            tool.callouts = callouts
        },
    })
    await settle()

    await clickAt(canvas, 250, 250)
    t.is("bấm lần một chưa hoàn thành gì", completed.length, 0)

    await hoverAt(canvas, 450, 120)
    t.ok("có chân tạm bám theo chuột", tool.querySelector("chart-interactive-straight-line") !== null)

    await pastDoubleClickWindow()
    await clickAt(canvas, 450, 120)

    t.is("bấm lần hai là xong", completed.length, 1)
    const callout = completed[0][0]
    t.ok("có đủ neo và hộp", callout.anchor !== undefined && callout.at !== undefined)
    t.is("chữ lấy từ defaultText", callout.text, "Ghi chú")
    t.not("neo và hộp không trùng nhau", String(callout.anchor), String(callout.at))
    t.gt("vẽ ra pixel thật (hộp + chân)", mouseLayerPixels(canvas), 200)

    // Kéo HỘP: at đổi, neo đứng im — đó là điểm phân công của callout
    await dragOn(canvas, [450, 120], [500, 170])
    t.is("kéo xong onComplete báo lại", completed.length, 2)
    const moved = completed[1][0]
    t.is("neo đứng im khi kéo hộp", String(moved.anchor), String(callout.anchor))
    t.not("hộp đã dời", String(moved.at), String(callout.at))

    cleanup()
    return t.checks
}

TESTS["price label: một cú bấm, chữ là chính giá của nó — kéo là đổi giá"] = async () => {
    const t = makeChecker()

    const completed = []
    const { canvas, tool } = mountWithTool("chart-price-label", {
        enabled: true,
        snap: false,
        labels: [],
        onComplete: (event, labels) => {
            completed.push(labels)
            tool.labels = labels
        },
    })
    await settle()

    await clickAt(canvas, 300, 200)
    t.is("một cú bấm là có nhãn", completed.length, 1)
    const label = completed[0][0]

    await settle(3)
    const box = tool.querySelector("chart-interactive-text")
    t.is("chữ trên hộp đúng bằng y của nhãn", box.text, label.at[1].toFixed(2))
    t.gt("vẽ ra pixel thật", mouseLayerPixels(canvas), 100)

    // Kéo nhãn xuống: giá mới phải khác và chữ phải đổi theo
    await dragOn(canvas, [300, 200], [300, 280])
    t.is("kéo xong onComplete báo lại", completed.length, 2)
    const moved = completed[1][0]
    t.not("giá đã đổi theo chỗ mới", moved.at[1].toFixed(2), label.at[1].toFixed(2))
    await settle(3)
    t.is("và chữ đổi theo giá mới", tool.querySelector("chart-interactive-text").text, moved.at[1].toFixed(2))

    cleanup()
    return t.checks
}

TESTS["pattern XABCD: năm cú bấm, nhãn đủ năm đỉnh, kéo thân giữ dáng"] = async () => {
    const t = makeChecker()

    const completed = []
    const { canvas, tool } = mountWithTool("chart-pattern", {
        enabled: true,
        variant: "xabcd",
        snap: false,
        patterns: [],
        onComplete: (event, patterns) => {
            completed.push(patterns)
            tool.patterns = patterns
        },
    })
    await settle()

    const spots = [
        [150, 250],
        [280, 130],
        [380, 260],
        [480, 150],
        [560, 280],
    ]
    for (let index = 0; index < spots.length; index++) {
        if (index > 0) await pastDoubleClickWindow()
        await hoverAt(canvas, spots[index][0], spots[index][1])
        await clickAt(canvas, spots[index][0], spots[index][1])
        if (index < spots.length - 1) t.is(`bấm lần ${index + 1} chưa hoàn thành`, completed.length, 0)
    }

    t.is("bấm lần năm là xong", completed.length, 1)
    const pattern = completed[0][0]
    t.is("đủ năm đỉnh", pattern.points.length, 5)
    t.is("nhớ variant", pattern.variant, "xabcd")
    t.gt("vẽ ra pixel thật (đường + fill + nhãn)", mouseLayerPixels(canvas), 300)

    // Kéo thân từ giữa đoạn X→A: mọi đỉnh dời cùng quãng, dáng giữ nguyên
    const spanX = pattern.points[4][0] - pattern.points[0][0]
    await dragOn(canvas, [215, 190], [265, 240])
    t.is("kéo xong onComplete báo lại", completed.length, 2)
    const moved = completed[1][0]
    t.near("bề ngang X→D giữ nguyên", moved.points[4][0] - moved.points[0][0], spanX, 1.5)

    // Kéo MỘT đỉnh: chỉ đỉnh đó đổi — tay cầm là công cụ sửa từng khớp
    const before = completed[completed.length - 1][0].points.map(point => String(point))
    const handle = tool.querySelectorAll("chart-clickable-circle")[2]
    t.ok("có tay cầm cho đỉnh B", handle !== undefined)

    cleanup()
    return t.checks
}

TESTS["path: mỗi click một đỉnh, nhấp đúp chốt hình"] = async () => {
    const t = makeChecker()

    const completed = []
    const { canvas, tool } = mountWithTool("chart-path", {
        enabled: true,
        snap: false,
        paths: [],
        onComplete: (event, paths) => {
            completed.push(paths)
            tool.paths = paths
        },
    })
    await settle()

    const spots = [
        [150, 250],
        [300, 130],
        [430, 260],
    ]
    for (let index = 0; index < spots.length; index++) {
        if (index > 0) await pastDoubleClickWindow()
        await hoverAt(canvas, spots[index][0], spots[index][1])
        await clickAt(canvas, spots[index][0], spots[index][1])
    }
    t.is("ba click chưa chốt — path không có số đỉnh định trước", completed.length, 0)

    // Nhấp đúp tại đỉnh thứ tư: hai click nhanh cùng chỗ — EventCapture tự tổng hợp
    // thành dblclick (nó đo 400ms và 8px từ click thật, không nghe DOM dblclick dựng tay).
    await pastDoubleClickWindow()
    await hoverAt(canvas, 520, 150)
    await clickAt(canvas, 520, 150)
    await clickAt(canvas, 520, 150)
    await settle(3)

    t.is("nhấp đúp là xong", completed.length, 1)
    const path = completed[0][0]
    t.gt("đủ đỉnh đã đóng đinh", path.points.length, 3)
    t.gt("vẽ ra pixel thật", mouseLayerPixels(canvas), 150)

    cleanup()
    return t.checks
}

TESTS["cyclic lines: hai điểm định chu kỳ, vạch lặp tới mép domain"] = async () => {
    const t = makeChecker()

    const completed = []
    const { canvas, tool } = mountWithTool("chart-cyclic-lines", {
        enabled: true,
        snap: false,
        cycles: [],
        onComplete: (event, cycles) => {
            completed.push(cycles)
            tool.cycles = cycles
        },
    })
    await settle()

    await clickAt(canvas, 200, 200)
    await hoverAt(canvas, 280, 220)
    await pastDoubleClickWindow()
    await clickAt(canvas, 280, 220)

    t.is("hai cú bấm là một bộ vạch", completed.length, 1)
    const cycle = completed[0][0]
    t.ok("có đủ hai neo", cycle.start !== undefined && cycle.end !== undefined)

    // Số vạch phải nhiều hơn 2 — chu kỳ lặp tới mép phải của domain
    await settle(3)
    const body = tool.querySelector("chart-interactive-cycles")
    const period = Math.abs(cycle.end[0] - cycle.start[0])
    t.gt("chu kỳ dương", period, 0)
    t.gt("vẽ ra pixel thật (nhiều vạch dọc)", mouseLayerPixels(canvas), 200)

    // Kéo tay cầm thứ hai ra xa: chu kỳ giãn — đó là cách sửa duy nhất có nghĩa
    await hoverAt(canvas, 240, 210)
    await pastDoubleClickWindow()
    await clickAt(canvas, 240, 210)
    await dragOn(canvas, [280, 220], [360, 220])
    t.gt("kéo xong có báo lại", completed.length, 1)
    const moved = completed[completed.length - 1][0]
    t.gt("chu kỳ giãn ra thật", Math.abs(moved.end[0] - moved.start[0]), period)

    cleanup()
    return t.checks
}

TESTS["arrow: đuôi rồi đầu, đầu đặc là pixel thật — kéo tay cầm đổi đầu"] = async () => {
    const t = makeChecker()

    const completed = []
    const { canvas, tool } = mountWithTool("chart-arrow", {
        enabled: true,
        snap: false,
        arrows: [],
        onComplete: (event, arrows) => {
            completed.push(arrows)
            tool.arrows = arrows
        },
    })
    await settle()

    await clickAt(canvas, 200, 200)
    await hoverAt(canvas, 320, 260)
    await pastDoubleClickWindow()
    await clickAt(canvas, 320, 260)

    t.is("hai cú bấm là một mũi tên", completed.length, 1)
    const arrow = completed[0][0]
    t.ok("có đủ đuôi và đầu", arrow.start !== undefined && arrow.end !== undefined)

    await settle(3)
    const slim = mouseLayerPixels(canvas)
    t.gt("vẽ ra pixel thật", slim, 100)

    // Đầu mũi tên là hình tam giác đặc — phóng to nó thì số pixel phải tăng.
    // Bỏ nhánh vẽ đầu là dòng này đỏ, vì headSize không còn ảnh hưởng gì.
    tool.arrows = tool.arrows.map(each => ({ ...each, appearance: { ...each.appearance, headSize: 30 } }))
    await settle(3)
    t.gt("đầu to hơn là nhiều pixel hơn — đầu có thật", mouseLayerPixels(canvas), slim)

    // Kéo tay cầm ở đầu: chỉ đầu dời, đuôi đứng im
    await dragOn(canvas, [320, 260], [400, 220])
    t.gt("kéo xong có báo lại", completed.length, 1)
    const moved = completed[completed.length - 1][0]
    t.is("đuôi đứng im", moved.start[0], arrow.start[0])
    t.not("đầu đã dời", moved.end[0].toFixed(1), arrow.end[0].toFixed(1))

    cleanup()
    return t.checks
}

TESTS["info line: nhãn giữa đoạn đọc Δgiá, phần trăm và số nến — từ dữ liệu, không từ pixel"] = async () => {
    const t = makeChecker()

    const completed = []
    const { canvas, tool } = mountWithTool("chart-info-line", {
        enabled: true,
        snap: false,
        infoLines: [],
        onComplete: (event, infoLines) => {
            completed.push(infoLines)
            tool.infoLines = infoLines
        },
    })
    await settle()

    await clickAt(canvas, 200, 250)
    await hoverAt(canvas, 340, 180)
    await pastDoubleClickWindow()
    await clickAt(canvas, 340, 180)

    t.is("hai cú bấm là một đoạn đo", completed.length, 1)
    const line = completed[0][0]

    await settle(3)
    const label = tool.querySelector("chart-interactive-label")
    const change = line.end[1] - line.start[1]
    const bars = Math.round(line.end[0] - line.start[0])
    t.ok("nhãn đọc đúng Δgiá của chính nó", label.text.includes(change.toFixed(2)))
    t.ok("nhãn đếm đúng số nến", label.text.includes(`${bars} bars`))
    t.ok("nhãn có phần trăm", label.text.includes("%"))
    t.gt("vẽ ra pixel thật", mouseLayerPixels(canvas), 100)

    // Kéo tay cầm thứ hai: số đo phải tính lại — nhãn sống theo dữ liệu
    await dragOn(canvas, [340, 180], [340, 120])
    t.gt("kéo xong có báo lại", completed.length, 1)
    const moved = completed[completed.length - 1][0]
    await settle(3)
    const movedChange = moved.end[1] - moved.start[1]
    t.not("Δgiá đã khác", movedChange.toFixed(2), change.toFixed(2))
    t.ok("và nhãn đổi theo", label.text.includes(movedChange.toFixed(2)))

    cleanup()
    return t.checks
}

TESTS["arrow mark: một cú bấm một glyph, mode định chiều — mỗi dấu nhớ chiều của mình"] = async () => {
    const t = makeChecker()

    const completed = []
    const { canvas, tool } = mountWithTool("chart-arrow-mark", {
        enabled: true,
        snap: false,
        mode: "up",
        marks: [],
        onComplete: (event, marks) => {
            completed.push(marks)
            tool.marks = marks
        },
    })
    await settle()

    await clickAt(canvas, 250, 220)
    t.is("một cú bấm là một dấu", completed.length, 1)
    t.is("dấu mang chiều của công cụ lúc đặt", completed[0][0].mode, "up")

    await settle(3)
    t.is("glyph chỉ lên", tool.querySelector("chart-interactive-text").text, "▲")
    t.gt("vẽ ra pixel thật", mouseLayerPixels(canvas), 20)

    // Đổi mode rồi đặt dấu thứ hai: dấu cũ giữ chiều cũ — mode là của từng dấu
    tool.mode = "down"
    await pastDoubleClickWindow()
    await clickAt(canvas, 400, 260)
    t.is("hai dấu trên hình", completed[completed.length - 1].length, 2)
    await settle(3)
    const glyphs = [...tool.querySelectorAll("chart-interactive-text")].map(each => each.text)
    t.ok("dấu cũ vẫn chỉ lên", glyphs.includes("▲"))
    t.ok("dấu mới chỉ xuống", glyphs.includes("▼"))

    cleanup()
    return t.checks
}

TESTS["fib time zone: vạch dọc tại bội số Fibonacci — dãy offsets điều khiển thật"] = async () => {
    const t = makeChecker()

    const completed = []
    const { canvas, tool } = mountWithTool("chart-fib-time-zone", {
        enabled: true,
        snap: false,
        zones: [],
        onComplete: (event, zones) => {
            completed.push(zones)
            tool.zones = zones
        },
    })
    await settle()

    await clickAt(canvas, 200, 200)
    await hoverAt(canvas, 260, 220)
    await pastDoubleClickWindow()
    await clickAt(canvas, 260, 220)

    t.is("hai cú bấm là một bộ vạch", completed.length, 1)
    await settle(3)
    const full = mouseLayerPixels(canvas)
    t.gt("vẽ ra pixel thật (nhiều vạch)", full, 200)

    // Rút dãy về [0, 1]: chỉ còn hai vạch — chứng minh offsets điều khiển hình vẽ.
    // Bỏ nhánh offsets trong cycleLines là dòng này đỏ.
    tool.offsets = [0, 1]
    await settle(3)
    t.gt("dãy ngắn hơn là ít pixel hơn", full, mouseLayerPixels(canvas))

    cleanup()
    return t.checks
}

TESTS["fib circles: vành đồng tâm theo mức — mức và variant điều khiển thật"] = async () => {
    const t = makeChecker()

    const completed = []
    const { canvas, tool } = mountWithTool("chart-fib-shape", {
        enabled: true,
        variant: "circles",
        snap: false,
        fibShapes: [],
        onComplete: (event, fibShapes) => {
            completed.push(fibShapes)
            tool.fibShapes = fibShapes
        },
    })
    await settle()

    await clickAt(canvas, 250, 200)
    await hoverAt(canvas, 330, 240)
    await pastDoubleClickWindow()
    await clickAt(canvas, 330, 240)

    t.is("hai cú bấm là một bộ vành", completed.length, 1)
    t.is("variant được ghi vào từng hình", completed[0][0].variant, "circles")
    await settle(3)
    const full = mouseLayerPixels(canvas)
    t.gt("vẽ ra pixel thật (sáu vành)", full, 300)

    // Một mức thay vì sáu: ít vành, ít pixel — mức điều khiển hình vẽ
    tool.levels = [0.5]
    await settle(3)
    const single = mouseLayerPixels(canvas)
    t.gt("một mức là ít pixel hơn sáu mức", full, single)

    // Đổi variant của hình ĐÃ VẼ sang arcs: nửa vành — lại ít pixel hơn nữa
    tool.levels = undefined
    tool.fibShapes = tool.fibShapes.map(each => ({ ...each, variant: "arcs" }))
    await settle(3)
    t.gt("nửa vành ít pixel hơn vành tròn", full, mouseLayerPixels(canvas))

    cleanup()
    return t.checks
}

TESTS["fib wedge và spiral: nêm ba bấm, xoắn hai bấm"] = async () => {
    const t = makeChecker()

    const completed = []
    const { canvas, tool } = mountWithTool("chart-fib-shape", {
        enabled: true,
        variant: "wedge",
        snap: false,
        fibShapes: [],
        onComplete: (event, fibShapes) => {
            completed.push(fibShapes)
            tool.fibShapes = fibShapes
        },
    })
    await settle()

    await clickAt(canvas, 200, 220)
    await hoverAt(canvas, 320, 260)
    await pastDoubleClickWindow()
    await clickAt(canvas, 320, 260)
    t.is("hai cú bấm chưa chốt — nêm cần ba neo", completed.length, 0)

    await hoverAt(canvas, 300, 150)
    await pastDoubleClickWindow()
    await clickAt(canvas, 300, 150)
    t.is("cú bấm thứ ba chốt nêm", completed.length, 1)
    t.is("nêm đủ ba neo", completed[0][0].points.length, 3)
    await settle(3)
    t.gt("vẽ ra pixel thật (hai tia + vành)", mouseLayerPixels(canvas), 200)

    // Xoắn: đổi variant của công cụ, hai cú bấm là xong — bảng variant điều khiển số neo
    tool.variant = "spiral"
    await pastDoubleClickWindow()
    await clickAt(canvas, 420, 200)
    await hoverAt(canvas, 480, 230)
    await pastDoubleClickWindow()
    await clickAt(canvas, 480, 230)
    t.is("xoắn chốt sau hai cú bấm", completed.length, 2)
    t.is("hình mới là xoắn", completed[1][1].variant, "spiral")

    cleanup()
    return t.checks
}

TESTS["gann box: hộp chia mức hai trục — square thêm chéo và quạt, mức điều khiển thật"] = async () => {
    const t = makeChecker()

    const completed = []
    const { canvas, tool } = mountWithTool("chart-gann-box", {
        enabled: true,
        variant: "box",
        snap: false,
        gannBoxes: [],
        onComplete: (event, gannBoxes) => {
            completed.push(gannBoxes)
            tool.gannBoxes = gannBoxes
        },
    })
    await settle()

    await clickAt(canvas, 200, 180)
    await hoverAt(canvas, 360, 280)
    await pastDoubleClickWindow()
    await clickAt(canvas, 360, 280)

    t.is("hai cú bấm là một hộp", completed.length, 1)
    t.is("variant được ghi vào hình", completed[0][0].variant, "box")
    await settle(3)
    const box = mouseLayerPixels(canvas)
    t.gt("vẽ ra pixel thật (khung + vạch mức)", box, 300)

    // Square trên cùng hai neo: thêm chéo + quạt góc — phải nhiều pixel hơn hộp trần.
    // Bỏ nhánh square trong gannBoxGeometry là dòng này đỏ.
    tool.gannBoxes = tool.gannBoxes.map(each => ({ ...each, variant: "square" }))
    await settle(3)
    const square = mouseLayerPixels(canvas)
    t.gt("square nhiều nét hơn box", square, box)

    // Rút bảng mức về rỗng: chỉ còn khung + chéo + quạt mức rỗng — ít pixel hơn
    tool.levels = []
    await settle(3)
    t.gt("không mức là ít pixel hơn", square, mouseLayerPixels(canvas))

    cleanup()
    return t.checks
}

TESTS["time cycles: bán nguyệt lặp theo chu kỳ, sine trải hết pane — mode của từng sóng"] = async () => {
    const t = makeChecker()

    const completed = []
    const { canvas, tool } = mountWithTool("chart-time-cycles", {
        enabled: true,
        mode: "cycles",
        snap: false,
        waves: [],
        onComplete: (event, waves) => {
            completed.push(waves)
            tool.waves = waves
        },
    })
    await settle()

    await clickAt(canvas, 200, 220)
    await hoverAt(canvas, 280, 240)
    await pastDoubleClickWindow()
    await clickAt(canvas, 280, 240)

    t.is("hai cú bấm là một sóng", completed.length, 1)
    t.is("sóng mang mode lúc đặt", completed[0][0].mode, "cycles")
    await settle(3)
    t.gt("vẽ ra pixel thật (nhiều bán nguyệt)", mouseLayerPixels(canvas), 200)

    // Kéo tay cầm thứ hai ra xa: chu kỳ giãn — sóng báo lại điểm mới
    await hoverAt(canvas, 240, 230)
    await pastDoubleClickWindow()
    await clickAt(canvas, 240, 230)
    await dragOn(canvas, [280, 240], [340, 240])
    const stretched = completed[completed.length - 1][0]
    t.not("chu kỳ đã đổi theo tay kéo", stretched.end[0].toFixed(1), completed[0][0].end[0].toFixed(1))

    // Sine: đổi mode công cụ rồi đặt sóng thứ hai — sóng cũ giữ mode cũ
    tool.mode = "sine"
    await pastDoubleClickWindow()
    await clickAt(canvas, 420, 180)
    await hoverAt(canvas, 470, 260)
    await pastDoubleClickWindow()
    await clickAt(canvas, 470, 260)
    const both = completed[completed.length - 1]
    t.is("hai sóng trên hình", both.length, 2)
    t.ok("sóng cũ vẫn là cycles, sóng mới là sine", both[0].mode === "cycles" && both[1].mode === "sine")

    cleanup()
    return t.checks
}

TESTS["trend angle: góc đo bằng pixel đúng như nhãn — xoay bằng tay cầm cuối, dời giữ góc"] = async () => {
    const t = makeChecker()

    const completed = []
    const { canvas, tool } = mountWithTool("chart-trend-angle", {
        enabled: true,
        snap: false,
        angles: [],
        onComplete: (event, angles) => {
            completed.push(angles)
            tool.angles = angles
        },
    })
    await settle()

    // Kéo từ (200,240) tới (320,120): lên 120 sang 120 — góc phải quanh 45°
    await clickAt(canvas, 200, 240)
    await hoverAt(canvas, 320, 120)
    await pastDoubleClickWindow()
    await clickAt(canvas, 320, 120)

    t.is("hai cú bấm là một đường góc", completed.length, 1)
    const placed = completed[0][0]
    t.near("góc đo từ pixel: 45°", placed.angle, 45, 2)
    t.near("độ dài đo từ pixel", placed.length, Math.hypot(120, 120), 6)
    await settle(3)
    t.gt("vẽ ra pixel thật (đường + cung + nhãn độ)", mouseLayerPixels(canvas), 100)

    // Kéo tay cầm cuối xuống ngang: góc về gần 0 — xoay là đo lại từ pixel.
    // Hình vừa đặt đang được chọn sẵn nên tay cầm đã hiện — kéo thẳng.
    await pastDoubleClickWindow()
    await dragOn(canvas, [320, 120], [340, 238])
    const rotated = completed[completed.length - 1][0]
    t.ok("xoay xong góc đổi hẳn", Math.abs(rotated.angle - placed.angle) > 20)
    t.is("neo đứng im khi xoay", rotated.start[0], placed.start[0])

    cleanup()
    return t.checks
}

TESTS["gann square fixed: ratio chốt lúc đặt, chiều cao suy từ chiều rộng"] = async () => {
    const t = makeChecker()

    const completed = []
    const { canvas, tool } = mountWithTool("chart-gann-box", {
        enabled: true,
        variant: "squareFixed",
        snap: false,
        gannBoxes: [],
        onComplete: (event, gannBoxes) => {
            completed.push(gannBoxes)
            tool.gannBoxes = gannBoxes
        },
    })
    await settle()

    await clickAt(canvas, 200, 180)
    await hoverAt(canvas, 340, 260)
    await pastDoubleClickWindow()
    await clickAt(canvas, 340, 260)

    t.is("hai cú bấm là một hình", completed.length, 1)
    const placed = completed[0][0]
    t.is("variant được ghi", placed.variant, "squareFixed")
    const expected = Math.abs(placed.end[1] - placed.start[1]) / Math.abs(placed.end[0] - placed.start[0])
    t.near("ratio chốt đúng từ hai neo lúc đặt", placed.scaleRatio, expected, expected * 0.01)
    await settle(3)
    const before = mouseLayerPixels(canvas)
    t.gt("vẽ ra pixel thật", before, 300)

    // Nhân đôi ratio của hình ĐÃ VẼ: chiều cao suy từ chiều rộng phải giãn — hình đổi thật.
    // Bỏ nhánh squareFixed trong gannBoxGeometry là dòng này đỏ.
    tool.gannBoxes = tool.gannBoxes.map(each => ({ ...each, scaleRatio: each.scaleRatio * 2 }))
    await settle(3)
    t.not("đổi ratio là hình đổi", mouseLayerPixels(canvas), before)

    cleanup()
    return t.checks
}

TESTS["notes: note vàng, comment phẳng, signpost có cột, cờ một cú bấm"] = async () => {
    const t = makeChecker()

    const completed = []
    const { canvas, tool } = mountWithTool("chart-note", {
        enabled: true,
        kind: "note",
        text: "nhớ mua",
        snap: false,
        notes: [],
        onComplete: (event, notes) => {
            completed.push(notes)
            tool.notes = notes
        },
    })
    await settle()

    await clickAt(canvas, 220, 200)
    t.is("một cú bấm là một note", completed.length, 1)
    t.is("chữ của người dùng đóng băng vào note", completed[0][0].text, "nhớ mua")
    t.is("kind đóng băng theo", completed[0][0].kind, "note")
    await settle(3)
    t.is("hộp chữ hiện đúng chữ", tool.querySelector("chart-interactive-text").text, "nhớ mua")
    t.gt("vẽ ra pixel thật", mouseLayerPixels(canvas), 100)

    // Comment: đổi kind, đặt cái thứ hai — note cũ giữ kind cũ
    tool.kind = "comment"
    tool.text = undefined
    await pastDoubleClickWindow()
    await clickAt(canvas, 380, 240)
    const both = completed[completed.length - 1]
    t.ok("note cũ vẫn note, cái mới là comment", both[0].kind === "note" && both[1].kind === "comment")

    cleanup()

    // Signpost: một cú bấm, có cột và hộp chữ
    const second = mountWithTool("chart-signpost", {
        enabled: true,
        text: "đáy",
        snap: false,
        signposts: [],
        onComplete: (event, signposts) => {
            completed.push(signposts)
            second.tool.signposts = signposts
        },
    })
    await settle()
    await clickAt(second.canvas, 260, 240)
    t.is("một cú bấm là một cột mốc", completed[completed.length - 1].length, 1)
    t.is("chữ đóng băng vào cột mốc", completed[completed.length - 1][0].text, "đáy")
    await settle(3)
    t.gt("cột + hộp chữ ra pixel thật", mouseLayerPixels(second.canvas), 60)
    cleanup()

    // Flag: một cú bấm, glyph ⚑ cưỡi wrapper arrow-mark
    const third = mountWithTool("chart-flag-mark", {
        enabled: true,
        snap: false,
        flags: [],
        onComplete: (event, flags) => {
            completed.push(flags)
            third.tool.flags = flags
        },
    })
    await settle()
    await clickAt(third.canvas, 300, 220)
    t.is("một cú bấm là một cờ", completed[completed.length - 1].length, 1)
    await settle(3)
    t.is("glyph là cờ", third.tool.querySelector("chart-interactive-text").text, "⚑")
    cleanup()

    return t.checks
}

TESTS["volume candles: bề ngang thân nến theo volume — minWidthRatio điều khiển thật"] = async () => {
    const t = makeChecker()

    const provider = discontinuousTimeScaleProviderBuilder().inputDateAccessor(datum => datum.date)
    const raw = makeData(120).map((row, index) => ({ ...row, volume: index === 60 ? 50000 : 100 }))
    const { data, xScale, xAccessor, displayXAccessor } = provider(raw)

    const canvas = document.createElement("chart-canvas")
    canvas.style.width = "800px"
    canvas.style.height = "400px"
    Object.assign(canvas, {
        data, xScale, xAccessor, displayXAccessor,
        ratio: 1, width: 800, height: 400,
        margin: { top: 10, right: 60, bottom: 30, left: 0 },
        seriesName: "volume-candles",
    })
    const pane = document.createElement("chart-pane")
    Object.assign(pane, { chartId: 0, yExtents: datum => [datum.high, datum.low] })
    const series = document.createElement("chart-volume-candlestick-series")
    pane.append(series)
    canvas.append(pane)
    stage.append(canvas)
    await settle(3)

    const state = canvas.getState()
    const chartConfig = (state.chartConfigs ?? [state.chartConfig]).flat()[0]
    const moreProps = { xAccessor: state.xAccessor, xScale: state.xScale, chartConfig, plotData: state.plotData }

    const candles = getVolumeCandleData(moreProps, {})
    const widths = candles.map(candle => candle.width)
    const widest = Math.max(...widths)
    const slimmest = Math.min(...widths)
    t.gt("nến volume lớn rộng hơn hẳn nến volume nhỏ", widest, slimmest * 3)

    // minWidthRatio 1: volume không còn đường nào đi vào bề ngang — mọi nến bằng nhau.
    // Bỏ phép nhân theo volume trong getVolumeCandleData là dòng trên đỏ.
    const flat = getVolumeCandleData(moreProps, { minWidthRatio: 1 })
    const flatWidths = new Set(flat.map(candle => candle.width.toFixed(4)))
    t.is("minWidthRatio 1 là mọi nến cùng bề ngang", flatWidths.size, 1)

    // Và có pixel thật trên lớp axes — series vẽ thật chứ không chỉ tính
    const context = canvas.getCanvasContexts().axes
    const pixels = context.getImageData(0, 0, context.canvas.width, context.canvas.height).data
    let painted = 0
    for (let at = 3; at < pixels.length; at += 4) if (pixels[at] > 0) painted++
    t.gt("vẽ ra pixel thật", painted, 1000)

    cleanup()
    return t.checks
}

TESTS["freehand: đè-rê-nhả là một nét — highlighter rộng mờ, bề rộng điều khiển thật"] = async () => {
    const t = makeChecker()

    const completed = []
    const { canvas, tool } = mountWithTool("chart-freehand", {
        enabled: true,
        mode: "brush",
        snap: false,
        strokes: [],
        onComplete: (event, strokes) => {
            completed.push(strokes)
            tool.strokes = strokes
        },
    })
    await settle()

    // dragOn phát đúng chuỗi đè-rê-nhả-click của một nét vẽ thật
    await dragOn(canvas, [200, 200], [320, 260])
    t.is("một cú kéo là một nét", completed.length, 1)
    t.gt("nét có nhiều điểm", completed[0][0].points.length, 2)
    t.is("nét mang mode lúc vẽ", completed[0][0].mode, "brush")
    await settle(3)
    t.gt("vẽ ra pixel thật", mouseLayerPixels(canvas), 60)

    // Highlighter: đổi mode, kéo nét thứ hai ở chỗ trống — nét cũ giữ mode cũ
    tool.mode = "highlighter"
    await pastDoubleClickWindow()
    await dragOn(canvas, [250, 120], [420, 150])
    const both = completed[completed.length - 1]
    t.is("hai nét trên hình", both.length, 2)
    t.ok("nét cũ vẫn brush, nét mới là highlighter", both[0].mode === "brush" && both[1].mode === "highlighter")

    // Bề rộng highlighter điều khiển pixel: nới gấp đôi là phủ nhiều pixel hơn.
    // Bỏ nhánh highlighter trong drawFreehand là dòng này đỏ.
    await settle(3)
    const before = mouseLayerPixels(canvas)
    tool.strokes = tool.strokes.map(each =>
        each.mode === "highlighter" ? { ...each, appearance: { ...each.appearance, highlighterWidth: 30 } } : each,
    )
    await settle(3)
    t.gt("highlighter rộng hơn là nhiều pixel hơn", mouseLayerPixels(canvas), before)

    cleanup()
    return t.checks
}

TESTS["anchored box: neo màn hình theo tỉ lệ pane — zoom đứng yên, bảng đo cột theo ô"] = async () => {
    const t = makeChecker()

    const completed = []
    const { canvas, tool } = mountWithTool("chart-anchored-text", {
        enabled: true,
        kind: "text",
        text: "ghi chú nằm im",
        snap: false,
        anchoredTexts: [],
        onComplete: (event, anchoredTexts) => {
            completed.push(anchoredTexts)
            tool.anchoredTexts = anchoredTexts
        },
    })
    await settle()

    await clickAt(canvas, 300, 200)
    t.is("một cú bấm là một hộp", completed.length, 1)
    const placed = completed[0][0]
    t.ok("vị trí là TỈ LỆ pane, không phải toạ độ dữ liệu", placed.at[0] > 0 && placed.at[0] < 1 && placed.at[1] > 0 && placed.at[1] < 1)
    await settle(3)
    const before = mouseLayerPixels(canvas)
    t.gt("vẽ ra pixel thật", before, 100)

    // Zoom domain đổi hẳn — hộp neo màn hình KHÔNG được nhúc nhích một pixel
    canvas.xAxisZoom([20, 60])
    await settle(3)
    t.is("zoom xong hộp đứng nguyên chỗ cũ", mouseLayerPixels(canvas), before)

    // Bảng: cột rộng theo ô dài nhất của cột — đo thẳng bằng hình học leaf
    const box = anchoredBoxGeometry(
        { at: [0.1, 0.1], cells: [["a", "dài hơn hẳn"], ["b", "c"]] },
        { chartConfig: { width: 800, height: 400 } },
    )
    t.gt("cột hai rộng hơn cột một", box.widths[1], box.widths[0])

    cleanup()
    return t.checks
}

TESTS["price note: neo ghim giá, nhãn đọc giá ấy — kéo neo là chữ đổi theo"] = async () => {
    const t = makeChecker()

    const completed = []
    const { canvas, tool } = mountWithTool("chart-price-note", {
        enabled: true,
        text: "kháng cự",
        snap: false,
        priceNotes: [],
        onComplete: (event, priceNotes) => {
            completed.push(priceNotes)
            tool.priceNotes = priceNotes
        },
    })
    await settle()

    await clickAt(canvas, 220, 240)
    await hoverAt(canvas, 340, 160)
    await pastDoubleClickWindow()
    await clickAt(canvas, 340, 160)

    t.is("hai cú bấm là một price note", completed.length, 1)
    const note = completed[0][0]
    await settle(3)
    const label = tool.querySelector("chart-interactive-text")
    t.is("nhãn đọc đúng giá neo kèm lời ghi", label.text, `${note.at[1].toFixed(2)} · kháng cự`)
    t.gt("vẽ ra pixel thật", mouseLayerPixels(canvas), 100)

    // Kéo neo giá xuống: giá đổi, chữ đổi theo — nhãn sống theo dữ liệu
    await dragOn(canvas, [220, 240], [220, 300])
    const moved = completed[completed.length - 1][0]
    t.not("giá neo đã đổi", moved.at[1].toFixed(2), note.at[1].toFixed(2))
    await settle(3)
    t.is("và nhãn đọc giá mới", tool.querySelector("chart-interactive-text").text, `${moved.at[1].toFixed(2)} · kháng cự`)

    cleanup()
    return t.checks
}

TESTS["pin và image: ghim một bấm, ảnh hai góc căng theo dữ liệu"] = async () => {
    const t = makeChecker()

    const completed = []
    const { canvas, tool } = mountWithTool("chart-pin", {
        enabled: true,
        snap: false,
        pins: [],
        onComplete: (event, pins) => {
            completed.push(pins)
            tool.pins = pins
        },
    })
    await settle()
    const emptyBoard = mouseLayerPixels(canvas)
    await clickAt(canvas, 260, 220)
    t.is("một cú bấm là một ghim", completed.length, 1)
    await settle(3)
    t.is("glyph là ghim", tool.querySelector("chart-interactive-text").text, "📍")

    /**
     * Và phải THẤY ĐƯỢC — khẳng định này sinh ra từ một lỗi thật.
     *
     * Bản đầu của Pin truyền `fill: undefined`, tin rằng emoji tự mang màu. Gán
     * `undefined` cho `fillStyle` là giá trị không hợp lệ nên canvas bỏ qua, giữ
     * nguyên màu nền trong suốt vừa đặt — ghim đặt được, chọn được, kéo được,
     * mà vô hình. Bài cũ chỉ hỏi glyph là gì, không hỏi nó có hiện ra không,
     * nên xanh suốt — người dùng phát hiện hộ.
     */
    t.gt("và ghim hiện ra pixel thật", mouseLayerPixels(canvas), emptyBoard)
    cleanup()

    // Ảnh: 1×1 pixel đỏ căng giữa hai neo — vùng đỏ phải phủ khung
    const RED_DOT = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    const second = mountWithTool("chart-image-tool", {
        enabled: true,
        src: RED_DOT,
        snap: false,
        images: [],
        onComplete: (event, images) => {
            completed.push(images)
            second.tool.images = images
        },
    })
    await settle()
    await clickAt(second.canvas, 200, 180)
    await hoverAt(second.canvas, 360, 300)
    await pastDoubleClickWindow()
    await clickAt(second.canvas, 360, 300)
    t.is("hai cú bấm là một ảnh", completed[completed.length - 1].length, 1)
    t.is("ảnh mang src lúc đặt", completed[completed.length - 1][0].src, RED_DOT)
    await settle(5)
    t.gt("ảnh căng ra phủ pixel thật", mouseLayerPixels(second.canvas), 5000)
    cleanup()

    return t.checks
}

TESTS["pan vẫn sống khi có tool một-bấm trên biểu đồ — hình theo chuột NGAY giữa cú kéo"] = async () => {
    const t = makeChecker()

    // Tool một-bấm GẮN nhưng KHÔNG bật — đúng cảnh đã làm pan đứng hình suốt
    // 11 PR: indicator của nó không được gán onMouseMove, và onPan gọi trúng prop
    // che undefined thay vì phương thức — nổ giữa vòng phát pan. Domain chỉ chốt
    // lúc nhả chuột kể cả khi pan chạy đúng, nên trọng tài ở đây là PIXEL: hình
    // phải đổi ngay giữa cú kéo, không đợi tới mouseup.
    const { canvas } = mountWithTool("chart-price-label", {
        enabled: false,
        snap: false,
        labels: [],
    })
    await settle()

    const snap = () => {
        const context = canvas.getCanvasContexts().axes
        return context.getImageData(0, 0, context.canvas.width, context.canvas.height).data
    }
    const differs = (a, b) => {
        for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return true
        return false
    }

    const domainBefore = canvas.getState().xScale.domain().map(Number).join()
    const before = snap()

    const rect = canvas.shadowRoot.querySelector("[data-event-capture]")
    const box = rect.getBoundingClientRect()
    const at = (type, target, [x, y], extra = {}) =>
        target.dispatchEvent(
            new MouseEvent(type, { clientX: box.left + x, clientY: box.top + y, bubbles: true, composed: true, button: 0, ...extra }),
        )

    at("mouseenter", rect, [400, 200])
    at("mousemove", window, [400, 200])
    await settle(2)
    at("mousedown", rect, [400, 200], { buttons: 1 })
    await settle(1)
    at("mousemove", window, [320, 200], { buttons: 1 })
    await settle(3)

    // Khẳng định quan trọng nhất: hình ĐÃ đổi TRƯỚC khi nhả chuột
    t.ok("hình theo chuột ngay giữa cú kéo", differs(before, snap()))

    at("mousemove", window, [240, 200], { buttons: 1 })
    await settle(2)
    at("mouseup", window, [240, 200], { buttons: 0 })
    at("click", rect, [240, 200])
    await settle(2)

    t.not("nhả xong domain khác lúc đầu", canvas.getState().xScale.domain().map(Number).join(), domainBefore)

    cleanup()
    return t.checks
}

TESTS["terminate: nét vẽ dở dang phải chết theo — Clear không để lại bóng ma"] = async () => {
    const t = makeChecker()

    const completed = []
    const { canvas, tool } = mountWithTool("chart-fib-shape", {
        enabled: true,
        variant: "circles",
        snap: false,
        fibShapes: [],
        onComplete: (event, fibShapes) => {
            completed.push(fibShapes)
            tool.fibShapes = fibShapes
        },
    })
    await settle()

    // Vẽ TRỌN một hình, rồi bấm THÊM một nhát — mở một cử chỉ dở dang đúng
    // kiểu người dùng thật; hình tạm bám con trỏ từ đây.
    await clickAt(canvas, 250, 200)
    await hoverAt(canvas, 320, 240)
    await pastDoubleClickWindow()
    await clickAt(canvas, 320, 240)
    await pastDoubleClickWindow()
    await clickAt(canvas, 420, 160)
    await hoverAt(canvas, 480, 220)
    await settle(3)
    t.gt("hình thật + hình tạm dở dang đều ra pixel", mouseLayerPixels(canvas), 300)

    // Clear kiểu ứng dụng: xoá danh sách VÀ huỷ cử chỉ dở dang.
    // Bỏ terminate() là dòng dưới đỏ: hình tạm sống sót thành bóng ma.
    tool.fibShapes = []
    tool.terminate()
    await settle(3)
    // Bóng ma là hàng nghìn pixel; chừa 20 cho cái chấm con trỏ của indicator
    t.gt("sau Clear sạch — nhiều nhất còn chấm con trỏ", 20, mouseLayerPixels(canvas))

    cleanup()
    return t.checks
}

window.runChartTests = async () => {
    const results = []

    for (const [name, run] of Object.entries(TESTS)) {
        try {
            results.push({ name, checks: await run() })
        } catch (error) {
            cleanup()
            results.push({ name, error: error.stack ?? error.message })
        }
    }

    return results
}

window.chartReady = true
