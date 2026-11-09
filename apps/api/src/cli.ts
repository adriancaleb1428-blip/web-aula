// Comandos de base de datos: migrate | seed | reset. Usa DATABASE_URL o, si no existe, el PostgreSQL de desarrollo.
import { rmSync } from 'node:fs'
import { DATABASE_URL, STORAGE_DIR } from './config.js'
import { migrate, pool, query, resetSchema } from './db.js'
import { startDevDatabase, stopDevDatabase } from './devdb.js'
import { seedDemo } from './seed.js'
import { loadCatalog } from './shop.js'

const command = process.argv[2]
async function main() {
  if (!['migrate', 'seed', 'reset', 'catalog'].includes(command)) { console.log('Uso: tsx src/cli.ts migrate | seed | reset | catalog'); return }
  if (!DATABASE_URL) await startDevDatabase()
  try {
    if (command === 'reset') { await resetSchema(); rmSync(STORAGE_DIR, { recursive: true, force: true }) }
    await migrate()
    if (command === 'catalog') console.log(`[catalog] ${await loadCatalog()} cursos cargados`)
    if (command === 'seed' || command === 'reset') {
      if (command === 'seed' && Number((await query('select count(*) from users')).rows[0].count) > 0) console.log('[seed] ya hay usuarios; usa «db:reset» para empezar de cero.')
      else await seedDemo()
    }
  } finally {
    await pool.end()
    await stopDevDatabase()
  }
}
main().catch(error => { console.error(error); process.exit(1) })
