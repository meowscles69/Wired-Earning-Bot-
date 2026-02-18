import { createLogger, format, transports } from 'winston'
import path from 'path'
import os from 'os'
import fs from 'fs'

const WEB_DIR = path.join(os.homedir(), '.web')
if (!fs.existsSync(WEB_DIR)) {
  fs.mkdirSync(WEB_DIR, { recursive: true })
}

export const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
          return `[${timestamp}] ${level}: ${message}${metaStr}`
        })
      ),
    }),
    new transports.File({
      filename: path.join(WEB_DIR, 'web.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
  ],
})
