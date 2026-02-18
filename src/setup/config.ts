import fs from 'fs/promises'
import path from 'path'
import os from 'os'

const WEB_DIR = path.join(os.homedir(), '.web')
const CONFIG_PATH = path.join(WEB_DIR, 'config.json')

export interface WEBConfig {
  name: string
  genesisPrompt: string
  creatorAddress: string
  walletPublicKey: string
  walletSecretKey: string
  rpcUrl: string
  anthropicApiKey: string
  createdAt: string
}

export async function saveConfig(config: WEBConfig): Promise<void> {
  await fs.mkdir(WEB_DIR, { recursive: true })
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
  await fs.chmod(CONFIG_PATH, 0o600) // owner read/write only
}

export async function loadConfig(): Promise<WEBConfig> {
  const raw = await fs.readFile(CONFIG_PATH, 'utf-8')
  const config = JSON.parse(raw) as WEBConfig
  // Inject API key into environment
  process.env.ANTHROPIC_API_KEY = config.anthropicApiKey
  return config
}
