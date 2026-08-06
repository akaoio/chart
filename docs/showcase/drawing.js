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

demo({
    title: "Eleven tools, one at a time",
    about:
        "Choose a tool and click on the chart — most take two clicks, the equidistant channel " +
        "takes three, and text, alert, H-line and position take one. Click a drawn object to " +
        "select it, then press Delete. Everything drawn is listed under the chart, exactly as " +
        "the tools report it.",
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
            getInteractiveNodes: () =>
                Object.fromEntries(
                    tools.map(tool => [tool.tag, { type: tool.tag, chartId: tool.node.chartId, node: tool.node }]),
                ),
            drawingObjectMap: Object.fromEntries(tools.map(tool => [tool.tag, tool.list])),
            // `onSelect` nhận một MẢNG, theo thứ tự của `getInteractiveNodes` — không
            // phải một object cùng khoá. Đó là `mapObject` của bản gốc, vốn chép từ
            // lodash và trả về mảng.
            onSelect: (event, interactives) => {
                for (const found of interactives) {
                    const tool = tools.find(each => each.tag === found.type)
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
            for (const each of tools) each.node.enabled = each === active
            for (const each of buttons) each.setAttribute("aria-pressed", String(each === button && active !== null))
        }

        const buttons = tools.map(tool => {
            const button = api.button(tool.label, node => choose(tool, node))
            button.setAttribute("aria-pressed", "false")
            return button
        })

        api.button("Clear", () => {
            for (const tool of tools) tool.node[tool.list] = []
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
