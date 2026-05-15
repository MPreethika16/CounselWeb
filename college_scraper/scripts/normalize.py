import json
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

INPUT_FILE = os.path.join(BASE_DIR, "data", "raw_colleges.json")
OUTPUT_FILE = os.path.join(BASE_DIR, "data", "normalized_colleges.json")


def normalize_college(raw):
    placements = raw.get("placements", {})
    facilities = raw.get("facilities", {})
    ranking = raw.get("ranking", {})

    return {
        "collegeCode": raw.get("collegeCode"),

        "placements": {
            "avgPackage": placements.get("avgPackage"),
            "highestPackage": placements.get("highestPackage"),
            "medianPackage": placements.get("medianPackage")
        },

        "facilities": {
            "hostel": facilities.get("hostel", False),
            "sports": facilities.get("sports", False),
            "library": facilities.get("library", False),
            "wifi": facilities.get("wifi", False),
            "labs": facilities.get("labs", False),
            "canteen": facilities.get("canteen", False),
            "transport": facilities.get("transport", False),
            "ncc": facilities.get("ncc", False),
            "nss": facilities.get("nss", False),
            "events": facilities.get("events", False)
        },

        "ranking": {
            "nba": ranking.get("nba", False),
            "naac": ranking.get("naac"),
            "rankingText": ranking.get("rankingText", [])
        },

        "reviews": raw.get("reviews", []),
        "gallery": list(dict.fromkeys(
            raw.get("gallery") if raw.get("gallery") else
            ([raw.get("heroImage")] if raw.get("heroImage") else
            ([raw.get("metaImage")] if raw.get("metaImage") else []))
        )),
        "sourceUrl": raw.get("sourceUrl"),
        "lastScrapedAt": None
    }


def main():
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        raw_colleges = json.load(f)

    normalized = []

    for college in raw_colleges:
        if "error" in college:
            print(f"Skipping {college.get('collegeCode')} due to scrape error.")
            continue

        normalized.append(normalize_college(college))

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(normalized, f, indent=2, ensure_ascii=False)

    print(f"Normalized data saved to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()