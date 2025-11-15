"""
resutbot module - processes results from the portal and captures screenshots.
"""
import logging
import os
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)

def bot_work(data):
    """
    Fetch results webpage and capture screenshot.
    
    Args:
        data: [link, roll, dob]
    
    Returns:
        Path to PNG screenshot file or error message
    """
    if not data or len(data) < 3:
        return "Invalid data provided"
    
    link, roll, dob = data[:3]
    
    if not link:
        return "No results link available"
    
    try:
        # Try to use selenium for screenshot
        from selenium import webdriver
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
        import time
        
        # Create temp directory for screenshot
        temp_dir = tempfile.gettempdir()
        screenshot_path = os.path.join(temp_dir, f"result_{roll}.png")
        
        logger.info(f"Attempting to capture screenshot from: {link}")
        
        # Chrome options for headless mode
        options = webdriver.ChromeOptions()
        options.add_argument('--headless')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-gpu')
        
        driver = webdriver.Chrome(options=options)
        
        try:
            # Set window size for full page
            driver.set_window_size(1920, 1080)
            
            # Navigate to link with roll and dob as parameters
            full_url = f"{link}?roll={roll}&dob={dob}"
            driver.get(full_url)
            
            # Wait for page to load
            time.sleep(3)
            
            # Take screenshot
            driver.save_screenshot(screenshot_path)
            logger.info(f"Screenshot saved to: {screenshot_path}")
            
            return screenshot_path
            
        finally:
            driver.quit()
            
    except ImportError:
        logger.warning("Selenium not available, trying alternative method")
        # Fallback: try with playwright
        try:
            from playwright.sync_api import sync_playwright
            import time
            
            temp_dir = tempfile.gettempdir()
            screenshot_path = os.path.join(temp_dir, f"result_{roll}.png")
            
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page()
                page.set_viewport_size({"width": 1920, "height": 1080})
                
                full_url = f"{link}?roll={roll}&dob={dob}"
                page.goto(full_url, wait_until="networkidle")
                page.screenshot(path=screenshot_path, full_page=True)
                browser.close()
                
            logger.info(f"Screenshot saved to: {screenshot_path}")
            return screenshot_path
            
        except ImportError:
            logger.warning("Playwright also not available")
            # Return the link if no screenshot tool available
            return f"Results available at:\n{link}\n\nPlease open this link to view your results.\nRoll: {roll}\nDOB: {dob}"
            
    except Exception as e:
        logger.error(f"Error capturing screenshot: {e}", exc_info=True)
        return f"Could not capture results page. Please visit:\n{link}\n\nError: {str(e)}"
