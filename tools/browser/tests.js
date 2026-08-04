import { ChartCanvas, GenericChartComponent, getAxisCanvas } from "../../src/core/index.js"
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
