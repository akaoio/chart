/**
 * Không getter hay setter nào của một class được để `defineProperties` che mất.
 *
 * `defineProperties(this, defaults)` cài accessor lên **chính instance**, cho mỗi khoá của
 * `defaults`. Thuộc tính trên instance che thuộc tính trên prototype — nên một class viết
 * `get x()` để trả về một phép tính, mà `x` cũng là một khoá trong defaults, sẽ thấy getter
 * ấy chưa từng được gọi. Không lỗi, không dấu vết.
 *
 * Đã xảy ra thật: `MouseLocationIndicator.get disablePan()` trả về `enabled && disablePan`,
 * tức "chỉ chặn pan trong lúc đang vẽ". Bị che nên phần tử ấy chặn pan **mọi lúc** — cứ có
 * một công cụ vẽ trên biểu đồ là không kéo được khung nhìn nữa, bằng chuột lẫn bằng ngón tay.
 * Mất một buổi mới tìm ra, và chỉ tìm ra vì một bài kiểm khác đổ.
 *
 * `defineProperties` giờ nhường getter cho prototype nếu prototype có. Bài này canh phần còn
 * lại của cùng cái bẫy:
 *
 * - **setter** thì `defineProperties` vẫn giữ, nên một setter trên prototype trùng tên với
 *   khoá defaults sẽ bị che. Hôm nay không có chỗ nào như thế; bài này để nó không lặng lẽ
 *   xuất hiện.
 * - getter trùng tên thì được liệt kê ra, và cái nào **không** phải phép chuyển tiếp thẳng
 *   `return this.#props.x` thì phải nằm trong danh sách đã biết dưới đây. Đọc mã mà thấy một
 *   getter tính toán trùng tên khoá defaults thì phải dừng lại nghĩ, chứ không phải cho qua.
 *
 * Chạy trong `npm test`.
 */

import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const root = fileURLToPath(new URL("../", import.meta.url))

/**
 * Getter tính toán trùng tên khoá defaults mà đã được xem xét và cố ý giữ.
 *
 * `defineProperties` nhường getter cho prototype, nên những chỗ này hoạt động đúng như đã
 * viết. Danh sách để người sau biết chúng đã được cân nhắc — thêm một cái mới thì phải thêm
 * vào đây, và lúc thêm là lúc nghĩ.
 */
const KNOWN = new Set(["MouseLocationIndicator.disablePan"])

const walk = async directory => {
    const out = []
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name)
        if (entry.isDirectory()) out.push(...(await walk(path)))
        else if (path.endsWith(".js")) out.push(path)
    }
    return out
}

/** Khoá cấp một của một object literal khai bằng `const NAME = { … }`. */
const keysOf = (text, name) => {
    const block = text.match(new RegExp(`(?:export )?const ${name}\\s*=\\s*\\{([\\s\\S]*?)\\n\\}`))
    if (block === null) return []

    const keys = []
    let depth = 0

    for (const line of block[1].split("\n")) {
        const key = depth === 0 && line.trim().match(/^([A-Za-z_$][\w$]*)\s*:/)
        if (key) keys.push(key[1])
        depth += (line.match(/[{[]/g) ?? []).length - (line.match(/[}\]]/g) ?? []).length
    }

    return keys
}

export const checkAccessors = async () => {
    const problems = []

    for (const file of await walk(join(root, "src"))) {
        const text = await readFile(file, "utf8")
        const where = file.replace(root, "")

        const uses = [...text.matchAll(/defineProperties\(this,\s*([A-Za-z_$][\w$]*)(?:,\s*(\[[^\]]*\]))?/g)]
        if (uses.length === 0) continue

        const keys = new Set()
        for (const [, name, extra] of uses) {
            for (const key of keysOf(text, name)) keys.add(key)
            if (extra !== undefined) for (const quoted of extra.matchAll(/"([^"]+)"/g)) keys.add(quoted[1])
        }

        const className = text.match(/export class (\w+)/)?.[1] ?? where

        for (const [, name] of text.matchAll(/^\s*set\s+([A-Za-z_$][\w$]*)\s*\(/gm)) {
            if (!keys.has(name)) continue
            problems.push(
                `${where}: set ${name}() bị defineProperties che — nó cài setter riêng cho mọi khoá defaults`,
            )
        }

        for (const [, name, body] of text.matchAll(/^\s*get\s+([A-Za-z_$][\w$]*)\s*\(\s*\)\s*\{([\s\S]*?)^\s*\}/gm)) {
            if (!keys.has(name)) continue
            if (new RegExp(`^\\s*return this\\.#props\\.${name}\\s*$`).test(body)) continue
            if (KNOWN.has(`${className}.${name}`)) continue

            problems.push(
                `${where}: get ${name}() tính toán chứ không chuyển tiếp, và ${name} là khoá defaults — ` +
                    `nó chỉ chạy vì defineProperties nhường getter cho prototype. Thêm "${className}.${name}" ` +
                    `vào KNOWN trong tools/check-accessors.mjs nếu đúng ý.`,
            )
        }
    }

    return problems
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    const problems = await checkAccessors()

    if (problems.length === 0) {
        console.log("✓ không accessor nào bị defineProperties che")
    } else {
        console.error("✗ accessor bị che:")
        for (const problem of problems) console.error("    " + problem)
        process.exit(1)
    }
}
