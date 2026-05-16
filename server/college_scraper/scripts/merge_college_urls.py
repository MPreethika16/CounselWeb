import json
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

AUTO_FILE = os.path.join(BASE_DIR, "data", "college_urls.json")
REVIEW_FILE = os.path.join(BASE_DIR, "data", "college_urls_review.json")
OUTPUT_FILE = os.path.join(BASE_DIR, "data", "college_urls_final.json")


def load_json(path):
    if not os.path.exists(path):
        return []

    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def main():
    auto_data = load_json(AUTO_FILE)
    review_data = load_json(REVIEW_FILE)

    merged = {}

    # 1. Add all accepted auto matches
    for item in auto_data:
        if item.get("accepted") and item.get("url"):
            merged[item["collegeCode"]] = {
                "collegeCode": item["collegeCode"],
                "name": item["name"],
                "url": item["url"]
            }

    # 2. Override with manually reviewed entries
    for item in review_data:
        url = item.get("url") or item.get("suggestedUrl")

        if url:
            merged[item["collegeCode"]] = {
                "collegeCode": item["collegeCode"],
                "name": item["name"],
                "url": url
            }

    # 3. Convert to sorted list
    final_list = sorted(
        merged.values(),
        key=lambda x: x["collegeCode"]
    )

    # 4. Save
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(final_list, f, indent=2, ensure_ascii=False)

    print(f"Final colleges: {len(final_list)}")
    print(f"Saved to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
    