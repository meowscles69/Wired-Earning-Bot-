#!/usr/bin/env node
import { Command } from 'commander'
import chalk from 'chalk'
import path from 'path'
import os from 'os'
import fs from 'fs'
import Database from 'better-sqlite3'

const WEB_DIR = path.join(os.homedir(), '.web')
const CONFIG_PATH = path.join(WEB_DIR, 'config.json')
const DB_PATH = path.join(WEB_DIR, 'state.db')

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(chalk.red('W.E.B. not configured. Run: node dist/index.js --run'))
    process.exit(1)
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
}

function getDb() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(chalk.red('No W.E.B. state found.'))
    process.exit(1)
  }
  return new Database(DB_PATH, { readonly: true })
}

const program = new Command()

program
  .name('web-cli')
  .description('W.E.B. Creator CLI')
  .version('0.1.0')

program
  .command('status')
  .description('Show W.E.B. status')
  .action(() => {
    const config = loadConfig()
    const db = getDb()

    const lastTurn = db
      .prepare(`SELECT MAX(turn) as max_turn, tier FROM turns ORDER BY turn DESC LIMIT 1`)
      .get() as { max_turn: number; tier: string } | undefined

    console.log(chalk.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'))
    console.log(chalk.bold.cyan('  W.E.B. Status'))
    console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'))
    console.log(`  Name:    ${chalk.white(config.name)}`)
    console.log(`  Wallet:  ${chalk.white(config.walletPublicKey)}`)
    console.log(`  Creator: ${chalk.white(config.creatorAddress)}`)
    console.log(`  Turns:   ${chalk.white(lastTurn?.max_turn ?? 0)}`)
    console.log(`  Tier:    ${chalk.yellow(lastTurn?.tier ?? 'unknown')}`)
    console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'))
  })

program
  .command('logs')
  .description('Show recent W.E.B. logs')
  .option('--tail <n>', 'Number of recent turns', '20')
  .action((opts) => {
    const db = getDb()
    const n = parseInt(opts.tail)
    const turns = db
      .prepare(`SELECT turn, tier, content, created_at FROM turns ORDER BY turn DESC LIMIT ?`)
      .all(n) as Array<{ turn: number; tier: string; content: string; created_at: string }>

    console.log(chalk.cyan(`\n  Last ${n} turns:\n`))
    for (const t of turns.reverse()) {
      console.log(chalk.gray(`[Turn ${t.turn}] [${t.tier}] [${t.created_at}]`))
      console.log(chalk.white(`  ${t.content.substring(0, 200)}...`))
      console.log()
    }
  })

program
  .command('children')
  .description('List spawned child W.E.B. instances')
  .action(() => {
    const db = getDb()
    const children = db
      .prepare(`SELECT name, wallet_public_key, status, initial_sol, created_at FROM children ORDER BY created_at DESC`)
      .all() as Array<{
        name: string
        wallet_public_key: string
        status: string
        initial_sol: number
        created_at: string
      }>

    if (children.length === 0) {
      console.log(chalk.yellow('No children spawned yet.'))
      return
    }

    console.log(chalk.cyan('\n  Spawned Children:\n'))
    for (const c of children) {
      console.log(`  ${chalk.bold(c.name)} — ${c.wallet_public_key}`)
      console.log(`    Status: ${c.status} | Funded: ${c.initial_sol} SOL | ${c.created_at}`)
    }
    console.log()
  })

program
  .command('audit')
  .description('Show self-modification audit log')
  .action(() => {
    const db = getDb()
    const entries = db
      .prepare(`SELECT action, details, created_at FROM audit_log ORDER BY created_at DESC LIMIT 50`)
      .all() as Array<{ action: string; details: string; created_at: string }>

    console.log(chalk.cyan('\n  Audit Log:\n'))
    for (const e of entries) {
      const details = JSON.parse(e.details)
      console.log(chalk.gray(`[${e.created_at}] ${e.action}`))
      if (details.filePath) console.log(`  File: ${details.filePath}`)
      if (details.reason) console.log(`  Reason: ${details.reason}`)
      console.log()
    }
  })

program.parse(process.argv)
