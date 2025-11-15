import logging
from urllib.parse import urljoin
import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

class ResultsChecking:
    BASE_URL = "http://125.16.54.154/mitsresults/resultug"
    ROMAN = {
        "I": "1",
        "II": "2",
        "III": "3",
        "IV": "4",
    }

    def __init__(self):
        self._cache = {}

    def _fetch_all(self):
        """Fetch and normalize all result entries from the results portal.
        Returns a list of tuples: (display_text, full_link, parts)
        where parts is the normalized split list of text elements.
        """
        html = requests.get(self.BASE_URL, timeout=20).text
        soup = BeautifulSoup(html, "lxml")
        wrapper = soup.find('div', class_='wrapper')
        if not wrapper:
            return []
        anchors = wrapper.find_all('a')
        entries = []
        for a in anchors:
            rel = a.get("href")
            name = a.get_text(strip=True)
            if not rel or not name:
                continue
            parts = [p.strip() for p in name.split('-')]
            # Expect like: [B.Tech, IV, II, R20, Regular, May, 2024]
            if len(parts) < 4:
                continue
            # Convert roman numerals for Year (idx 1) and Sem (idx 2) if present
            if parts[1].upper() in self.ROMAN:
                parts[1] = self.ROMAN[parts[1].upper()]
            if parts[2].upper() in self.ROMAN:
                parts[2] = self.ROMAN[parts[2].upper()]
            text_norm = "-".join(parts)
            full_link = urljoin(self.BASE_URL, rel)
            entries.append((text_norm, full_link, parts))
        return entries

    def get_results_link(self, collected):
        """Return a list of option display texts for given [reg, year, sem]."""
        if len(collected) < 3:
            return []
        reg, year, sem = collected[:3]
        key = (reg, year, sem)
        if key not in self._cache:
            all_entries = self._fetch_all()
            filtered = []
            for text, link, parts in all_entries:
                try:
                    if parts[1] == str(year) and parts[2] == str(sem) and reg in parts:
                        filtered.append((text, link))
                except Exception:
                    continue
            # Save filtered list
            self._cache[key] = filtered
        return [t for (t, _link) in self._cache[key]]

    def print_options(self, collected):
        """Given [reg, year, sem, option_index] return the final link URL."""
        if len(collected) < 4:
            return None
        reg, year, sem, idx = collected[:4]
        key = (reg, year, sem)
        if key not in self._cache:
            # Populate if not present
            self.get_results_link([reg, year, sem])
        items = self._cache.get(key, [])
        if not items:
            return None
        if not (0 <= int(idx) < len(items)):
            return None
        return items[int(idx)][1]
