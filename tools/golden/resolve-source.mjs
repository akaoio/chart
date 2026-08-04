/**
 * Cho phép `import` thẳng mã nguồn TypeScript của bản gốc, không cần build.
 *
 * Node 24 tự bóc kiểu khỏi `.ts`, nhưng vẫn theo đúng luật ESM: import phải ghi rõ
 * đuôi file. Mã nguồn bản gốc viết theo luật bundler (`from "./levels"`,
 * `from "@react-financial-charts/core"`), nên chỉ thiếu đúng tầng phân giải này.
 *
 * Nạp bằng: node --import ./tools/golden/resolve-source.mjs
 * Cần biến môi trường CHART_SOURCE trỏ tới thư mục repo gốc.
 *
 * Chỉ dùng khi sinh golden data. Bản port không đụng tới file này.
 */

import { createRequire, registerHooks } from "node:module"
import { existsSync, readFileSync } from "node:fs"
import { fileURLToPath, pathToFileURL } from "node:url"
import { dirname, resolve as join } from "node:path"

const source = process.env.CHART_SOURCE
if (!source) throw new Error("Thiếu CHART_SOURCE — đường dẫn tới repo react-financial-charts")

const packages = join(source, "packages")
if (!existsSync(packages)) throw new Error(`Không thấy ${packages}`)

const EXTENSIONS = [".ts", ".tsx", "/index.ts", "/index.tsx"]

const firstExisting = base => {
    for (const extension of EXTENSIONS) {
        const candidate = base + extension
        if (existsSync(candidate)) return pathToFileURL(candidate).href
    }
}

// Cách bóc kiểu sẵn có của Node không đủ, vì hai lẽ: nó không hiểu JSX (mà barrel của
// `core` kéo theo ChartCanvas.tsx), và nó chỉ xoá được thứ có cú pháp đánh dấu là kiểu —
// `import { ScaleTime } from "d3-scale"` trông y hệt import giá trị nên vẫn còn lại lúc
// chạy, rồi nổ vì d3-scale không export tên đó.
//
// Dùng luôn bản TypeScript trong node_modules của repo gốc: nó biết tên nào là kiểu để
// lược đi, và là đúng phiên bản bản gốc dùng nên không lệch hành vi.
const typescript = createRequire(join(source, "package.json"))("typescript")

const transpile = (code, fileName) =>
    typescript.transpileModule(code, {
        fileName,
        compilerOptions: {
            target: typescript.ScriptTarget.ESNext,
            module: typescript.ModuleKind.ESNext,
            jsx: typescript.JsxEmit.React,
            verbatimModuleSyntax: false,
        },
    }).outputText

registerHooks({
    load(url, context, next) {
        if (url.endsWith(".ts") || url.endsWith(".tsx")) {
            const path = fileURLToPath(url)
            return {
                format: "module",
                source: transpile(readFileSync(path, "utf8"), path),
                shortCircuit: true,
            }
        }
        return next(url, context)
    },

    resolve(specifier, context, next) {
        const workspace = specifier.match(/^@react-financial-charts\/([\w-]+)$/)
        if (workspace) {
            const found = firstExisting(join(packages, workspace[1], "src"))
            if (found) return { url: found, shortCircuit: true }
        }

        if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
            const found = firstExisting(join(dirname(fileURLToPath(context.parentURL)), specifier))
            if (found) return { url: found, shortCircuit: true }
        }

        return next(specifier, context)
    },
})
