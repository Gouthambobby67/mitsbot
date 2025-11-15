"""
resutbot module - processes results from the portal.
Captures screenshot of results page using screenshot API.
"""
import logging
import requests
import os
import tempfile
from urllib.parse import quote

logger = logging.getLogger(__name__)

def bot_work(data):
    """
    Capture screenshot of results page.
    
    Args:
        data: [link, roll, dob]
    
    Returns:
        Path to PNG screenshot file or message with link
    """
    if not data or len(data) < 3:
        return "Invalid data provided"
    
    link, roll, dob = data[:3]
    
    if not link:
        return "No results link available"
    
    try:
        logger.info(f"Capturing screenshot of results page for roll {roll}")
        
        # Method 1: Try using screenshotone.com API (free, no key required for basic use)
        try:
            screenshot_url = f"https://api.screenshotone.com/take?url={quote(link)}&delay=2000&format=png"
            response = requests.get(screenshot_url, timeout=30)
            
            if response.status_code == 200:
                # Save screenshot to temp directory
                temp_dir = tempfile.gettempdir()
                screenshot_path = os.path.join(temp_dir, f"result_{roll}.png")
                
                with open(screenshot_path, 'wb') as f:
                    f.write(response.content)
                
                logger.info(f"Screenshot saved to: {screenshot_path}")
                return screenshot_path
        except Exception as e:
            logger.warning(f"screenshotone API failed: {e}")
        
        # Method 2: Try using urlbox.io API
        try:
            screenshot_url = f"https://api.urlbox.io/v1/render?url={quote(link)}&full_page=true&format=png"
            response = requests.get(screenshot_url, timeout=30)
            
            if response.status_code == 200:
                temp_dir = tempfile.gettempdir()
                screenshot_path = os.path.join(temp_dir, f"result_{roll}.png")
                
                with open(screenshot_path, 'wb') as f:
                    f.write(response.content)
                
                logger.info(f"Screenshot saved to: {screenshot_path}")
                return screenshot_path
        except Exception as e:
            logger.warning(f"urlbox API failed: {e}")
        
        # Method 3: Try using api.apiflash.com (free tier available)
        try:
            screenshot_url = f"https://v1.apiflash.com/capture?url={quote(link)}&format=png&full_page=true&response_type=image"
            response = requests.get(screenshot_url, timeout=30)
            
            if response.status_code == 200 and response.content:
                temp_dir = tempfile.gettempdir()
                screenshot_path = os.path.join(temp_dir, f"result_{roll}.png")
                
                with open(screenshot_path, 'wb') as f:
                    f.write(response.content)
                
                logger.info(f"Screenshot saved to: {screenshot_path}")
                return screenshot_path
        except Exception as e:
            logger.warning(f"apiflash API failed: {e}")
        
        # Fallback: Return link if all APIs fail
        logger.warning("All screenshot APIs failed, returning link instead")
        result_message = (
            f"✅ **Your Results**\n\n"
            f"📋 Roll Number: `{roll}`\n"
            f"📅 Date of Birth: `{dob}`\n\n"
            f"🔗 Results Link:\n"
            f"{link}\n\n"
            f"Click the link to view your results."
        )
        return result_message
        
    except Exception as e:
        logger.error(f"Error in bot_work: {e}", exc_info=True)
        return f"Error retrieving results: {str(e)}\n\nLink: {link}"
