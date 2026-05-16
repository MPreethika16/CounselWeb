import json
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

INPUT_FILE = os.path.join(BASE_DIR, "data", "college_codes.json")
OUTPUT_FILE = os.path.join(BASE_DIR, "data", "college_urls.json")


def main():
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        colleges = json.load(f)

    urls = []

    for college in colleges:
        urls.append({
            "collegeCode": college["collegeCode"],
            "name": college["name"],
            "url": ""
        })

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(urls, f, indent=2, ensure_ascii=False)

    print(f"Created template: {OUTPUT_FILE}")
    print(f"Total colleges: {len(urls)}")


if __name__ == "__main__":
    main()