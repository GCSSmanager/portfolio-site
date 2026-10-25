import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const flowerIndex = path.join(repoRoot, '_site/crm/demo/flower/index.html')
const clinicIndex = path.join(repoRoot, '_site/crm/demo/clinic/index.html')

if (fs.existsSync(flowerIndex) && fs.existsSync(clinicIndex)) {
  process.exit(0)
}

console.log('[dev] Демо не найдены в _site — собираем clinic + flower (как на GitHub Pages)…')
execSync('npm run build:clinic && npm run build:flower', {
  cwd: repoRoot,
  stdio: 'inherit',
})
