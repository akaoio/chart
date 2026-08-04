/**
 * Bậc 2, câu hỏi số 1: con tìm cha bằng cách nào, thay cho React.createContext?
 *
 * Kế hoạch nêu ba phương án. File này dựng cả ba trong trình duyệt thật rồi cho chúng
 * chạy qua 8 kiểu gắn vào DOM mà một trang thật sẽ tạo ra — chứ không chọn bằng suy luận.
 *
 *   node tools/prototype/composition.mjs
 *
 * Không phải test, không chạy trong npm test. Đây là bằng chứng cho một quyết định đã
 * lấy; giữ lại để sau này ai hỏi "sao lại làm thế" thì chạy lại được.
 */

import { chromium } from "playwright"

const page = `
<!doctype html><meta charset="utf-8"><body><script type="module">
const log = []

// ─── Phương án 1: sự kiện nổi bọt ngược lên (giao thức context kiểu Lit) ───────────
// Con phát một sự kiện composed+bubbles lúc kết nối; cha gần nhất bắt được thì gắn
// chính nó vào detail rồi chặn lại. Cha lên muộn thì phát ngược một sự kiện thông báo.
class BubbleParent extends HTMLElement {
    connectedCallback() {
        this.addEventListener("chart-connect", event => {
            event.stopPropagation()
            event.detail.parent = this
        })
        // cha lên sau con: gọi lại những đứa đã hỏi hụt
        this.dispatchEvent(new CustomEvent("chart-parent-available", { bubbles: false }))
        for (const child of this.querySelectorAll("*")) {
            if (child.retryFind) child.retryFind()
        }
    }
}
class BubbleChild extends HTMLElement {
    connectedCallback() { this.found = this.find() }
    retryFind() { if (!this.found) this.found = this.find() }
    find() {
        const detail = {}
        this.dispatchEvent(new CustomEvent("chart-connect", { detail, bubbles: true, composed: true }))
        return detail.parent ?? null
    }
}

// ─── Phương án 2: cha gán property xuống khi slotchange ────────────────────────────
class SlotParent extends HTMLElement {
    connectedCallback() {
        this.attachShadow({ mode: "open" }).innerHTML = "<slot></slot>"
        this.shadowRoot.querySelector("slot").addEventListener("slotchange", event => {
            for (const node of event.target.assignedElements()) node.parent = this
        })
    }
}
class SlotChild extends HTMLElement {
    connectedCallback() { queueMicrotask(() => { this.found = this.parent ?? null }) }
}

// ─── Phương án 3: registry toàn cục theo id ────────────────────────────────────────
const registry = new Map()
class RegistryParent extends HTMLElement {
    connectedCallback() { registry.set(this.getAttribute("chart-id"), this) }
    disconnectedCallback() { registry.delete(this.getAttribute("chart-id")) }
}
class RegistryChild extends HTMLElement {
    connectedCallback() { this.found = registry.get(this.getAttribute("chart-id")) ?? null }
}

const APPROACHES = {
    bubble: { parent: BubbleParent, child: BubbleChild, tags: ["bubble-parent", "bubble-child"] },
    slot: { parent: SlotParent, child: SlotChild, tags: ["slot-parent", "slot-child"] },
    registry: { parent: RegistryParent, child: RegistryChild, tags: ["registry-parent", "registry-child"] },
}

for (const { parent, child, tags } of Object.values(APPROACHES)) {
    customElements.define(tags[0], parent)
    customElements.define(tags[1], child)
}

const settle = () => new Promise(resolve => setTimeout(resolve, 0))

// Tám kiểu gắn vào DOM. Mỗi kiểu dựng cùng một quan hệ cha-con, chỉ khác đường đi.
const SCENARIOS = {
    "cắm thẳng": async ([P, C]) => {
        const host = document.createElement("div")
        host.innerHTML = \`<\${P}><\${C}></\${C}></\${P}>\`
        document.body.append(host)
        return host.querySelector(C)
    },
    "lồng sâu 3 tầng": async ([P, C]) => {
        const host = document.createElement("div")
        host.innerHTML = \`<\${P}><div><section><\${C}></\${C}></section></div></\${P}>\`
        document.body.append(host)
        return host.querySelector(C)
    },
    "dựng rời rồi cắm": async ([P, C]) => {
        const parent = document.createElement(P)
        const child = document.createElement(C)
        parent.append(child)
        document.body.append(parent)
        return child
    },
    "thêm con vào cha đã gắn": async ([P, C]) => {
        const parent = document.createElement(P)
        document.body.append(parent)
        await settle()
        const child = document.createElement(C)
        parent.append(child)
        return child
    },
    "chuyển con sang cha khác": async ([P, C]) => {
        const first = document.createElement(P)
        const second = document.createElement(P)
        document.body.append(first, second)
        const child = document.createElement(C)
        first.append(child)
        await settle()
        second.append(child)
        return child
    },
    "con nằm trong shadow DOM của phần tử khác": async ([P, C]) => {
        const parent = document.createElement(P)
        const holder = document.createElement("div")
        holder.attachShadow({ mode: "open" }).innerHTML = \`<\${C}></\${C}>\`
        parent.append(holder)
        document.body.append(parent)
        return holder.shadowRoot.querySelector(C)
    },
    "hai chart, có ghi id": async ([P, C]) => {
        const host = document.createElement("div")
        host.innerHTML =
            \`<\${P} chart-id="A"><\${C} chart-id="A"></\${C}></\${P}>\` +
            \`<\${P} chart-id="B"><\${C} chart-id="B" id="probe"></\${C}></\${P}>\`
        document.body.append(host)
        return host.querySelector("#probe")
    },
    "hai chart, KHÔNG ghi id": async ([P, C]) => {
        const host = document.createElement("div")
        // Dò ở chart THỨ NHẤT: registry ghi đè theo key nên nếu dò ở chart cuối thì
        // nó sẽ đúng một cách tình cờ, che mất đúng lỗi cần thấy.
        host.innerHTML = \`<\${P}><\${C} id="probe2"></\${C}></\${P}><\${P}><\${C}></\${C}></\${P}>\`
        document.body.append(host)
        return host.querySelector("#probe2")
    },
    "thêm con vào chart thứ nhất trong hai": async ([P, C]) => {
        // Hai chart đã đứng sẵn trên trang, rồi mới thêm một series vào chart TRÊN.
        // Đây là chỗ registry lộ ra: nó nhớ theo key chứ không theo vị trí trong cây.
        const first = document.createElement(P)
        const second = document.createElement(P)
        document.body.append(first, second)
        await settle()
        const child = document.createElement(C)
        first.append(child)
        return child
    },
    "định nghĩa nạp muộn hơn HTML": async ([P, C]) => {
        // mô phỏng phần tử chưa upgrade: chèn HTML với tên chưa định nghĩa rồi mới định nghĩa
        const lateP = P + "-late"
        const lateC = C + "-late"
        const host = document.createElement("div")
        host.innerHTML = \`<\${lateP} chart-id="L"><\${lateC} chart-id="L"></\${lateC}></\${lateP}>\`
        document.body.append(host)
        await settle()
        const source = Object.values(APPROACHES).find(a => a.tags[0] === P)
        customElements.define(lateP, class extends source.parent {})
        customElements.define(lateC, class extends source.child {})
        await settle()
        return host.querySelector(lateC)
    },
}

/**
 * Cha ĐÚNG là tổ tiên gần nhất thuộc kiểu cha, tính trên cây đã ghép (đi qua cả shadow
 * host). Đây mới là tiêu chí thật — so id chỉ nói lên rằng người viết đã ghi id đúng.
 */
const expectedParent = (child, parentTag) => {
    let node = child.parentNode ?? child.getRootNode()?.host
    while (node) {
        if (node.localName === parentTag || node.localName === parentTag + "-late") return node
        node = node.parentNode ?? node.host
    }
    return null
}

const results = {}
for (const [approach, { tags }] of Object.entries(APPROACHES)) {
    results[approach] = {}
    for (const [scenario, build] of Object.entries(SCENARIOS)) {
        try {
            const child = await build(tags)
            await settle()
            const found = child?.found ?? null
            const expected = expectedParent(child, tags[0])
            results[approach][scenario] =
                found === expected ? "ok" : found === null ? "không thấy" : "SAI CHA"
        } catch (error) {
            results[approach][scenario] = "nổ: " + error.message.slice(0, 40)
        }
    }
}

window.__results = results
</script>`

const browser = await chromium.launch()
const tab = await browser.newPage()
const errors = []
tab.on("pageerror", error => errors.push(error.message))
await tab.setContent(page)
await tab.waitForFunction(() => window.__results !== undefined, null, { timeout: 10000 })
const results = await tab.evaluate(() => window.__results)
await browser.close()

if (errors.length) console.error("lỗi trang:", errors)

const scenarios = Object.keys(results.bubble)
const approaches = Object.keys(results)
const width = Math.max(...scenarios.map(s => s.length))

console.log("\n" + " ".repeat(width) + "  " + approaches.map(a => a.padEnd(12)).join(""))
for (const scenario of scenarios) {
    const cells = approaches.map(a => results[a][scenario].padEnd(12)).join("")
    console.log(scenario.padEnd(width) + "  " + cells)
}

const score = a => scenarios.filter(s => results[a][s] === "ok").length
console.log("\n" + " ".repeat(width) + "  " + approaches.map(a => `${score(a)}/${scenarios.length}`.padEnd(12)).join(""))
