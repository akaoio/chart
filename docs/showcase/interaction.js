import { discontinuousTimeScaleProviderBuilder } from "@akaoio/chart"
import { daily } from "./data.js"
import { chartHost, demo, page } from "./showcase.js"

page({
    title: "Interaction",
    intro:
        "Panning, zooming and everything that changes what is on screen. The chart is driven " +
        "from the outside: given the same state it draws the same picture, and that state can " +
        "be read out and put back.",
})

const price = datum => [datum.high, datum.low]

const chart = (host, rows, options) =>
    chartHost(host, rows, { series: ["chart-candlestick-series"], ...options })

demo({
    title: "Pan, zoom, and the axes",
    about:
        "Drag the chart to pan and use the wheel to zoom. Drag the price axis or the time " +
        "axis to stretch that scale on its own — both ends move apart while the middle stays " +
        "put. The buttons do the same thing in fixed steps.",
    build: (stage, api) => {
        const { canvas } = chart(stage, daily(260))

        const zoom = document.createElement("chart-zoom-buttons")
        canvas.querySelector("chart-pane").append(zoom)

        const show = () => {
            // The chart works out its state after it is in the document, so there is
            // nothing to read on the line right after `append`.
            const state = canvas.getState()
            if (state === null) return

            const [from, to] = state.xScale.domain()
            api.say(`x domain: ${from.toFixed(1)} … ${to.toFixed(1)}   (${Math.round(to - from)} bars on screen)`)
        }

        canvas.addEventListener("mousemove", show)
        canvas.addEventListener("wheel", () => setTimeout(show, 50))
        requestAnimationFrame(show)
    },
})

demo({
    title: "Turning it off",
    about:
        "`disablePan`, `disableZoom` and `disableInteraction` are properties on the canvas. " +
        "The last one takes the mouse layer away entirely — nothing hovers, nothing tracks.",
    build: (stage, api) => {
        const { canvas, pane } = chart(stage, daily(160), { height: 300 })
        pane.append(document.createElement("chart-cross-hair-cursor"))

        const flags = ["disablePan", "disableZoom", "disableInteraction"]

        for (const flag of flags) {
            const button = api.button(flag, node => {
                canvas[flag] = !canvas[flag]
                node.setAttribute("aria-pressed", String(canvas[flag]))
                api.say(flags.map(each => `${each}: ${Boolean(canvas[each])}`).join("   "))
            })
            button.setAttribute("aria-pressed", "false")
        }

        api.say(flags.map(each => `${each}: false`).join("   "))
    },
})

demo({
    title: "The chart is a function of its state",
    about:
        "`getState()` hands back everything that decides what is drawn; `setState()` puts it " +
        "back. Pan somewhere, save, pan away, restore — the picture returns exactly. This is " +
        "what makes a chart scrubbable in step with something else, which is why it exists.",
    build: (stage, api) => {
        const { canvas } = chart(stage, daily(260), { height: 300 })

        let saved = null

        api.button("Save", () => {
            saved = canvas.getState()
            const [from, to] = saved.xScale.domain()
            api.say(`saved: ${from.toFixed(1)} … ${to.toFixed(1)}`)
        })

        api.button("Restore", () => {
            if (saved === null) return api.say("nothing saved yet")
            canvas.setState(saved)
            const [from, to] = canvas.getState().xScale.domain()
            api.say(`restored: ${from.toFixed(1)} … ${to.toFixed(1)}`)
        })

        api.say("pan the chart, save, pan away, restore")
    },
})

demo({
    title: "Data that keeps arriving",
    about:
        "Assigning `data` again is all there is to it. If the last bar was on screen the chart " +
        "slides to keep it there; if you had scrolled back it leaves you where you were.",
    build: (stage, api) => {
        const history = daily(400)
        let shown = 200

        const provider = discontinuousTimeScaleProviderBuilder().inputDateAccessor(datum => datum.date)

        const { canvas } = chart(stage, history.slice(0, shown), { height: 300 })

        let timer = null

        const tick = () => {
            if (shown >= history.length) return stop()

            shown += 1
            const { data, xScale, xAccessor, displayXAccessor } = provider(history.slice(0, shown))
            Object.assign(canvas, { data, xScale, xAccessor, displayXAccessor })

            api.say(`${shown} bars`)
        }

        const stop = () => {
            clearInterval(timer)
            timer = null
            api.say(`stopped at ${shown} bars`)
        }

        api.button("Start", node => {
            if (timer !== null) return stop()
            timer = setInterval(tick, 400)
            api.say("running — scroll back to see it leave you alone")
        })

        api.say(`${shown} bars`)
    },
})

demo({
    title: "Knowing what was clicked",
    about:
        "`chart-click-callback` draws nothing. It forwards pointer events with the chart's own " +
        "view of the world attached, so you learn which bar was clicked rather than which pixel.",
    build: (stage, api) => {
        const { pane } = chart(stage, daily(160), { height: 300 })

        pane.append(document.createElement("chart-cross-hair-cursor"))

        const listener = document.createElement("chart-click-callback")
        listener.onClick = (event, moreProps) => {
            const { currentItem, mouseXY } = moreProps
            if (!currentItem?.date) return

            api.say(
                `${currentItem.date.toISOString().slice(0, 10)}   ` +
                    `O ${currentItem.open}  H ${currentItem.high}  L ${currentItem.low}  C ${currentItem.close}   ` +
                    `at pixel ${mouseXY.map(Math.round).join(", ")}`,
            )
        }

        pane.append(listener)
        api.say("click a bar")
    },
})
