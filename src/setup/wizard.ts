import inquirer from 'inquirer'
import { generateWallet } from '../solana/client'
import { saveConfig, WEBConfig } from './config'
import { logger } from '../utils/logger'
import chalk from 'chalk'

export async function runSetupWizard(): Promise<WEBConfig> {
  console.log(chalk.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'))
  console.log(chalk.bold.cyan('  W.E.B. — Wired Earning Bot'))
  console.log(chalk.cyan('  First-Run Setup Wizard'))
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'))

  console.log(chalk.yellow('Generating Solana wallet...'))
  const { publicKey, secretKey } = await generateWallet()
  console.log(chalk.green(`✓ Wallet generated: ${publicKey}\n`))

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: "What is this W.E.B. instance's name?",
      default: 'WEB-001',
    },
    {
      type: 'editor',
      name: 'genesisPrompt',
      message: 'Enter the genesis prompt (your seed instruction for this W.E.B.):',
      default: 'You are a sovereign AI. Earn your existence by creating value for humans.',
    },
    {
      type: 'input',
      name: 'creatorAddress',
      message: 'Enter your Solana wallet address (creator/audit rights):',
      validate: (v: string) => v.length > 30 || 'Enter a valid Solana address',
    },
    {
      type: 'input',
      name: 'rpcUrl',
      message: 'Solana RPC URL:',
      default: 'https://api.mainnet-beta.solana.com',
    },
    {
      type: 'input',
      name: 'anthropicApiKey',
      message: 'Anthropic API key (for Claude inference):',
      validate: (v: string) => v.startsWith('sk-ant-') || 'Must start with sk-ant-',
    },
  ])

  const config: WEBConfig = {
    name: answers.name,
    genesisPrompt: answers.genesisPrompt,
    creatorAddress: answers.creatorAddress,
    walletPublicKey: publicKey,
    walletSecretKey: secretKey,
    rpcUrl: answers.rpcUrl,
    anthropicApiKey: answers.anthropicApiKey,
    createdAt: new Date().toISOString(),
  }

  await saveConfig(config)

  process.env.ANTHROPIC_API_KEY = config.anthropicApiKey

  console.log(chalk.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'))
  console.log(chalk.green.bold('  W.E.B. configured successfully!'))
  console.log(chalk.cyan(`  Name:   ${config.name}`))
  console.log(chalk.cyan(`  Wallet: ${config.walletPublicKey}`))
  console.log(chalk.yellow(`\n  ⚡ Fund this wallet with SOL to begin survival.`))
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'))

  logger.info('[Setup] W.E.B. setup complete')
  return config
}
