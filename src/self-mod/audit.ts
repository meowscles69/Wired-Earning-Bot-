import { getDatabase } from '../state/db'
import { WEBConfig } from '../setup/config'

interface AuditEntry {
  action: string
  filePath?: string
  reason?: string
  details?: Record<string, unknown>
}

export async function auditLog(config: WEBConfig, entry: AuditEntry): Promise<void> {
  const db = getDatabase()
  db.prepare(
    `INSERT INTO audit_log (id, action, details, created_at)
     VALUES (?, ?, ?, datetime('now'))`
  ).run(
    crypto.randomUUID(),
    entry.action,
    JSON.stringify({ ...entry, agent: config.name, wallet: config.walletPublicKey })
  )
}
