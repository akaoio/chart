import { daily } from "./data.js"
import { chartHost, demo, page } from "./showcase.js"

page({
    title: "Drawing tools",
    intro:
        "The tools you draw on a chart with. Pick one, click on the chart to place it, then " +
        "drag its handles to adjust it. Nothing here is stored by the library: each tool tells " +
        "you what was drawn and you hand the list back to it.",
})

const price = datum => [datum.high, datum.low]

const chart = (host, options) =>
    chartHost(host, daily(160), { height: 420, series: ["chart-candlestick-series"], ...options })

/**
 * The sticker's picture, built here — in the page, not in the library.
 *
 * `chart-sticker` carries the behaviour (one anchor, one handle, a fixed pixel
 * size); the picture is `src`, and it comes from the application, exactly like
 * `chart-image-tool`. Emoji, logos, flags and signatures all arrive this way, so
 * the library never decides what you are allowed to stamp on a chart.
 */
const stickerImage =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
            '<circle cx="16" cy="16" r="15" fill="#FFD54F" stroke="#F9A825" stroke-width="2"/>' +
            '<circle cx="11" cy="13" r="2" fill="#5D4037"/><circle cx="21" cy="13" r="2" fill="#5D4037"/>' +
            '<path d="M9 19a7 7 0 0 0 14 0" fill="none" stroke="#5D4037" stroke-width="2" stroke-linecap="round"/>' +
            "</svg>",
    )

demo({
    title: "Sixty-nine tools, one at a time",
    about:
        "Choose a tool and click on the chart — most take two clicks, the equidistant channel, " +
        "the pitchfork, the fib extension, the projection and the fib time extension take three, the pattern takes four to seven, the path and the polyline finish on a double-click, and text, alert, H-line, position, price label and sticker take one. Click a " +
        "drawn object to select it, then press Delete. Everything drawn is listed under the " +
        "chart, exactly as the tools report it.",
    build: (stage, api) => {
        const { pane } = chart(stage)

        // Each tool holds its own list of drawn objects, under its own property name.
        // Mấy dòng mới nối vào CUỐI: bài kiểm nth-child đang trỏ vào vị trí nút "Text".
        const tools = [
            { label: "Trend line", tag: "chart-trend-line", list: "trends" },
            { label: "Fibonacci", tag: "chart-fibonacci-retracement", list: "retracements" },
            { label: "Channel", tag: "chart-equidistant-channel", list: "channels" },
            { label: "Regression", tag: "chart-standard-deviation-channel", list: "channels" },
            { label: "Gann fan", tag: "chart-gann-fan-tool", list: "fans" },
            { label: "Text", tag: "chart-interactive-text-tool", list: "textList" },
            { label: "Alert", tag: "chart-interactive-y-coordinate-tool", list: "yCoordinateList" },
            { label: "H-line", tag: "chart-axis-line", list: "lines" },
            { label: "Rectangle", tag: "chart-shape-tool", list: "shapes" },
            { label: "Measure", tag: "chart-measure", list: "measures" },
            { label: "Position", tag: "chart-position-tool", list: "positions" },
            { label: "Pitchfork", tag: "chart-pitchfork", list: "forks" },
            { label: "Fib ext", tag: "chart-fib-extension", list: "extensions" },
            { label: "Callout", tag: "chart-callout", list: "callouts" },
            { label: "Price label", tag: "chart-price-label", list: "labels" },
            { label: "Pattern", tag: "chart-pattern", list: "patterns" },
            { label: "Path", tag: "chart-path", list: "paths" },
            { label: "Cyclic", tag: "chart-cyclic-lines", list: "cycles" },
            { label: "Arrow", tag: "chart-arrow", list: "arrows" },
            { label: "Arrow mark", tag: "chart-arrow-mark", list: "marks" },
            { label: "Info line", tag: "chart-info-line", list: "infoLines" },
            { label: "Fib zone", tag: "chart-fib-time-zone", list: "zones" },
            { label: "Fib fan", tag: "chart-fib-shape", list: "fibShapes", props: { variant: "fan" } },
            { label: "Fib arcs", tag: "chart-fib-shape", list: "fibShapes", props: { variant: "arcs" } },
            { label: "Fib circles", tag: "chart-fib-shape", list: "fibShapes", props: { variant: "circles" } },
            { label: "Fib spiral", tag: "chart-fib-shape", list: "fibShapes", props: { variant: "spiral" } },
            { label: "Fib wedge", tag: "chart-fib-shape", list: "fibShapes", props: { variant: "wedge" } },
            { label: "Gann box", tag: "chart-gann-box", list: "gannBoxes", props: { variant: "box" } },
            { label: "Gann square", tag: "chart-gann-box", list: "gannBoxes", props: { variant: "square" } },
            { label: "Time cycles", tag: "chart-time-cycles", list: "waves", props: { mode: "cycles" } },
            { label: "Sine line", tag: "chart-time-cycles", list: "waves", props: { mode: "sine" } },
            { label: "Trend angle", tag: "chart-trend-angle", list: "angles" },
            { label: "Gann sq fixed", tag: "chart-gann-box", list: "gannBoxes", props: { variant: "squareFixed" } },
            { label: "Note", tag: "chart-note", list: "notes", props: { kind: "note" } },
            { label: "Comment", tag: "chart-note", list: "notes", props: { kind: "comment" } },
            { label: "Signpost", tag: "chart-signpost", list: "signposts" },
            { label: "Flag", tag: "chart-flag-mark", list: "flags" },
            { label: "Brush", tag: "chart-freehand", list: "strokes", props: { mode: "brush" } },
            { label: "Highlighter", tag: "chart-freehand", list: "strokes", props: { mode: "highlighter" } },
            { label: "Anchored text", tag: "chart-anchored-text", list: "anchoredTexts", props: { kind: "text" } },
            { label: "Anchored note", tag: "chart-anchored-text", list: "anchoredTexts", props: { kind: "note" } },
            { label: "Price note", tag: "chart-price-note", list: "priceNotes" },
            { label: "Pin", tag: "chart-pin", list: "pins" },
            { label: "Table", tag: "chart-table", list: "tables" },
            { label: "Image", tag: "chart-image-tool", list: "images" },
            { label: "Disjoint", tag: "chart-disjoint-channel", list: "channels", props: { variant: "disjoint" } },
            { label: "Flat T/B", tag: "chart-disjoint-channel", list: "channels", props: { variant: "flat" } },
            { label: "Pitchfan", tag: "chart-pitchfork", list: "forks", props: { variant: "fan" } },
            { label: "Fib channel", tag: "chart-equidistant-channel", list: "channels", props: { levels: [0, 0.25, 0.382, 0.5, 0.618, 0.75, 1] } },
            { label: "Rotated rect", tag: "chart-rotated-rect", list: "rects" },
            { label: "Anchored VWAP", tag: "chart-anchored-vwap", list: "vwaps" },
            { label: "Volume profile", tag: "chart-volume-profile-tool", list: "profiles" },
            { label: "Bars pattern", tag: "chart-bars-pattern", list: "patterns" },
            // chart#34 — phần dư của #5. Hai dòng Elliott đầu tiên là bằng chứng của
            // kiến trúc: thêm một mẫu hình = thêm một dòng trong PATTERN_VARIANTS.
            { label: "Elliott WXY", tag: "chart-pattern", list: "patterns", props: { variant: "elliottDoubleCombo" } },
            { label: "Elliott WXYXZ", tag: "chart-pattern", list: "patterns", props: { variant: "elliottTripleCombo" } },
            // Price/Date range KHÔNG phải phần tử mới — `chart-measure` đã có mode từ #5,
            // thiếu đúng cái demo. Hai dòng này là toàn bộ việc phải làm cho chúng.
            { label: "Price range", tag: "chart-measure", list: "measures", props: { mode: "price" } },
            { label: "Date range", tag: "chart-measure", list: "measures", props: { mode: "date" } },
            { label: "Arrow left", tag: "chart-arrow-mark", list: "marks", props: { mode: "left" } },
            { label: "Arrow right", tag: "chart-arrow-mark", list: "marks", props: { mode: "right" } },
            { label: "Triangle", tag: "chart-curve-tool", list: "curves", props: { variant: "triangle" } },
            { label: "Polyline", tag: "chart-curve-tool", list: "curves", props: { variant: "polyline" } },
            { label: "Arc", tag: "chart-curve-tool", list: "curves", props: { variant: "arc" } },
            { label: "Curve", tag: "chart-curve-tool", list: "curves", props: { variant: "curve" } },
            { label: "Double curve", tag: "chart-curve-tool", list: "curves", props: { variant: "doubleCurve" } },
            // Con dấu: gói không mang bức hình nào, ứng dụng đưa `src` vào — chính trang
            // này là "ứng dụng", và hình của nó dựng ngay dưới đây bằng vài dòng SVG.
            { label: "Sticker", tag: "chart-sticker", list: "stickers", props: { src: stickerImage } },
            { label: "Fib time ext", tag: "chart-fib-time-extension", list: "extensions" },
            { label: "Forecast", tag: "chart-projection", list: "projections", props: { variant: "forecast" } },
            { label: "Projection", tag: "chart-projection", list: "projections", props: { variant: "projection" } },
            { label: "Ghost feed", tag: "chart-bars-pattern", list: "patterns", props: { mode: "ghost" } },
        ]

        let active = null

        const report = () => {
            const drawn = tools
                .map(tool => `${tool.label}: ${tool.node[tool.list].length}`)
                .filter(line => !line.endsWith(": 0"))
            api.say(drawn.length === 0 ? "nothing drawn yet" : drawn.join("   "))
        }

        for (const tool of tools) {
            const node = document.createElement(tool.tag)
            tool.node = node
            node[tool.list] = []
            node.enabled = false
            if (tool.props) Object.assign(node, tool.props)

            // Every tool reports a finished object the same way: here is the new list.
            node.onComplete = (event, list) => {
                node[tool.list] = list
                report()
            }
            node.onDragComplete = (event, list) => {
                node[tool.list] = list
                report()
            }

            pane.append(node)
        }

        // Text is the odd one out: one click places it, and it reports the new label alone.
        const text = tools.find(tool => tool.tag === "chart-interactive-text-tool").node
        text.onChoosePosition = (event, label) => {
            text.textList = [...text.textList.map(each => ({ ...each, selected: false })), { ...label, selected: true }]
            report()
        }

        /**
         * The alert tool has no placing gesture of its own — so this is where one comes from.
         *
         * Every other tool here listens for its own clicks. `chart-interactive-y-coordinate`
         * does not: it draws alerts you hand it and lets you drag or delete them, and that is
         * all. (The original declares an `onChoosePosition` prop for it and never calls it.)
         *
         * Which is fine, because placing one is four lines of application code — read the
         * price under the pointer off the pane's own scale and append it. Nothing about it
         * needs to live in the library.
         */
        const alerts = tools.find(tool => tool.tag === "chart-interactive-y-coordinate-tool").node
        alerts.onDelete = (event, alert) => {
            alerts.yCoordinateList = alerts.yCoordinateList.filter(each => each.id !== alert.id)
            report()
        }

        const placeAlert = document.createElement("chart-click-callback")
        placeAlert.onClick = (event, moreProps) => {
            if (active?.node !== alerts) return

            const [, y] = moreProps.mouseXY
            alerts.yCoordinateList = [
                ...alerts.yCoordinateList.map(each => ({ ...each, selected: false })),
                {
                    ...alertTemplate,
                    id: `alert-${alerts.yCoordinateList.length + 1}`,
                    yValue: Math.round(moreProps.chartConfig.yScale.invert(y) * 100) / 100,
                },
            ]
            report()
        }
        pane.append(placeAlert)

        // Selection is a separate element, because only something that can see every tool
        // can decide which object a click landed on.
        const selector = document.createElement("chart-drawing-object-selector")
        Object.assign(selector, {
            // `chartId` phải là id của pane công cụ đang nằm trong, vì đó là thứ được dùng
            // để thu `moreProps` về đúng pane ấy. Trước đây chỗ này truyền `undefined`, và
            // vì pane mặc định có id là 0 nên không khớp: mọi cú bấm sau khi đã vẽ được một
            // đối tượng đều nổ, và cú nổ cắt ngang việc phát sự kiện cho những công cụ đăng
            // ký sau — bấm gì cũng không ăn. Phần tử tự biết pane của mình, nên hỏi nó.
            // Khoá theo label chứ không theo tag: năm variant fib-shape là năm node
            // cùng tag — khoá trùng thì chỉ node cuối còn được hỏi khi chọn.
            getInteractiveNodes: () =>
                Object.fromEntries(
                    tools.map(tool => [tool.label, { type: tool.label, chartId: tool.node.chartId, node: tool.node }]),
                ),
            drawingObjectMap: Object.fromEntries(tools.map(tool => [tool.label, tool.list])),
            // `onSelect` nhận một MẢNG, theo thứ tự của `getInteractiveNodes` — không
            // phải một object cùng khoá. Đó là `mapObject` của bản gốc, vốn chép từ
            // lodash và trả về mảng.
            onSelect: (event, interactives) => {
                for (const found of interactives) {
                    const tool = tools.find(each => each.label === found.type)
                    if (tool === undefined) continue

                    tool.node[tool.list] = tool.node[tool.list].map((each, index) => ({
                        ...each,
                        selected: found.objects[index]?.selected === true,
                    }))
                }
                report()
            },
        })
        pane.append(selector)

        const choose = (tool, button) => {
            active = active === tool ? null : tool
            for (const each of tools) {
                // Tắt hay đổi công cụ là huỷ nét vẽ dở dang — hình tạm của một cử chỉ
                // chưa xong không được sống thành bóng ma mà Clear không đụng tới được.
                if (each.node.enabled && each !== active) each.node.terminate?.()
                each.node.enabled = each === active
            }
            for (const each of buttons) each.setAttribute("aria-pressed", String(each === button && active !== null))
        }

        const buttons = tools.map(tool => {
            const button = api.button(tool.label, node => choose(tool, node))
            button.setAttribute("aria-pressed", "false")
            return button
        })

        api.button("Clear", () => {
            for (const tool of tools) {
                tool.node.terminate?.()
                tool.node[tool.list] = []
            }
            report()
        })

        // Delete removes whatever is selected, in whichever tool holds it.
        window.addEventListener("keydown", event => {
            if (event.key !== "Delete" && event.key !== "Backspace") return
            for (const tool of tools) {
                tool.node[tool.list] = tool.node[tool.list].filter(each => !each.selected)
            }
            report()
        })

        report()
    },
})

/** What an alert looks like. The tool draws these; it never invents one. */
const alertTemplate = {
    draggable: true,
    bgFill: "#FFFFFF",
    stroke: "#6574CD",
    strokeDasharray: "ShortDash2",
    strokeWidth: 1,
    textFill: "#6574CD",
    fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
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

demo({
    title: "Brush",
    about:
        "Drag a box over the chart. The brush reports the two corners and then clears itself — " +
        "what a selection means is your decision, not the library's. Here it prints them.",
    build: (stage, api) => {
        const { pane } = chart(stage, { height: 300 })

        const brush = document.createElement("chart-brush")
        Object.assign(brush, {
            enabled: true,
            fillStyle: "rgba(42, 109, 244, 0.12)",
            strokeStyle: "#2a6df4",
            onBrush: ({ start, end }) => {
                api.say(
                    `from ${start.item.date.toISOString().slice(0, 10)} at ${start.yValue.toFixed(2)}` +
                        `  →  ${end.item.date.toISOString().slice(0, 10)} at ${end.yValue.toFixed(2)}`,
                )
            },
        })

        pane.append(brush)
        api.say("drag a box over the chart")
    },
})
