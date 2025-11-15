"""
resutbot module - processes results from the portal.
Vercel doesn't support browser automation, so we return the results link for the user to open.
"""
import logging

logger = logging.getLogger(__name__)

def bot_work(data):
    """
    Return results link with roll and DOB for user to fetch.
    
    Args:
        data: [link, roll, dob]
    
    Returns:
        Results link URL
    """
    if not data or len(data) < 3:
        return "Invalid data provided"
    
    link, roll, dob = data[:3]
    
    if not link:
        return "No results link available"
    
    try:
        # Format the link with roll and dob parameters
        # The results portal expects these parameters
        results_link = f"{link}"
        
        logger.info(f"Returning results link for roll {roll}")
        
        # Return formatted message with the link
        result_message = (
            f"✅ **Your Results Link**\n\n"
            f"📋 Roll Number: `{roll}`\n"
            f"📅 Date of Birth: `{dob}`\n\n"
            f"🔗 Results Link:\n"
            f"{results_link}\n\n"
            f"Click the link above to view your results on the college portal."
        )
        
        return result_message
        
    except Exception as e:
        logger.error(f"Error in bot_work: {e}", exc_info=True)
        return f"Error: {str(e)}"
