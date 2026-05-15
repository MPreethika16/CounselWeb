import json
import os
import re
import time
from difflib import SequenceMatcher

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

CODES_FILE = os.path.join(BASE_DIR, "data", "college_codes.json")
OUTPUT_FILE = os.path.join(BASE_DIR, "data", "college_urls.json")
REVIEW_FILE = os.path.join(BASE_DIR, "data", "college_urls_review.json")

DIRECTORY_URL = "https://collegedunia.com/engineering/telangana-colleges"

# Thresholds
AUTO_ACCEPT_SCORE = 0.90
PLACE_BONUS = 0.10


def clean_text(text):
    if not text:
        return ""

    text = text.upper()
    text = text.replace("&", "AND")

    # Remove brackets content
    text = re.sub(r"\[[^\]]*\]", " ", text)
    text = re.sub(r"\([^\)]*\)", " ", text)

    # Replace abbreviations
    replacements = {
        "INSTT": "INSTITUTE",
        "INST": "INSTITUTE",
        "ENGG": "ENGINEERING",
        "TECH": "TECHNOLOGY",
        "SCI": "SCIENCE",
        "COLL": "COLLEGE",
        "EDNL": "EDUCATIONAL",
        "GRP": "GROUP",
        "MGMT": "MANAGEMENT",
    }

    for old, new in replacements.items():
        text = re.sub(rf"\b{old}\b", new, text)

    # Remove common filler words
    remove_words = [
        "AUTONOMOUS",
        "HYDERABAD",
        "SECUNDERABAD",
        "TELANGANA",
        "RANGAREDDY",
        "WARANGAL",
        "KHAMMAM",
        "KARIMNAGAR",
        "NALGONDA",
        "SANGAREDDY",
    ]

    for word in remove_words:
        text = re.sub(rf"\b{word}\b", " ", text)

    text = re.sub(r"[^A-Z0-9 ]", " ", text)
    text = re.sub(r"\s+", " ", text)

    return text.strip()


def similarity(a, b):
    return SequenceMatcher(None, clean_text(a), clean_text(b)).ratio()


def get_bracket_code(text):
    match = re.search(r"\[([A-Z0-9 ]+)\]", text.upper())
    if match:
        return match.group(1).strip()
    return ""


def code_match(college_code, item_name, url):
    code = college_code.upper().strip()

    bracket_code = get_bracket_code(item_name)
    if bracket_code == code:
        return True

    url_lower = url.lower()

    if f"-{code.lower()}-" in url_lower:
        return True

    if url_lower.endswith(f"-{code.lower()}"):
        return True

    return False


def place_match(college_place, item_name):
    if not college_place:
        return False

    place = clean_text(college_place)
    name = clean_text(item_name)

    return place and place in name


def create_driver():
    options = Options()
    options.add_argument("--window-size=1366,768")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    return webdriver.Chrome(options=options)


def extract_discovered_links(driver):
    discovered = []

    bad_words = [
        "pharmacy",
        "medical",
        "nursing",
        "mba",
        "management",
        "law",
        "design",
    ]

    links = driver.find_elements(By.TAG_NAME, "a")

    for link in links:
        text = link.text.strip()
        href = link.get_attribute("href")

        if not text or not href:
            continue

        if "/college/" not in href:
            continue

        if "collegedunia.com" not in href:
            continue

        lower = f"{text} {href}".lower()

        if any(word in lower for word in bad_words):
            continue

        discovered.append({
            "name": text,
            "url": href
        })

    # Remove duplicate URLs
    unique = {}
    for item in discovered:
        unique[item["url"]] = item

    return list(unique.values())


def choose_best_match(college, discovered):
    college_code = college["collegeCode"]
    college_name = college["name"]
    college_place = college.get("place", "")

    best_match = None
    best_score = 0

    for item in discovered:
        name_score = similarity(college_name, item["name"])
        total_score = name_score

        if place_match(college_place, item["name"]):
            total_score += PLACE_BONUS

        if total_score > best_score:
            best_score = total_score
            best_match = item

    if not best_match:
        return {
            "matchedName": "",
            "url": "",
            "matchScore": 0,
            "matchType": "NO_MATCH",
            "accepted": False
        }

    has_code = code_match(
        college_code,
        best_match["name"],
        best_match["url"]
    )

    # Priority 1: code match
    if has_code and best_score >= 0.65:
        return {
            "matchedName": best_match["name"],
            "url": best_match["url"],
            "matchScore": round(best_score, 2),
            "matchType": "CODE_MATCH",
            "accepted": True
        }

    # Priority 2: very high confidence
    if best_score >= AUTO_ACCEPT_SCORE:
        return {
            "matchedName": best_match["name"],
            "url": best_match["url"],
            "matchScore": round(best_score, 2),
            "matchType": "HIGH_CONFIDENCE_NAME_MATCH",
            "accepted": True
        }

    # Needs review
    return {
        "matchedName": best_match["name"],
        "url": "",
        "suggestedUrl": best_match["url"],
        "matchScore": round(best_score, 2),
        "matchType": "NEEDS_REVIEW",
        "accepted": False
    }


def main():
    with open(CODES_FILE, "r", encoding="utf-8") as f:
        college_codes = json.load(f)

    driver = create_driver()

    try:
        driver.get(DIRECTORY_URL)
        time.sleep(10)

        for _ in range(20):
            driver.execute_script(
                "window.scrollTo(0, document.body.scrollHeight);"
            )
            time.sleep(2)

        discovered = extract_discovered_links(driver)

        final_urls = []
        review_urls = []

        for college in college_codes:
            match = choose_best_match(college, discovered)

            final_item = {
                "collegeCode": college["collegeCode"],
                "name": college["name"],
                "place": college.get("place", ""),
                "district": college.get("district", ""),
                "matchedName": match["matchedName"],
                "url": match["url"],
                "matchScore": match["matchScore"],
                "matchType": match["matchType"],
                "accepted": match["accepted"]
            }

            final_urls.append(final_item)

            if not match["accepted"]:
                review_urls.append({
                    "collegeCode": college["collegeCode"],
                    "name": college["name"],
                    "place": college.get("place", ""),
                    "district": college.get("district", ""),
                    "suggestedName": match["matchedName"],
                    "suggestedUrl": match.get("suggestedUrl", ""),
                    "matchScore": match["matchScore"],
                    "matchType": match["matchType"]
                })

        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(final_urls, f, indent=2, ensure_ascii=False)

        with open(REVIEW_FILE, "w", encoding="utf-8") as f:
            json.dump(review_urls, f, indent=2, ensure_ascii=False)

        accepted_count = len([x for x in final_urls if x["accepted"]])
        review_count = len(review_urls)

        print(f"Discovered links: {len(discovered)}")
        print(f"Accepted matches: {accepted_count}")
        print(f"Needs review: {review_count}")
        print(f"Saved to: {OUTPUT_FILE}")
        print(f"Review file: {REVIEW_FILE}")

    finally:
        driver.quit()


if __name__ == "__main__":
    main()