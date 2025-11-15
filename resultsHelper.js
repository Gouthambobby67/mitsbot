import axios from 'axios'
import { load } from 'cheerio'

export class ResultsChecking {
  constructor() {
    this.BASE_URL = 'http://125.16.54.154/mitsresults/resultug'
    this.ROMAN = { I: '1', II: '2', III: '3', IV: '4' }
    this.cache = new Map()
  }

  async fetchAll() {
    const { data: html } = await axios.get(this.BASE_URL, { timeout: 20000 })
    const $ = load(html)
    const wrapper = $('div.wrapper')
    if (!wrapper || wrapper.length === 0) return []
    const anchors = wrapper.find('a')
    const entries = []
    anchors.each((i, el) => {
      const rel = $(el).attr('href')
      const name = $(el).text().trim()
      if (!rel || !name) return
      const parts = name.split('-').map(p => p.trim())
      if (parts.length < 4) return
      if (this.ROMAN[parts[1]?.toUpperCase()]) parts[1] = this.ROMAN[parts[1].toUpperCase()]
      if (this.ROMAN[parts[2]?.toUpperCase()]) parts[2] = this.ROMAN[parts[2].toUpperCase()]
      const textNorm = parts.join('-')
      const fullLink = new URL(rel, this.BASE_URL).toString()
      entries.push([textNorm, fullLink, parts])
    })
    return entries
  }

  getResultsLink(collected) {
    if (!collected || collected.length < 3) return []
    const [reg, year, sem] = collected
    const key = `${reg}-${year}-${sem}`
    if (!this.cache.has(key)) this.cache.set(key, [])
    if (this.cache.get(key).length === 0) {
      return this.fetchAll().then(all => {
        const filtered = []
        for (const e of all) {
          const parts = e[2]
          try {
            if (String(parts[1]) === String(year) && String(parts[2]) === String(sem) && parts.includes(reg)) filtered.push([e[0], e[1]])
          } catch {}
        }
        this.cache.set(key, filtered)
        return filtered.map(x => x[0])
      })
    }
    return this.cache.get(key).map(x => x[0])
  }

  printOptions(collected) {
    if (!collected || collected.length < 4) return null
    const [reg, year, sem, idx] = collected
    const key = `${reg}-${year}-${sem}`
    if (!this.cache.has(key) || this.cache.get(key).length === 0) return null
    const list = this.cache.get(key)
    const i = parseInt(idx, 10)
    if (!(i >= 0 && i < list.length)) return null
    return list[i][1]
  }
}