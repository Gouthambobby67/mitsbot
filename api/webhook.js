import { Telegraf, Markup, session } from 'telegraf'
import setupHandlers from '../handlers.js'

const token = process.env.TELEGRAM_BOT_TOKEN || ''
if (!token) console.error('TELEGRAM_BOT_TOKEN is not set')
const bot = new Telegraf(token)
bot.use(session())
setupHandlers(bot, Markup)

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      await bot.handleUpdate(req.body)
      res.status(200).json({ ok: true })
    } catch (e) {
      res.status(200).json({ ok: false, error: String(e) })
    }
    return
  }
  res.status(200).json({ ok: true })
}