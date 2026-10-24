// Lets Node's native TS runner resolve the app's "@/..." alias and
// extensionless imports, the way Vite does.
import { existsSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const srcDir = fileURLToPath(new URL('../../src/', import.meta.url))

function withExtension(path: string): string | null {
  for (const candidate of [path, `${path}.ts`, `${path}.tsx`, `${path}/index.ts`]) {
    if (existsSync(candidate) && !candidate.endsWith('/')) return candidate
  }
  return null
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const resolved = withExtension(srcDir + specifier.slice(2))
      if (resolved) return nextResolve(pathToFileURL(resolved).href, context)
    }
    if (specifier.startsWith('.') && context.parentURL?.startsWith('file:') && !/\.\w+$/.test(specifier)) {
      const resolved = withExtension(fileURLToPath(new URL(specifier, context.parentURL)))
      if (resolved) return nextResolve(pathToFileURL(resolved).href, context)
    }
    return nextResolve(specifier, context)
  },
})
