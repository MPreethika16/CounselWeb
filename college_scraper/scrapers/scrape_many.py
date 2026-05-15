import json
import os
from scrape_college import scrape_college


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

URLS_FILE = os.path.join(BASE_DIR, "data", "college_urls_final.json")
OUTPUT_FILE = os.path.join(BASE_DIR, "data", "raw_colleges.json")


def main():
    with open(URLS_FILE, "r", encoding="utf-8") as file:
        colleges = json.load(file)

    results = []

    for college in colleges:
        college_code = college.get("collegeCode")
        url = college.get("url")

        if not college_code or not url:
            print("Skipping invalid college:", college)
            continue
        

        print(f"Scraping {college_code}...")

        scraped_data = scrape_college(url, college_code)

        results.append(scraped_data)

        if "error" in scraped_data:
            print(f"Failed: {college_code}")
            print(scraped_data["error"])
        else:
            print(f"Done: {college_code}")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as file:
        json.dump(results, file, indent=2, ensure_ascii=False)

    print(f"Saved raw data to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()