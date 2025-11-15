import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'

export default async function botWork({ link, roll, dob, departmentCode, regulation, year, semester }) {
  let browser = null;
  try {
    console.log('DEBUG: Starting botWork with Puppeteer...');
    
    if (!roll || !dob || !departmentCode) {
      return { text: '❌ Missing required student information' };
    }

    // The link from the previous step is a good starting point, but we need the base form.
    // Let's derive it from the provided HTML structure.
    const resultId = `B.Tech-${year}-${semester}-${regulation}-Regular-${new Date().getFullYear()}`;
    const portalUrl = `http://125.16.54.154/mitsresults/resultug/myresultug?resultid=${encodeURIComponent(resultId)}`;
    
    console.log('DEBUG: Portal URL:', portalUrl);
    console.log('DEBUG: Form data:', { department1: departmentCode, usn: roll, dateofbirth: dob });

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.goto(portalUrl, { waitUntil: 'networkidle2', timeout: 20000 });

    // Fill the form
    await page.select('select[name="department1"]', departmentCode);
    await page.type('input[name="usn"]', roll);
    await page.type('input[name="dateofbirth"]', dob);

    // Submit the form and wait for navigation
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }),
      page.click('input[type="submit"]')
    ]);

    // Check for error messages on the new page
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (bodyText.toLowerCase().includes('not found') || bodyText.toLowerCase().includes('invalid')) {
      console.log('DEBUG: Portal returned "not found" or "invalid" message.');
      return {
        text: `❌ <b>Results Not Found</b>\n\n📋 <b>Details:</b>\n├ Department: <code>${departmentCode}</code>\n├ Roll Number: <code>${roll}</code>\n├ Date of Birth: <code>${dob}</code>\n\n💡 <i>Please check your details and try again. The portal reported they are invalid.</i>`,
        parse_mode: 'HTML'
      };
    }

    // Take a screenshot of the results table
    const resultsTable = await page.$('table');
    if (resultsTable) {
      console.log('DEBUG: Found results table, taking screenshot...');
      const screenshotBuffer = await resultsTable.screenshot({ type: 'png' });
      if (screenshotBuffer) {
        console.log('DEBUG: Successfully captured results screenshot.');
        return { image: screenshotBuffer };
      }
    }
    
    // Fallback if screenshot fails
    console.log('DEBUG: Screenshot failed, returning a text summary.');
    const studentName = await page.evaluate(() => {
        const el = Array.from(document.querySelectorAll('td')).find(e => e.innerText.toLowerCase().includes('name'));
        return el ? el.nextElementSibling.innerText : 'N/A';
    });
    const sgpa = await page.evaluate(() => {
        const el = Array.from(document.querySelectorAll('td')).find(e => e.innerText.toLowerCase().includes('sgpa'));
        return el ? el.nextElementSibling.innerText : 'N/A';
    });

    return {
      text: `✅ <b>Results Found!</b> (Screenshot failed)\n\n🎓 <b>Student:</b> ${studentName}\n📊 <b>SGPA:</b> ${sgpa}\n\n🔗 <a href="${page.url()}">View Detailed Results</a>`,
      parse_mode: 'HTML'
    };

  } catch (err) {
    console.error('DEBUG: Puppeteer process failed:', err);
    return {
      text: `❌ <b>Error Processing Results</b>\n\nAn error occurred while trying to fetch the results from the portal. This could be due to an invalid URL, a timeout, or a problem with the portal itself.\n\n💡 <i>Please try again later.</i>`,
      parse_mode: 'HTML'
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}