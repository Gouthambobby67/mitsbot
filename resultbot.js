import axios from 'axios'
import { load } from 'cheerio'

export default async function botWork({ link, roll, dob, departmentCode, regulation, year, semester }) {
  try {
    console.log('DEBUG: Starting botWork with:', { link, roll, dob, departmentCode, regulation, year, semester })
    
    if (!roll || !dob || !departmentCode) {
      return { text: '❌ Missing required student information' }
    }

    // Construct the real results portal URL based on the pattern from HTML
    const resultId = `B.Tech-${year}-${semester}-${regulation}-Regular-${new Date().getFullYear()}`
    const portalUrl = `http://125.16.54.154/mitsresults/resultug/myresultug?resultid=${encodeURIComponent(resultId)}`
    
    console.log('DEBUG: Real portal URL:', portalUrl)
    console.log('DEBUG: Form data:', { department1: departmentCode, usn: roll, dateofbirth: dob })

    // Try to submit the real form to get actual results
    try {
      console.log('DEBUG: Attempting real form submission...')
      
      // Create form data matching the real portal
      const formData = new URLSearchParams()
      formData.append('department1', departmentCode)
      formData.append('usn', roll)
      formData.append('dateofbirth', dob)
      
      const response = await axios.post(portalUrl, formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 20000,
        maxRedirects: 5
      })
      
      console.log('DEBUG: Portal response status:', response.status)
      
      if (response.status === 200 && response.data) {
        console.log('DEBUG: Got response from portal, parsing results...')
        
        // Parse the HTML response to extract results
        const $ = load(response.data)
        
        // Look for results table or error message
        const resultsTable = $('table').first()
        const errorMessage = $('body').text().toLowerCase().includes('not found') || 
                           $('body').text().toLowerCase().includes('invalid') ||
                           $('body').text().toLowerCase().includes('error')
        
        if (errorMessage) {
          console.log('DEBUG: Portal returned error message')
          return {
            text: `❌ <b>Results Not Found</b>\n\n📋 <b>Details:</b>\n├ Department: <code>${departmentCode}</code>\n├ Roll Number: <code>${roll}</code>\n├ Date of Birth: <code>${dob}</code>\n\n💡 <i>Please check your details and try again, or contact the examination office.</i>`,
            parse_mode: 'HTML'
          }
        }
        
        if (resultsTable && resultsTable.length > 0) {
          console.log('DEBUG: Found results table, taking screenshot...')
          
          // Try to get screenshot of the results
          try {
            const screenshotUrl = `https://api.screenshotmachine.com/?url=${encodeURIComponent(portalUrl)}&device=desktop&dimension=1024x768&delay=3000&format=jpg&cache=0`
            const screenshotRes = await axios.get(screenshotUrl, {
              responseType: 'arraybuffer',
              timeout: 25000,
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            })
            
            if (screenshotRes.status === 200 && screenshotRes.data) {
              const buf = Buffer.from(screenshotRes.data)
              if (buf.length > 1000 && buf.length < 8_000_000) {
                console.log('DEBUG: Successfully captured results screenshot')
                return { image: buf }
              }
            }
          } catch (screenshotErr) {
            console.log('DEBUG: Screenshot failed:', screenshotErr.message)
          }
          
          // Fallback: Extract some text from the results
          const studentName = $('td').filter((i, el) => $(el).text().toLowerCase().includes('name')).next().text() || 'N/A'
          const sgpa = $('td').filter((i, el) => $(el).text().toLowerCase().includes('sgpa')).next().text() || 'N/A'
          const cgpa = $('td').filter((i, el) => $(el).text().toLowerCase().includes('cgpa')).next().text() || 'N/A'
          
          return {
            text: `✅ <b>Results Found!</b>\n\n🎓 <b>Student Information:</b>\n├ Department: <code>${departmentCode}</code>\n├ Roll Number: <code>${roll}</code>\n├ Name: <code>${studentName}</code>\n├ SGPA: <code>${sgpa}</code>\n└ CGPA: <code>${cgpa}</code>\n\n🔗 <a href="${portalUrl}">View Detailed Results</a>`,
            parse_mode: 'HTML'
          }
        }
      }
    } catch (portalErr) {
      console.log('DEBUG: Portal submission failed:', portalErr.message)
    }

    // Fallback: Create a professional results message that matches the portal
    console.log('DEBUG: Creating fallback results message')
    
    // Determine result type based on current date and semester
    const currentMonth = new Date().getMonth() + 1
    const resultType = (currentMonth >= 6 && currentMonth <= 8) ? 'Supplementary-July' : 'Regular-December'
    const fallbackResultId = `B.Tech-${year}-${semester}-${regulation}-${resultType}-${new Date().getFullYear()}`
    const fallbackPortalUrl = `http://125.16.54.154/mitsresults/resultug/myresultug?resultid=${encodeURIComponent(fallbackResultId)}`
    
    const fallbackMessage = `
📋 <b>MITS STUDENT RESULTS PORTAL</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎓 <b>Result Details:</b>
├ <b>Exam:</b> <code>${fallbackResultId}</code>
├ <b>Department:</b> <code>${departmentCode}</code>
├ <b>Regulation:</b> <code>${regulation}</code>
├ <b>Year:</b> <code>${year}</code>
├ <b>Semester:</b> <code>${semester}</code>
├ <b>Roll Number:</b> <code>${roll}</code>
└ <b>Date of Birth:</b> <code>${dob}</code>

📊 <b>Access Your Results:</b>
<i>Your results are being processed. Please check the official portal below.</i>

🔗 <a href="${fallbackPortalUrl}">🖱️ Click Here to View Results</a>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ <i>If results are not available, please try again later or contact the examination office.</i>
    `.trim()
    
    return {
      text: fallbackMessage,
      parse_mode: 'HTML'
    }
    
  } catch (err) {
    console.log('DEBUG: Complete failure:', err.message)
    return {
      text: `❌ <b>Error Processing Results</b>\n\n💡 <i>Please try again later or contact support.</i>`,
      parse_mode: 'HTML'
    }
  }
}