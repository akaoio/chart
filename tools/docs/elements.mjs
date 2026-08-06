/**
 * Sinh `docs/reference/elements.md` từ chính mã nguồn.
 *
 *   npm run docs:reference
 *
 * Tài liệu tham chiếu viết tay thì hỏng trong im lặng: đổi một mặc định, quên sửa bảng,
 * và người đọc tin vào một con số không còn đúng. Nên bảng này **đọc ra từ mã** — tên thẻ
 * lấy ở lời gọi `define()`, danh sách property và giá trị mặc định lấy bằng cách nạp
 * chính module ấy rồi đọc object defaults nó xuất khẩu.
 *
 * `npm test` kiểm lại rằng file đã commit khớp với thứ sinh ra bây giờ, nên nó không thể
 * cũ đi mà không ai biết.
 */

import { readdir, readFile } from "node:fs/promises"
import { join, relative } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const root = fileURLToPath(new URL("../../", import.meta.url))
const source = join(root, "src")

/** Mọi file .js dưới src/, theo thứ tự tất định. */
const walk = async directory => {
    const entries = await readdir(directory, { withFileTypes: true })
    const files = []

    for (const entry of [...entries].sort((a, b) => a.name.localeCompare(b.name))) {
        const path = join(directory, entry.name)
        if (entry.isDirectory()) files.push(...(await walk(path)))
        else if (entry.name.endsWith(".js")) files.push(path)
    }

    return files
}

/** Giá trị mặc định, viết ngắn lại cho vừa một ô bảng. */
const show = value => {
    if (typeof value === "function") return "ƒ"
    if (value === undefined) return "—"
    if (value === null) return "`null`"
    if (Array.isArray(value)) return value.length === 0 ? "`[]`" : `\`${JSON.stringify(value)}\``

    if (value instanceof Date) return `\`${value.toISOString()}\``

    if (typeof value === "object") {
        const text = JSON.stringify(value, (key, each) => (typeof each === "function" ? "ƒ" : each))
        return text.length > 72 ? "`{…}`" : `\`${text}\``
    }

    return `\`${JSON.stringify(value)}\``
}

/** Câu đầu của khối chú thích ngay trên một khai báo. */
const summaryAbove = (text, index) => {
    const before = text.slice(0, index)
    const start = before.lastIndexOf("/**")
    if (start === -1) return ""

    const end = before.indexOf("*/", start)
    // Chỉ nhận khối chú thích DÍNH liền khai báo — giữa chúng cùng lắm là `export`.
    if (end === -1 || !/^\*\/\s*(export\s+)?$/.test(before.slice(end, index))) return ""

    const body = before
        .slice(start + 3, end)
        .split("\n")
        .map(line => line.replace(/^\s*\* ?/, "").trim())
        .join(" ")
        .trim()

    const sentence = body.split(/(?<=\.)\s/)[0]
    return sentence.replace(/\s+/g, " ").trim()
}

const collect = async () => {
    const entries = []

    for (const file of await walk(source)) {
        const text = await readFile(file, "utf8")

        for (const match of text.matchAll(/^define\("([\w-]+)",\s*(\w+)\)/gm)) {
            const [, tag, className] = match

            // Lớp này lấy mặc định ở đâu: `static defaults = x` hoặc `defineProperties(this, x)`
            const classAt = text.search(new RegExp(`class ${className}\\b`))
            const body = classAt === -1 ? "" : text.slice(classAt)
            const drawAt = text.search(/^export const (draw|render)\w+ = /m)

            const named =
                body.match(/static defaults = (\w+)/)?.[1] ??
                body.match(/defineProperties\(this,\s*(\w+)/)?.[1] ??
                text.match(/^export const (\w*[Dd]efaults) = \{/m)?.[1]

            const module = await import(pathToFileURL(file).href)

            const defaults = named ? module[named] : undefined
            const extra = body.match(/static properties = \[([\s\S]*?)\]/)?.[1]
            const extraNames = extra
                ? [...extra.matchAll(/"([\w]+)"/g)].map(each => each[1])
                : []

            entries.push({
                tag,
                className,
                // Xuôi dấu gạch, vì GROUPS so tiền tố bằng "src/…": trên Windows
                // `relative()` trả về gạch ngược, mọi phần tử rơi hết vào nhóm
                // "Other" — nhóm không được in — và file sinh ra chỉ còn cái đầu đề.
                file: relative(root, file).replaceAll("\\", "/"),
                // Nhiều chú thích mở đầu bằng "Tên: `<thẻ>`" — cái tên thẻ đã có ở
                // tiêu đề ngay trên, không cần nhắc lại.
                // Nhiều series không có chú thích ngay trên lớp — lớp chỉ là cái vỏ, còn
                // phần mô tả nằm trên hàm vẽ. Lấy ở đó khi không có ở đây.
                summary: (classAt === -1 ? "" : summaryAbove(text, classAt) || summaryAbove(text, drawAt))
                    .replace(new RegExp(`:\\s*\`<${tag}>\``), ""),
                properties: [
                    ...new Map([
                        ...extraNames.map(name => [name, "—"]),
                        ...Object.entries(defaults ?? {}).map(([name, value]) => [name, show(value)]),
                    ]),
                ].sort(([a], [b]) => a.localeCompare(b)),
            })
        }
    }

    return entries.sort((a, b) => a.tag.localeCompare(b.tag))
}

const GROUPS = [
    ["src/core/", "The chart itself"],
    ["src/axes/", "Axes"],
    ["src/series/", "Series"],
    ["src/coordinates/", "Coordinates"],
    ["src/tooltip/", "Tooltips"],
    ["src/annotations/", "Annotations"],
    ["src/interactive/", "Interactive"],
]

const groupOf = file => GROUPS.find(([prefix]) => file.startsWith(prefix))?.[1] ?? "Other"

const render = entries => {
    const lines = [
        "# Element reference",
        "",
        "**Generated from the source — do not edit.** `npm run docs:reference` rebuilds it, and",
        "`npm test` fails if the committed file no longer matches the code.",
        "",
        `Every custom element the library defines: **${entries.length}** of them.`,
        "",
        "Properties are set in JavaScript, not as HTML attributes — most of them are functions,",
        "scales or objects, which an attribute cannot carry:",
        "",
        "```js",
        'const series = document.createElement("chart-line-series")',
        "series.yAccessor = datum => datum.close",
        "```",
        "",
        "A dash in the default column means the property has no default: nothing is set until you",
        "set it. `ƒ` means the default is a function — see the file for what it does.",
        "",
    ]

    for (const [, title] of GROUPS) {
        const inGroup = entries.filter(entry => groupOf(entry.file) === title)
        if (inGroup.length === 0) continue

        lines.push(`## ${title}`, "")

        for (const entry of inGroup) {
            lines.push(`### \`<${entry.tag}>\``, "")
            if (entry.summary) lines.push(entry.summary, "")
            lines.push(`\`${entry.className}\` — [\`${entry.file}\`](../../${entry.file})`, "")

            if (entry.properties.length === 0) {
                lines.push("No configurable properties.", "")
                continue
            }

            lines.push("| property | default |", "|---|---|")
            for (const [name, value] of entry.properties) lines.push(`| \`${name}\` | ${value} |`)
            lines.push("")
        }
    }

    return lines.join("\n") + "\n"
}

export const reference = async () => render(await collect())

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    const { writeFile } = await import("node:fs/promises")
    const target = join(root, "docs/reference/elements.md")
    await writeFile(target, await reference())
    console.log(`docs/reference/elements.md ghi xong`)
}
