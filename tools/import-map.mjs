/**
 * Thư viện cần trình duyệt phân giải hộ những cái tên trần nào.
 *
 * Câu hỏi ấy có đúng một câu trả lời, mà trước đây nó nằm ở ba chỗ: bộ kiểm trình duyệt
 * đoán bằng "gói nào tên bắt đầu bằng d3-", script gom trang tĩnh đoán y hệt, và sáu
 * trang trưng bày thì chép tay. Ba chỗ đoán cùng một thứ là ba chỗ có thể lệch nhau.
 *
 * Ở đây nó được **tính**: đi từ `src/`, nhặt mọi import tên trần, rồi theo chân từng gói
 * để nhặt tiếp những gì gói ấy cần. Kết quả là đúng cái tập hợp trình duyệt sẽ hỏi tới —
 * không thừa một gói, và không thể thiếu.
 */

import { readdir, readFile } from "node:fs/promises"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("../", import.meta.url))

const BARE = /^\s*(?:import|export)[\s\S]*?from\s+["']([^"'.][^"']*)["']/gm

const bareImportsIn = text => [...text.matchAll(BARE)].map(match => match[1])

const relativeImportsIn = text =>
    [...text.matchAll(/^\s*(?:import|export)[\s\S]*?from\s+["'](\.[^"']*)["']/gm)].map(match => match[1])

const walk = async directory => {
    const out = []
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name)
        if (entry.isDirectory()) out.push(...(await walk(path)))
        else if (path.endsWith(".js")) out.push(path)
    }
    return out
}

/** Đường vào của một gói, đúng thứ trình duyệt sẽ nạp. */
export const entryOf = async name => {
    const manifest = JSON.parse(await readFile(join(root, "node_modules", name, "package.json"), "utf8"))
    const entry = manifest.module ?? manifest.exports?.["."]?.default ?? manifest.main
    return join("node_modules", name, entry.replace(/^\.\//, ""))
}

/** Theo chân các import tương đối trong một gói, nhặt mọi tên trần gặp trên đường. */
const bareImportsOfPackage = async name => {
    const entry = join(root, await entryOf(name))
    const seen = new Set()
    const found = new Set()
    const queue = [entry]

    while (queue.length > 0) {
        const file = queue.pop()
        if (seen.has(file)) continue
        seen.add(file)

        let text
        try {
            text = await readFile(file, "utf8")
        } catch {
            continue
        }

        for (const specifier of bareImportsIn(text)) found.add(specifier)
        for (const specifier of relativeImportsIn(text)) {
            queue.push(join(dirname(file), specifier.endsWith(".js") ? specifier : `${specifier}.js`))
        }
    }

    return found
}

/** Mọi tên trần cần phân giải, kể cả những cái do gói khác kéo theo. */
export const bareSpecifiers = async () => {
    const found = new Set()

    for (const file of await walk(join(root, "src"))) {
        for (const specifier of bareImportsIn(await readFile(file, "utf8"))) found.add(specifier)
    }

    const queue = [...found]
    while (queue.length > 0) {
        for (const specifier of await bareImportsOfPackage(queue.pop())) {
            if (!found.has(specifier)) {
                found.add(specifier)
                queue.push(specifier)
            }
        }
    }

    return [...found].sort()
}

/**
 * Import map đã dựng sẵn. `prefix` là chỗ `node_modules` nằm so với trang — `/` khi phục
 * vụ từ gốc kho mã, `../../` khi trang nằm trong `docs/showcase/`.
 */
export const importMap = async (prefix, { self } = {}) => {
    const imports = {}

    for (const name of await bareSpecifiers()) imports[name] = prefix + (await entryOf(name)).replaceAll("\\", "/")
    if (self !== undefined) imports["@akaoio/chart"] = self

    return imports
}

export { root as repositoryRoot, relative }
