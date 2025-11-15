import axios from 'axios'
import { load } from 'cheerio'

function safeUrl(u) {
  if (!u.includes(' ')) return u
  const parts = u.split('/', 3)
  if (parts.length < 3) return u
  const prefix = parts.slice(0, 3).join('/')
  const path = encodeURI(u.split('/').slice(3).join('/'))
  return `${prefix}/${path}`
}

export default async function examTimetable(regulation) {
  try {
    const { data: html } = await axios.get('https://mits.ac.in/ugc-autonomous-exam-portal#ugc-pro3', { timeout: 10000 })
    const $ = load(html)
    const table = $('#ugc-pro3')
    if (!table || table.length === 0) return []
    const container = table.find('div.container')
    if (!container || container.length === 0) return []
    const items = []
    container.find('li').each((i, el) => {
      if (items.length >= 10) return
      const text = $(el).text().trim()
      const a = $(el).find('a')
      const href = a && a.attr('href')
      if (href && text.includes(regulation)) {
        items.push(text)
        items.push(safeUrl(href))
      }
    })
    return items
  } catch {
    return []
  }
}