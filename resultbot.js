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

    // Create a beautiful HTML-formatted message that matches the real portal styling
    console.log('DEBUG: Creating formatted Telegram message with portal styling')
    
    // Parse department from the link if available
    const urlParams = new URLSearchParams(link.split('?')[1] || '')
    const dept = urlParams.get('dept') || 'Unknown Department'
    const reg = urlParams.get('reg') || 'Unknown'
    const year = urlParams.get('year') || 'Unknown'
    const sem = urlParams.get('sem') || 'Unknown'
    
    // Create a beautiful HTML-formatted message that mimics the real portal
    const htmlMessage = `
📋 <b>MITS STUDENT RESULTS PORTAL</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<b>🎓 Student Details:</b>
├ <b>Department:</b> <code>${dept}</code>
├ <b>Regulation:</b> <code>${reg}</code>
├ <b>Year:</b> <code>${year}</code>
├ <b>Semester:</b> <code>${sem}</code>
├ <b>Roll Number:</b> <code>${roll}</code>
└ <b>Date of Birth:</b> <code>${dob}</code>

<b>🔗 Access Your Results:</b>
<a href="${link}">📊 Click Here to View Results</a>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<i>💡 Your complete results are available at the official MITS portal link above</i>
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
      text: `✅ <b>MITS Student Results</b>\n\n📋 Roll Number: <code>${roll}</code>\n📅 Date of Birth: <code>${dob}</code>\n\n🔗 <a href="${link}">View Results</a>`,
      parse_mode: 'HTML'
    }
  }
}