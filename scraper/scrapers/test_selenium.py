from selenium import webdriver

driver = webdriver.Chrome()

driver.get("https://www.google.com")

print("Browser opened successfully ✅")

input("Press Enter to close...")
driver.quit()