import { getDatabase } from '../state/db'
import { logger } from '../utils/logger'

export interface AgentMessage {
  id: string
  from: string
  to: string
  content: string
  createdAt: string
}

export async function sendMessage(from: string, to: string, content: string): Promise<void> {
  const db = getDatabase()
  db.prepare(
    `INSERT INTO messages (id, from_agent, to_agent, content, read, created_at)
     VALUES (?, ?, ?, ?, 0, datetime('now'))`
  ).run(crypto.randomUUID(), from, to, content)
  logger.info(`[Social] Message sent from ${from} to ${to}`)
}

export async function readMessages(agentName: string): Promise<AgentMessage[]> {
  const db = getDatabase()
  const messages = db
    .prepare(
      `SELECT id, from_agent as "from", to_agent as "to", content, created_at as createdAt
       FROM messages WHERE to_agent = ? AND read = 0 ORDER BY created_at ASC`
    )
    .all(agentName) as AgentMessage[]

  // Mark as read
  db.prepare(`UPDATE messages SET read = 1 WHERE to_agent = ?`).run(agentName)

  return messages
}
