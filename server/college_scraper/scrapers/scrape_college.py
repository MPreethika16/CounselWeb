from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
import time
import re


def clean_list(lst, limit=10):
    if not lst:
        return []

    cleaned = []

    for item in lst:
        if item not in cleaned:
            cleaned.append(item)

    return cleaned[:limit]


def extract_package(lines):
    highest = []
    average = []
    median = []

    for line in lines:
        l = line.lower()

        if not any(x in l for x in ["lpa", "lakhs", "lacs"]):
            continue

        nums = re.findall(r"\d+\.?\d*", line)

        for num in nums:
            val = float(num)

            if val > 60 or val < 1:
                continue

            if "highest" in l:
                highest.append(val)
            elif "average" in l:
                average.append(val)
            elif "median" in l:
                median.append(val)

    return {
        "highestPackage": max(highest) if highest else None,
        "avgPackage": max(average) if average else None,
        "medianPackage": max(median) if median else None
    }


def create_driver():
    options = Options()

    # Keep visible while testing.
    # Later you can uncomment headless mode.
    # options.add_argument("--headless=new")

    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--window-size=1366,768")

    return webdriver.Chrome(options=options)


def get_page_lines(driver):
    body = driver.find_element(By.TAG_NAME, "body").text
    return body.split("\n")


def scrape_college(url, college_code):
    driver = create_driver()

    data = {
        "collegeCode": college_code,
        "sourceUrl": url,
        "name": "",
        "basicInfo": {},
        "courses": [],
        "placements": {},
        "cutoffText": [],
        "reviews": [],
        "facilities": {
            "hostel": False,
            "sports": False,
            "library": False,
            "wifi": False,
            "labs": False,
            "canteen": False,
            "transport": False,
            "ncc": False,
            "nss": False,
            "events": False
        },
        "ranking": {
            "nba": False,
            "naac": None,
            "rankingText": []
        },
        "gallery": []
    }

    try:
        # ---------- MAIN ----------
        driver.get(url)
        time.sleep(5)

        data["name"] = driver.title.split(":")[0].strip()

        lines = get_page_lines(driver)
        full_text = " ".join(lines).lower()

        # ---------- BASIC INFO ----------
        for line in lines:
            l = line.lower()

            if "estd" in l and len(line) < 40:
                data["basicInfo"]["estd"] = line.strip()

            if "hyderabad" in l:
                data["basicInfo"]["location"] = "Hyderabad"

        data["basicInfo"]["type"] = "Engineering College"

        # ---------- NAAC + NBA ----------
        if "nba" in full_text and "accredit" in full_text:
            data["ranking"]["nba"] = True

        naac_match = re.search(r"naac\s+grade\s+[a-z+]+", full_text, re.IGNORECASE)
        if naac_match:
            data["ranking"]["naac"] = naac_match.group(0).upper()

        # ---------- FACILITIES ----------
        data["facilities"]["hostel"] = "hostel" in full_text
        data["facilities"]["sports"] = "sports" in full_text
        data["facilities"]["library"] = "library" in full_text
        data["facilities"]["wifi"] = "wifi" in full_text or "wi-fi" in full_text
        data["facilities"]["labs"] = "laboratory" in full_text or "labs" in full_text
        data["facilities"]["canteen"] = "canteen" in full_text
        data["facilities"]["transport"] = "transport" in full_text
        data["facilities"]["ncc"] = "ncc" in full_text
        data["facilities"]["nss"] = "nss" in full_text
        data["facilities"]["events"] = "event" in full_text or "fest" in full_text

        # ---------- RANKING TEXT ----------
        for line in lines:
            if "ranking" in line.lower() and 10 < len(line) < 120:
                data["ranking"]["rankingText"].append(line.strip())

        data["ranking"]["rankingText"] = clean_list(
            data["ranking"]["rankingText"], limit=5
        )

        # ---------- COURSES ----------
        driver.get(url + "/courses-fees")
        time.sleep(4)

        rows = driver.find_elements(By.TAG_NAME, "tr")
        seen_courses = set()

        for row in rows:
            row_lines = row.text.split("\n")

            course = ""
            fee = ""

            for line in row_lines:
                l = line.lower()

                if any(x in l for x in ["b.tech", "m.tech", "mba", "mca", "b.sc", "m.sc"]):
                    course = line.strip()

                if ("₹" in line or "lakhs" in l) and "lpa" not in l:
                    fee = line.strip()

            if course and course not in seen_courses:
                seen_courses.add(course)
                data["courses"].append({
                    "course": course,
                    "fees": fee
                })

        data["courses"] = data["courses"][:10]

        # ---------- PLACEMENTS ----------
        driver.get(url + "/placement")
        time.sleep(4)

        placement_lines = get_page_lines(driver)
        data["placements"] = extract_package(placement_lines)

        # ---------- CUTOFF TEXT ----------
        driver.get(url + "/cutoff")
        time.sleep(4)

        cutoff_lines = get_page_lines(driver)

        for line in cutoff_lines:
            l = line.lower()

            if "cutoff" in l:
                if any(x in l for x in ["reply", "pls", "download", "report", "summary"]):
                    continue

                if 20 < len(line) < 100:
                    data["cutoffText"].append(line.strip())

        data["cutoffText"] = clean_list(data["cutoffText"], limit=5)

        # ---------- REVIEWS ----------
        driver.get(url + "/reviews")
        time.sleep(4)

        review_lines = get_page_lines(driver)

        for line in review_lines:
            if 120 < len(line) < 400:
                data["reviews"].append(line.strip())

        data["reviews"] = clean_list(data["reviews"], limit=5)

        # ---------- GALLERY ----------
        driver.get(url + "/gallery")
        time.sleep(5)

        images = driver.execute_script(r"""
        const urls = [];
        // Meta images
        const ogImage = document.querySelector('meta[property="og:image"]');
        if (ogImage && ogImage.content) urls.push(ogImage.content);
        const twImage = document.querySelector('meta[name="twitter:image"]');
        if (twImage && twImage.content) urls.push(twImage.content);

        // Normal image tags
        document.querySelectorAll('img').forEach(img => {
            if (img.src) urls.push(img.src);
            if (img.currentSrc) urls.push(img.currentSrc);
            if (img.getAttribute('data-src')) urls.push(img.getAttribute('data-src'));
            if (img.getAttribute('data-original')) urls.push(img.getAttribute('data-original'));
        });

        // Background images
        document.querySelectorAll('*').forEach(el => {
            const bg = el.style.backgroundImage || window.getComputedStyle(el).backgroundImage;
            if (bg && bg !== 'none') {
                const match = bg.match(/url\(['"]?(.*?)['"]?\)/);
                if (match && match[1]) urls.push(match[1]);
            }
        });
        return urls;
        """)

        valid_exts = [".jpg", ".jpeg", ".png", ".webp"]
        
        for src in images:
            if not src or not src.startswith("http"):
                continue
                
            s = src.lower()
            
            # Reject unwanted images
            if "logo" in s or "icon" in s or ".svg" in s or "base64" in s or "pixel" in s or "avatar" in s:
                continue
                
            # Accept valid formats or specific collegedunia static/review photos
            is_valid_ext = any(ext in s for ext in valid_exts)
            is_static = "image-static.collegedunia.com" in s
            is_review = "reviewphotos" in s
            
            if is_valid_ext or is_static or is_review:
                data["gallery"].append(src)

        data["gallery"] = clean_list(data["gallery"], limit=8)

        return data

    except Exception as error:
        return {
            "collegeCode": college_code,
            "sourceUrl": url,
            "error": str(error)
        }

    finally:
        driver.quit()