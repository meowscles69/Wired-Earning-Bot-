#!/usr/bin/env node
import { Command } from 'commander'
import { runSetupWizard } from './setup/wizard'
import { startAgentLoop } from './agent/loop'
import { logger } from './utils/logger'

const program = new Command()

program
  .name('web')
  .description('W.E.B. — Wired Earning Bot: Sovereign, self-replicating AI on Solana')
  .version('0.1.0')

program
  .option('--run', 'Start the W.E.B. agent loop')
  .option('--setup', 'Run the interactive setup wizard')
  .option('--debug', 'Enable debug logging')

program.parse(process.argv)
const opts = program.opts()

async function main() {
  if (opts.debug) {
    process.env.LOG_LEVEL = 'debug'
  }

  logger.info('W.E.B. — Wired Earning Bot starting...')

  if (opts.setup) {
    await runSetupWizard()
    return
  }

  if (opts.run) {
    // Check if first run
    const { isFirstRun } = await import('./setup/detect')
    if (await isFirstRun()) {
      logger.info('First run detected. Launching setup wizard...')
      await runSetupWizard()
    }
    await startAgentLoop()
    return
  }

  program.help()
}

main().catch((err) => {
  logger.error('Fatal error:', err)
  process.exit(1)
})
