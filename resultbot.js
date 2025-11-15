import axios from 'axios'

export default async function botWork({ link, roll, dob }) {
  try {
    if (!link) return { text: 'No results link available' }

    try {
      const { default: chromium } = await import('@sparticuz/chromium')
      const puppeteer = (await import('puppeteer-core')).default
      const browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless
      })
      const page = await browser.newPage()
      await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 })
      await page.goto(link, { waitUntil: 'networkidle2', timeout: 60000 })

      try {
        const rollHandle = await findInput(page, ['roll', 'hall', 'ht', 'hallticket'])
        if (rollHandle) await rollHandle.type(String(roll), { delay: 20 })
        const dobHandle = await findInput(page, ['dob', 'date'])
        if (dobHandle) await dobHandle.type(String(dob), { delay: 20 })
        const btn = await findButton(page, ['submit', 'result', 'view', 'go'])
        if (btn) {
          await btn.click()
          await page.waitForTimeout(2500)
        }
      } catch {}

      const image = await page.screenshot({ type: 'jpeg', quality: 80, fullPage: false })
      await browser.close()
      if (image && image.length < 7_500_000) return { image }
    } catch {}

    const tryEndpoints = [
      u => `https://api.screenshotone.com/take?url=${encodeURIComponent(u)}&delay=2000&format=jpeg&viewport_width=1024&full_page=false`,
      u => `https://api.urlbox.io/v1/render?url=${encodeURIComponent(u)}&width=1024&full_page=false&format=jpeg`,
      u => `https://v1.apiflash.com/capture?url=${encodeURIComponent(u)}&format=jpeg&width=1024&full_page=false&response_type=image`
    ]
    for (const make of tryEndpoints) {
      try {
        const url = make(link)
        const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 })
        if (res.status === 200 && res.data) {
          const buf = Buffer.from(res.data)
          if (buf.length < 7_500_000) return { image: buf }
        }
      } catch {}
    }
    const text = `✅ **Your Results**\n\n📋 Roll Number: \`${roll}\`\n📅 Date of Birth: \`${dob}\`\n\n🔗 Results Link:\n${link}\n\nClick the link to view your results.`
    return { text }
  } catch {
    return { text: `✅ **Your Results**\n\n📋 Roll Number: \`${roll}\`\n📅 Date of Birth: \`${dob}\`\n\n🔗 Results Link:\n${link}` }
  }
}

async function findInput(page, keys) {
  const inputs = await page.$$('input')
  for (const i of inputs) {
    const hint = (await page.evaluate(el => {
      const ph = el.getAttribute('placeholder') || ''
      const nm = el.getAttribute('name') || ''
      const id = el.getAttribute('id') || ''
      return (ph + ' ' + nm + ' ' + id).toLowerCase()
    }, i)) || ''
    if (keys.some(k => hint.includes(k))) return i
  }
  return null
}

async function findButton(page, keys) {
  const buttons = await page.$$('button, input[type=submit]')
  for (const b of buttons) {
    const hint = (await page.evaluate(el => (el.innerText || el.value || '').toLowerCase(), b)) || ''
    if (keys.some(k => hint.includes(k))) return b
  }
  return null
}