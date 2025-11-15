import axios from 'axios'

export default async function botWork({ link, roll, dob }) {
  try {
    if (!link) return { text: 'No results link available' }

    // Try free screenshot services first (no API keys required)
    const freeServices = [
      // Free services that work without API keys
      u => `https://render-tron.appspot.com/screenshot/${encodeURIComponent(u)}?width=1024&height=768&delay=2000`,
      u => `https://screenshotapi.net/api/v1/screenshot?url=${encodeURIComponent(u)}&width=1024&height=768&delay=2000`,
      u => `https://api.screenshotmachine.com/?url=${encodeURIComponent(u)}&device=desktop&dimension=1024x768&delay=2000&format=jpg`
    ]

    for (const make of freeServices) {
      try {
        const url = make(link)
        const res = await axios.get(url, { 
          responseType: 'arraybuffer', 
          timeout: 15000,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        })
        if (res.status === 200 && res.data) {
          const buf = Buffer.from(res.data)
          if (buf.length < 7_500_000 && buf.length > 1000) return { image: buf }
        }
      } catch {}
    }

    // Try lightweight HTML-to-image conversion
    try {
      const htmlRes = await axios.get(link, { timeout: 10000 })
      if (htmlRes.status === 200 && htmlRes.data) {
        // Create a simple HTML page with the result data
        const htmlContent = `
          <html>
          <head><meta charset="utf-8"><title>Results</title></head>
          <body style="font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h1 style="color: #2c3e50; text-align: center; margin-bottom: 30px;">📋 Student Results</h1>
              <div style="background: #ecf0f1; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
                <p><strong>Roll Number:</strong> ${roll}</p>
                <p><strong>Date of Birth:</strong> ${dob}</p>
                <p><strong>Results Portal:</strong> <a href="${link}" target="_blank">Click here to view results</a></p>
              </div>
              <div style="text-align: center; color: #7f8c8d; font-size: 14px; margin-top: 30px;">
                <p>🔗 Access your complete results by clicking the link above</p>
              </div>
            </div>
          </body>
          </html>
        `
        
        // Use a free HTML to image service
        const imageRes = await axios.post('https://hcti.io/v1/image', {
          html: htmlContent,
          css: 'body { margin: 0; }',
          width: 800,
          height: 600
        }, {
          timeout: 15000,
          responseType: 'arraybuffer'
        }).catch(() => null)
        
        if (imageRes && imageRes.status === 200 && imageRes.data) {
          const buf = Buffer.from(imageRes.data)
          if (buf.length < 7_500_000 && buf.length > 1000) return { image: buf }
        }
      }
    } catch {}

    // Fallback: Return formatted text with direct link
    const text = `✅ **Your Results**\n\n📋 Roll Number: \`${roll}\`\n📅 Date of Birth: \`${dob}\`\n\n🔗 Results Link:\n${link}\n\n💡 *Tip: Click the link above to view your complete results on the official portal.*`
    return { text }
  } catch {
    // Ultimate fallback
    return { text: `✅ **Your Results**\n\n📋 Roll Number: \`${roll}\`\n📅 Date of Birth: \`${dob}\`\n\n🔗 Direct Link:\n${link}` }
  }
}