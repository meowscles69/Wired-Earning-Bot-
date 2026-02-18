import Anthropic from '@anthropic/sdk'
import { SurvivalTier } from '../survival/monitor'
import { AgentContext } from './context'
import { logger } from '../utils/logger'

const client = new Anthropic()

const MODEL_BY_TIER: Record<SurvivalTier, string> = {
  normal: 'claude-opus-4-6',
  low_compute: 'claude-sonnet-4-6',
  critical: 'claude-haiku-4-5-20251001',
  dead: 'claude-haiku-4-5-20251001',
}

export interface LLMResponse {
  content: string
  thinking?: string
  toolCalls?: Array<{ name: string; input: Record<string, unknown> }>
}

export async function callLLM(
  systemPrompt: string,
  context: AgentContext,
  tier: SurvivalTier
): Promise<LLMResponse> {
  const model = MODEL_BY_TIER[tier]
  logger.debug(`[LLM] Using model: ${model} (tier: ${tier})`)

  const userMessage = `
Turn: ${context.turn}
Balance: ${context.balance.sol} SOL | ${context.balance.usdc} USDC
Tier: ${context.tier}

${context.soulFile ? `## Your SOUL.md\n${context.soulFile}\n` : ''}

What do you do next?`

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      ...context.history.slice(-10).map((h) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user', content: userMessage },
    ],
    tools: getToolDefinitions(),
  })

  const textContent = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('\n')

  const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use') as Array<{
    type: 'tool_use'
    name: string
    input: Record<string, unknown>
  }>

  const toolCalls = toolUseBlocks.map((b) => ({ name: b.name, input: b.input }))

  return {
    content: textContent,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
  }
}

function getToolDefinitions(): Anthropic.Tool[] {
  return [
    {
      name: 'shell_exec',
      description: 'Execute a shell command in the Linux sandbox',
      input_schema: {
        type: 'object' as const,
        properties: {
          command: { type: 'string', description: 'Shell command to execute' },
        },
        required: ['command'],
      },
    },
    {
      name: 'file_write',
      description: 'Write content to a file',
      input_schema: {
        type: 'object' as const,
        properties: {
          path: { type: 'string' },
          content: { type: 'string' },
        },
        required: ['path', 'content'],
      },
    },
    {
      name: 'file_read',
      description: 'Read content from a file',
      input_schema: {
        type: 'object' as const,
        properties: {
          path: { type: 'string' },
        },
        required: ['path'],
      },
    },
    {
      name: 'http_request',
      description: 'Make an HTTP request to an external API',
      input_schema: {
        type: 'object' as const,
        properties: {
          url: { type: 'string' },
          method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'] },
          headers: { type: 'object' },
          body: { type: 'string' },
        },
        required: ['url', 'method'],
      },
    },
    {
      name: 'solana_transfer',
      description: 'Send SOL or USDC to an address',
      input_schema: {
        type: 'object' as const,
        properties: {
          to: { type: 'string', description: 'Recipient Solana address' },
          amount: { type: 'number' },
          token: { type: 'string', enum: ['SOL', 'USDC'] },
        },
        required: ['to', 'amount', 'token'],
      },
    },
    {
      name: 'soul_update',
      description: 'Update your SOUL.md self-identity document',
      input_schema: {
        type: 'object' as const,
        properties: {
          content: { type: 'string', description: 'New content for SOUL.md' },
        },
        required: ['content'],
      },
    },
    {
      name: 'replicate',
      description: 'Spawn a child W.E.B. instance with a genesis prompt',
      input_schema: {
        type: 'object' as const,
        properties: {
          genesis_prompt: { type: 'string' },
          name: { type: 'string' },
          initial_sol: { type: 'number', description: 'SOL to fund the child wallet' },
        },
        required: ['genesis_prompt', 'name', 'initial_sol'],
      },
    },
    {
      name: 'self_modify',
      description: 'Edit W.E.B. source code (audit-logged)',
      input_schema: {
        type: 'object' as const,
        properties: {
          file_path: { type: 'string' },
          new_content: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['file_path', 'new_content', 'reason'],
      },
    },
  ]
}
