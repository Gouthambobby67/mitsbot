import logging
import os
import tempfile
from playwright.sync_api import sync_playwright

logger = logging.getLogger(__name__)

def bot_work(data):
    """
    Capture screenshot of results page using Playwright.
    
    Args:
        data: [link, roll, dob, department_code, regulation, year, semester]
    
    Returns:
        Path to PNG screenshot file or message with link
    """
    if not data or len(data) < 7:
        return "Invalid data provided"
    
    link, roll, dob, department_code, regulation, year, semester = data

    if not link:
        return "No results link available"

    with sync_playwright() as p:
        browser = None
        try:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            
            result_id = f"B.Tech-{year}-{semester}-{regulation}-Regular-{datetime.now().year}"
            portal_url = f"http://125.16.54.154/mitsresults/resultug/myresultug?resultid={result_id}"
            
            logger.info(f"Navigating to {portal_url} for roll {roll}")
            page.goto(portal_url, wait_until='networkidle', timeout=20000)

            # Fill the form
            page.select_option('select[name="department1"]', department_code)
            page.fill('input[name="usn"]', roll)
            page.fill('input[name="dateofbirth"]', dob)

            # Submit the form and wait for navigation
            with page.expect_navigation(wait_until='networkidle', timeout=20000):
                page.click('input[type="submit"]')

            # Check for error messages
            body_text = page.inner_text('body')
            if 'not found' in body_text.lower() or 'invalid' in body_text.lower():
                logger.warning(f"Portal returned 'not found' or 'invalid' for roll {roll}")
                return (f"❌ <b>Results Not Found</b>\n\n"
                        f"📋 <b>Details:</b>\n"
                        f"├ Department: <code>{department_code}</code>\n"
                        f"├ Roll Number: <code>{roll}</code>\n"
                        f"├ Date of Birth: <code>{dob}</code>\n\n"
                        f"💡 <i>Please check your details and try again. The portal reported they are invalid.</i>")

            # Take a screenshot of the results table
            results_table = page.query_selector('table')
            if results_table:
                logger.info(f"Found results table, taking screenshot for roll {roll}")
                temp_dir = tempfile.gettempdir()
                screenshot_path = os.path.join(temp_dir, f"result_{roll}.png")
                results_table.screenshot(path=screenshot_path)
                logger.info(f"Screenshot saved to: {screenshot_path}")
                return screenshot_path
            
            # Fallback if screenshot fails
            logger.warning("Screenshot failed, returning a text summary.")
            student_name_element = page.query_selector('td:has-text("Name") + td')
            student_name = student_name_element.inner_text() if student_name_element else "N/A"
            sgpa_element = page.query_selector('td:has-text("SGPA") + td')
            sgpa = sgpa_element.inner_text() if sgpa_element else "N/A"

            return (f"✅ <b>Results Found!</b> (Screenshot failed)\n\n"
                    f"🎓 <b>Student:</b> {student_name}\n"
                    f"📊 <b>SGPA:</b> {sgpa}\n\n"
                    f"🔗 <a href='{page.url}'>View Detailed Results</a>")

        except Exception as e:
            logger.error(f"Error in bot_work with Playwright: {e}", exc_info=True)
            return (f"❌ <b>Error Processing Results</b>\n\n"
                    f"An error occurred while trying to fetch the results from the portal.\n\n"
                    f"💡 <i>Please try again later.</i>")
        finally:
            if browser:
                browser.close()
