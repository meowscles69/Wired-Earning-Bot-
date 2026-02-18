import fs from 'fs/promises'
import path from 'path'
import os from 'os'

const CONFIG_PATH = path.join(os.homedir(), '.web', 'config.json')

export async function isFirstRun(): Promise<boolean> {
  try {
    await fs.access(CONFIG_PATH)
    return false
  } catch {
    return true
  }
}
