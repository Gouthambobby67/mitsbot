from bs4 import BeautifulSoup
from urllib.parse import quote, urljoin
import requests
import logging

logger = logging.getLogger(__name__)

def safe_url(u):
    """Safely encode URL with special characters."""
    if " " not in u:
        return u
    parts = u.split('/', 3)
    if len(parts) < 4:
        return u
    prefix = '/'.join(parts[:3])
    path = quote(parts[3])
    return f"{prefix}/{path}"

def exam_timetable(regulation):
    """Fetch exam timetables for a given regulation."""
    try:
        html_text = requests.get("https://mits.ac.in/ugc-autonomous-exam-portal#ugc-pro3", timeout=10).text
        soup = BeautifulSoup(html_text, 'lxml')
        n = 0
        b = []
        table = soup.find('div', id='ugc-pro3')
        if not table:
            return []
        exam = table.find('div', class_='container')
        if not exam:
            return []
        exam1 = exam.find_all("li")
        for index, exam2 in enumerate(exam1):
            if n == 5:
                break
            a = exam2.text.strip()
            downlink = exam2.find("a")
            if downlink and 'href' in downlink.attrs:
                downloadlink = safe_url(downlink['href'])
                if regulation in a:
                    b.append(a)
                    b.append(downloadlink)
                    n = n + 1
        return b
    except Exception as e:
        logger.error(f"Error fetching exam timetable: {e}")
        return []

def results_checking():
    """Deprecated: Use ResultsChecking class from results_helper instead."""
    logger.warning("results_checking() is deprecated. Use ResultsChecking from results_helper.")
    return None

if __name__ == "__main__":
    print("This module is for bot use. Use bot_handlers.py for bot functionality.")
