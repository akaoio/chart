import { ChartCanvas, GenericChartComponent, getAxisCanvas } from "../../src/core/index.js"
import { CircleMarker } from "../../src/series/index.js"
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
 * Hai lần bấm trong vòng 400ms là một cú NHẤP ĐÚP, không phải hai cú bấm — đúng như bản
 * gốc quy định. Vẽ trendline cần hai cú bấm rời nhau, nên bài kiểm phải chờ thật.
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
