/**
 * Soi tài liệu: mọi cái tên nó nhắc tới phải có thật trong mã.
 *
 * Tài liệu sai còn tệ hơn không có tài liệu — người đọc chép về rồi mới biết. Mà cái sai
 * dễ xảy ra nhất không phải là câu chữ, là **cái tên**: một thẻ được đổi tên, một hàm
 * thôi được xuất khẩu, một phương thức đổi chữ ký, còn trang hướng dẫn thì vẫn nói như cũ.
 *
 * Nên chỗ này rút mọi tên `<chart-…>`, mọi `hàm()` và mọi `canvas.phươngThức()` ra khỏi
 * `docs/guide` cùng `README.md`, rồi đối chiếu với thứ mã thật sự có. Chạy trong `npm test`.
 *
 * Nó không đọc `docs/parity` (chỗ ấy nói về **bản gốc**, tên khác là đúng) và không đọc
 * `docs/reference` (sinh từ mã, đã có bài kiểm riêng).
 */

import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const root = fileURLToPath(new URL("../../", import.meta.url))

const walk = async directory => {
    const out = []
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name)
        if (entry.isDirectory()) out.push(...(await walk(path)))
        else out.push(path)
    }
    return out
}

/** Tên sự kiện thư viện phát ra — chúng trông giống tên thẻ nhưng không phải. */
const eventNames = async () => {
    const names = new Set()
    for (const file of (await walk(join(root, "src"))).filter(f => f.endsWith(".js"))) {
        const text = await readFile(file, "utf8")
        for (const match of text.matchAll(/(?:CustomEvent|Event)\(\s*["'`]([\w-]+)["'`]/g)) names.add(match[1])
        for (const match of text.matchAll(/^const REQUEST = "([\w-]+)"/gm)) names.add(match[1])
    }
    return names
}

export const checkDocs = async () => {
    const problems = []

    const tags = new Set()
    for (const file of (await walk(join(root, "src"))).filter(f => f.endsWith(".js"))) {
        const text = await readFile(file, "utf8")
        for (const match of text.matchAll(/^define\("([\w-]+)"/gm)) tags.add(match[1])
    }

    const api = await import(pathToFileURL(join(root, "src/index.js")).href)
    const exported = new Set(Object.keys(api))
    const events = await eventNames()

    // Phương thức trên phần tử chart — tài liệu gọi chúng là `getState()` chứ không phải export
    const methods = new Set([
        ...Object.getOwnPropertyNames(api.ChartCanvas.prototype),
        ...Object.getOwnPropertyNames(api.GenericComponent.prototype),
    ])

    const files = (await walk(join(root, "docs/guide"))).filter(f => f.endsWith(".md"))
    files.push(join(root, "docs/README.md"), join(root, "README.md"))

    for (const file of files) {
        const where = file.replace(root, "")
        const text = await readFile(file, "utf8")

        for (const match of text.matchAll(/`<?(chart-[\w-]+)>?`/g)) {
            const name = match[1]
            if (!tags.has(name) && !events.has(name)) problems.push(`${where}: <${name}> không có thật`)
        }

        for (const match of text.matchAll(/`([a-z][A-Za-z0-9]{2,})\(\)`/g)) {
            const name = match[1]
            if (!exported.has(name) && !methods.has(name)) problems.push(`${where}: ${name}() không có thật`)
        }
    }

    return problems
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    const problems = await checkDocs()

    if (problems.length === 0) {
        console.log("✓ mọi tên trong tài liệu đều có thật trong mã")
    } else {
        console.error("✗ tài liệu nhắc tới thứ không có:")
        for (const problem of problems) console.error("    " + problem)
        process.exit(1)
    }
}
