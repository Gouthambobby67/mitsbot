import axios from 'axios'

export default async function botWork({ link, roll, dob }) {
  try {
    console.log('DEBUG: Starting botWork with link:', link, 'roll:', roll, 'dob:', dob)
    if (!link) return { text: 'No results link available' }

    // Try only the service we know works: ScreenshotMachine
    try {
      console.log('DEBUG: Trying ScreenshotMachine service')
      const url = `https://api.screenshotmachine.com/?url=${encodeURIComponent(link)}&device=desktop&dimension=1024x768&delay=2000&format=jpg`
      console.log(`DEBUG: Service URL: ${url}`)
      const res = await axios.get(url, { 
        responseType: 'arraybuffer', 
        timeout: 15000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      })
      console.log('DEBUG: ScreenshotMachine response status:', res.status)
      if (res.status === 200 && res.data) {
        const buf = Buffer.from(res.data)
        console.log('DEBUG: Image buffer size:', buf.length)
        if (buf.length < 7_500_000 && buf.length > 1000) {
          console.log('DEBUG: Successfully got screenshot from ScreenshotMachine')
          return { image: buf }
        }
      }
    } catch (err) {
      console.log('DEBUG: ScreenshotMachine failed:', err.message)
    }

    // Instead of complex HTML-to-image, create a beautiful Telegram-formatted message
    console.log('DEBUG: Creating formatted Telegram message')
    
    // Create a beautiful HTML-formatted message that Telegram will render well
    const htmlMessage = `
📋 <b>STUDENT RESULTS</b>
━━━━━━━━━━━━━━━━━━━━━

<b>🎓 Roll Number:</b> <code>${roll}</code>
<b>📅 Date of Birth:</b> <code>${dob}</code>

<b>🔗 Results Portal:</b>
<a href="${link}">📊 Click Here to View Your Results</a>

━━━━━━━━━━━━━━━━━━━━━
<i>💡 Your complete results are available at the link above</i>
    `.trim()
    
    // Return as HTML format for Telegram
    return { 
      text: htmlMessage,
      parse_mode: 'HTML'
    }
  } catch (err) {
    // Ultimate fallback
    console.log('DEBUG: Outer catch block triggered:', err.message)
    return { 
      text: `✅ <b>Your Results</b>\n\n📋 Roll Number: <code>${roll}</code>\n📅 Date of Birth: <code>${dob}</code>\n\n🔗 <a href="${link}">View Results</a>`,
      parse_mode: 'HTML'
    }
  }
}