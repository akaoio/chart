import { discontinuousTimeScaleProviderBuilder } from "@akaoio/chart"

/**
 * The scaffolding around the demos: navigation, the card each demo sits in, and the
 * source listing under it.
 *
 * One rule shapes this file. **The code shown under a demo is the code that ran** — it is
 * `build.toString()`, not a copy kept alongside. There is no way for the listing to drift
 * from the chart above it, because there is only one of them.
 */

const PAGES = [
    ["index.html", "Overview"],
    ["series.html", "Series"],
    ["indicators.html", "Indicators"],
    ["coordinates.html", "Cursors & tooltips"],
    ["drawing.html", "Drawing tools"],
    ["interaction.html", "Interaction"],
]

const here = location.pathname.split("/").pop() || "index.html"

/** Strip the wrapper off an arrow function and un-indent what is left. */
const sourceOf = build => {
    let text = build.toString()

    const arrow = text.indexOf("=>")
    if (arrow !== -1) text = text.slice(arrow + 2).trim()

    if (text.startsWith("{") && text.endsWith("}")) text = text.slice(1, -1)

    const lines = text.replace(/^\n+|\s+$/g, "").split("\n")
    const indent = Math.min(
        ...lines.filter(line => line.trim() !== "").map(line => line.match(/^ */)[0].length),
    )

    return lines.map(line => line.slice(indent)).join("\n")
}

const element = (tag, attrs = {}, children = []) => {
    const node = document.createElement(tag)
    for (const [name, value] of Object.entries(attrs)) {
        if (name === "text") node.textContent = value
        else node.setAttribute(name, value)
    }
    node.append(...children)
    return node
}

/**
 * One demo: a heading, a note, the live thing, and its source.
 *
 * `build` receives the stage element and may return an object with `controls` (buttons to
 * put under the chart) and `readout` (a function called with a string to display).
 */
export const demo = ({ title, about, build }) => {
    const section = element("section", { class: "demo" })
    const stage = element("div", { class: "stage" })
    const controls = element("div", { class: "controls" })
    const readout = element("div", { class: "readout" })

    section.append(element("h2", { text: title }))
    if (about) section.append(element("p", { class: "about", text: about }))
    section.append(stage, controls, readout)

    const details = element("details")
    details.append(element("summary", { text: "Source" }), element("pre", { text: sourceOf(build) }))
    section.append(details)

    document.querySelector("main").append(section)

    const api = {
        stage,
        say: message => {
            readout.textContent = message
        },
        button: (label, onClick) => {
            const node = element("button", { type: "button", text: label })
            node.addEventListener("click", () => onClick(node))
            controls.append(node)
            return node
        },
    }

    // Errors inside one demo must not take the rest of the page with them.
    try {
        build(stage, api)
    } catch (error) {
        readout.textContent = `failed: ${error.message}`
        throw error
    }

    return api
}

/**
 * Which slice of the data to open on.
 *
 * Fewer bars on a narrow screen — 160 candles across 350 pixels is one pixel each, and
 * a chart you are meant to click on has to have something clickable in it.
 */
export const opening = (data, xAccessor, { wide = 160, narrow = 55 } = {}) => {
    const count = Math.min(data.length, window.innerWidth < 640 ? narrow : wide)
    return [xAccessor(data[data.length - count]), xAccessor(data[data.length - 1])]
}

/**
 * A row of small charts inside one demo, for galleries.
 *
 * Every cell is put in place **before** any chart is built into one. A chart measures
 * its own box the moment it connects, and a cell that is still the only child of the
 * grid is full width — the chart would size itself to that, then get narrower when the
 * next cell arrives. It survives that, but `maintainPointsPerPixelOnResize` keeps the
 * candle width and drops bars instead, so the first cell would quietly show a different
 * stretch of history than the rest.
 */
export const grid = (stage, entries, build) => {
    const container = element("div", { class: "grid" })
    stage.append(container)

    const cells = entries.map(entry => {
        const cell = element("div", { class: "cell" })
        cell.append(element("h3", { text: entry.title ?? entry }))
        container.append(cell)
        return cell
    })

    entries.forEach((entry, index) => build(cells[index], entry))
}

export const page = ({ title, intro }) => {
    document.title = `${title} — chart`

    const header = element("header", { class: "site" })
    const heading = element("h1")
    heading.append(element("a", { href: "index.html", text: "chart" }))
    header.append(
        heading,
        element("p", {
            class: "tagline",
            text: "Financial charts as plain Web Components. No framework, no build step.",
        }),
    )

    const nav = element("nav", { class: "site" })
    for (const [href, label] of PAGES) {
        const link = element("a", { href, text: label })
        if (href === here) link.setAttribute("aria-current", "page")
        nav.append(link)
    }
    nav.append(element("a", { href: "../README.md", class: "away", text: "Documentation ↗" }))
    header.append(nav)

    const main = element("main")
    if (intro) main.append(element("p", { class: "intro", text: intro }))

    document.body.append(header, main)

    window.addEventListener("load", () => {
        main.append(
            element("p", {
                class: "disclaimer",
                text:
                    "Every chart on this site is drawn from a seeded random walk generated in the " +
                    "browser. It is not a real instrument and not a claim about any market.",
            }),
        )
    })
}

/**
 * Cái khung mà gần như mọi demo cần: một canvas, một pane, hai trục.
 *
 * Trước đây mỗi trang chép một bản gần giống nhau. Nó là giàn giáo chứ không phải nội
 * dung — phần mã hiện dưới mỗi demo là thân hàm `build`, và giàn giáo không nằm trong đó —
 * nên gom về một chỗ không giấu đi thứ gì của người đọc.
 *
 * Nó **không** tự dựng series nào: trang nào muốn nến thì phải hỏi, bằng `series`. Đợt gom
 * này từng dựng nến sẵn rồi đánh rơi mất dòng ấy, và ba trang chỉ còn hai cái trục — mà
 * nếu chữa bằng cách dựng sẵn lại, thì trang tự lo series của mình (`indicators`) lãnh hai
 * lớp nến đè nhau. Không mặc định thì cả hai kiểu sai đều lộ ra ngay ở chỗ gọi.
 *
 * Thứ tự đăng ký là thứ tự vẽ, nên series vào pane trước hai trục.
 */
export const chartHost = (
    host,
    rows,
    {
        height = 360,
        yExtents = datum => [datum.high, datum.low],
        margin = { left: 0, right: 56, top: 8, bottom: 24 },
        ticks = 5,
        tickFormat,
        fontSize = 11,
        bars,
        series = [],
        ...canvasProps
    } = {},
) => {
    const provider = discontinuousTimeScaleProviderBuilder().inputDateAccessor(datum => datum.date)
    const { data, xScale, xAccessor, displayXAccessor } = provider(rows)

    const canvas = document.createElement("chart-canvas")
    Object.assign(canvas, {
        data,
        xScale,
        xAccessor,
        displayXAccessor,
        seriesName: "DEMO",
        margin,
        xExtents: opening(data, xAccessor, bars),
        ...canvasProps,
    })
    canvas.style.height = `${height}px`

    const pane = document.createElement("chart-pane")
    pane.yExtents = yExtents

    pane.append(
        ...series.map(tag => document.createElement(tag)),
        Object.assign(document.createElement("chart-y-axis"), { ticks, fontSize, tickFormat }),
        Object.assign(document.createElement("chart-x-axis"), { fontSize }),
    )

    canvas.append(pane)
    host.append(canvas)

    return { canvas, pane, data, xAccessor }
}
