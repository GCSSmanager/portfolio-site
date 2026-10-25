import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

const KEEP_TOP_LEVEL = new Set(['crm'])

/** Rebuild SPA into `_site` without deleting `_site/crm/demo/*`. */
export function preserveCrmDemos(outDir: string): Plugin {
  return {
    name: 'gcss-preserve-crm-demos',
    apply: 'build',
    buildStart() {
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true })
        return
      }
      for (const entry of fs.readdirSync(outDir)) {
        if (KEEP_TOP_LEVEL.has(entry)) continue
        fs.rmSync(path.join(outDir, entry), { recursive: true, force: true })
      }
    },
  }
}
