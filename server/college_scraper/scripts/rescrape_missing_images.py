import json
import os
import sys

# Add the parent directory to sys.path so we can import from scrapers
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

from server.college_scraper.scrapers.scrape_college import scrape_college

RAW_FILE = os.path.join(BASE_DIR, "data", "raw_colleges.json")
URLS_FILE = os.path.join(BASE_DIR, "data", "college_urls_final.json")
NORMALIZED_FILE = os.path.join(BASE_DIR, "data", "normalized_colleges.json")

def main():
    if not os.path.exists(RAW_FILE):
        print(f"Error: {RAW_FILE} not found.")
        return

    with open(RAW_FILE, "r", encoding="utf-8") as f:
        raw_colleges = json.load(f)
        
    with open(URLS_FILE, "r", encoding="utf-8") as f:
        urls_data = json.load(f)
        
    # Create a mapping of code -> url
    code_to_url = {item["collegeCode"]: item["url"] for item in urls_data if "collegeCode" in item and "url" in item}
    
    modified = False
    
    for item in raw_colleges:
        code = item.get("collegeCode")
        gallery = item.get("gallery", [])
        
        # Check if gallery is missing or empty
        if not gallery and code in code_to_url:
            url = code_to_url[code]
            print(f"Rescraping missing images for {code} -> {url}")
            try:
                scraped_data = scrape_college(url, code)
                new_gallery = scraped_data.get("gallery", [])
                
                if new_gallery:
                    item["gallery"] = new_gallery
                    modified = True
                    print(f"  ✅ Found {len(new_gallery)} images!")
                else:
                    print(f"  ❌ Still no images found.")
            except Exception as e:
                print(f"  ⚠️ Error scraping {code}: {e}")

    if modified:
        with open(RAW_FILE, "w", encoding="utf-8") as f:
            json.dump(raw_colleges, f, indent=2, ensure_ascii=False)
        print("Updated raw_colleges.json with new images.")
        print("Please run normalize.py and then updateCollegeEnhancements.js to sync the database.")
    else:
        print("No new images were found or updated.")

if __name__ == "__main__":
    main()
