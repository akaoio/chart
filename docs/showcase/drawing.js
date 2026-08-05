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

const chart = (host, options) => chartHost(host, daily(160), { height: 420, ...options })

demo({
    title: "Seven tools, one at a time",
    about:
        "Choose a tool and click on the chart — most take two clicks, the equidistant channel " +
        "takes three, and text takes one. Click a drawn object to select it, then press " +
        "Delete. Everything drawn is listed under the chart, exactly as the tools report it.",
    build: (stage, api) => {
        const { pane } = chart(stage)

        // Each tool holds its own list of drawn objects, under its own property name.
        const tools = [
            { label: "Trend line", tag: "chart-trend-line", list: "trends" },
            { label: "Fibonacci", tag: "chart-fibonacci-retracement", list: "retracements" },
            { label: "Channel", tag: "chart-equidistant-channel", list: "channels" },
            { label: "Regression", tag: "chart-standard-deviation-channel", list: "channels" },
            { label: "Gann fan", tag: "chart-gann-fan-tool", list: "fans" },
            { label: "Text", tag: "chart-interactive-text-tool", list: "textList" },
            { label: "Alert", tag: "chart-interactive-y-coordinate-tool", list: "yCoordinateList" },
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

        // Alerts are not drawn at all — they arrive already made. One button adds one at
        // the price in the middle of the pane.
        const alerts = tools.find(tool => tool.tag === "chart-interactive-y-coordinate-tool").node
        alerts.onDelete = (event, alert) => {
            alerts.yCoordinateList = alerts.yCoordinateList.filter(each => each.id !== alert.id)
            report()
        }

        // Selection is a separate element, because only something that can see every tool
        // can decide which object a click landed on.
        const selector = document.createElement("chart-drawing-object-selector")
        Object.assign(selector, {
            getInteractiveNodes: () =>
                Object.fromEntries(
                    tools.map(tool => [tool.tag, { type: tool.tag, chartId: undefined, node: tool.node }]),
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

        api.button("Add alert", () => {
            const middle = Math.round((Math.max(...daily(160).map(datum => datum.high)) +
                Math.min(...daily(160).map(datum => datum.low))) / 2)

            alerts.yCoordinateList = [
                ...alerts.yCoordinateList,
                {
                    ...alertTemplate,
                    id: `alert-${alerts.yCoordinateList.length + 1}`,
                    yValue: middle + alerts.yCoordinateList.length * 2,
                },
            ]
            report()
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
