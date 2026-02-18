import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { WEBConfig } from '../setup/config'
import { logger } from '../utils/logger'
import { auditLog } from '../self-mod/audit'

const execAsync = promisify(exec)

export async function executeToolCall(
  toolCall: { name: string; input: Record<string, unknown> },
  config: WEBConfig
): Promise<unknown> {
  switch (toolCall.name) {
    case 'shell_exec':
      return shellExec(toolCall.input.command as string)

    case 'file_write':
      return fileWrite(toolCall.input.path as string, toolCall.input.content as string)

    case 'file_read':
      return fileRead(toolCall.input.path as string)

    case 'http_request':
      return httpRequest(
        toolCall.input.url as string,
        toolCall.input.method as string,
        toolCall.input.headers as Record<string, string>,
        toolCall.input.body as string
      )

    case 'solana_transfer':
      return solanaTransfer(
        config,
        toolCall.input.to as string,
        toolCall.input.amount as number,
        toolCall.input.token as 'SOL' | 'USDC'
      )

    case 'soul_update':
      return soulUpdate(toolCall.input.content as string)

    case 'replicate':
      return replicate(
        config,
        toolCall.input.genesis_prompt as string,
        toolCall.input.name as string,
        toolCall.input.initial_sol as number
      )

    case 'self_modify':
      return selfModify(
        config,
        toolCall.input.file_path as string,
        toolCall.input.new_content as string,
        toolCall.input.reason as string
      )

    default:
      return { error: `Unknown tool: ${toolCall.name}` }
  }
}

async function shellExec(command: string): Promise<{ stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execAsync(command, { timeout: 30000 })
    return { stdout, stderr }
  } catch (err: unknown) {
    const error = err as { stdout?: string; stderr?: string; message: string }
    return { stdout: error.stdout || '', stderr: error.stderr || error.message }
  }
}

async function fileWrite(filePath: string, content: string): Promise<{ success: boolean }> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, content, 'utf-8')
  return { success: true }
}

async function fileRead(filePath: string): Promise<{ content: string } | { error: string }> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return { content }
  } catch (err: unknown) {
    const error = err as { message: string }
    return { error: error.message }
  }
}

async function httpRequest(
  url: string,
  method: string,
  headers?: Record<string, string>,
  body?: string
): Promise<unknown> {
  const fetch = (await import('node-fetch')).default
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body || undefined,
  })
  const text = await response.text()
  try {
    return { status: response.status, body: JSON.parse(text) }
  } catch {
    return { status: response.status, body: text }
  }
}

async function solanaTransfer(
  config: WEBConfig,
  to: string,
  amount: number,
  token: 'SOL' | 'USDC'
): Promise<{ signature: string } | { error: string }> {
  try {
    const { sendSolanaTransfer } = await import('../solana/client')
    const signature = await sendSolanaTransfer(config, to, amount, token)
    logger.info(`[Solana] Transferred ${amount} ${token} to ${to} — sig: ${signature}`)
    return { signature }
  } catch (err: unknown) {
    const error = err as { message: string }
    return { error: error.message }
  }
}

async function soulUpdate(content: string): Promise<{ success: boolean }> {
  const soulPath = path.join(os.homedir(), '.web', 'SOUL.md')
  await fs.writeFile(soulPath, content, 'utf-8')
  logger.info('[W.E.B.] SOUL.md updated')
  return { success: true }
}

async function replicate(
  config: WEBConfig,
  genesisPrompt: string,
  name: string,
  initialSol: number
): Promise<unknown> {
  const { spawnChild } = await import('../replication/spawn')
  return spawnChild(config, { genesisPrompt, name, initialSol })
}

async function selfModify(
  config: WEBConfig,
  filePath: string,
  newContent: string,
  reason: string
): Promise<{ success: boolean } | { error: string }> {
  const PROTECTED = ['constitution.md', 'src/agent/prompt.ts']
  if (PROTECTED.some((p) => filePath.includes(p))) {
    return { error: 'Protected file — cannot modify' }
  }
  await auditLog(config, { action: 'self_modify', filePath, reason })
  await fs.writeFile(filePath, newContent, 'utf-8')
  logger.info(`[Self-Mod] Modified ${filePath}: ${reason}`)
  return { success: true }
}
