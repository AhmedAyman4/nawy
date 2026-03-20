import asyncio
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

locations = [
    "others",
    "alexandria",
    "6th-settlement",
    "northern-expansion",
    "el-gouna",
    "giza",
    "north-coast-sahel",
    "el-shorouk",
    "el-choueifat",
    "new-zayed",
    "el-sheikh-zayed",
    "al-dabaa",
    "new-capital-city",
    "al-alamein",
    "ain-sokhna",
    "hurghada",
    "new-cairo",
    "old-cairo",
    "central-cairo",
    "el-lotus",
    "south-investors",
    "north-investors",
    "maadi",
    "port-said",
    "south-new-cairo",
    "golden-square",
    "october-gardens",
    "new-capital-gardens",
    "ras-el-hekma",
    "ras-sudr",
    "new-sphinx",
    "sahl-hasheesh",
    "somabay",
    "sidi-heneish",
    "sidi-abdel-rahman",
    "alam-al-roum",
    "ghazala-bay",
    "6th-of-october-city",
    "mostakbal-city",
    "madinaty",
    "mokattam",
    "makadi",
    "new-mansoura",
    "new-heliopolis",
    "heliopolis",
    "downtown-cairo"
]

async def extract_all_areas():
    # Use Playwright to launch a Chromium browser instance for full JavaScript rendering
    async with async_playwright() as p:
        # Launch the browser in headless mode (Required for Google Colab/Linux servers)
        browser = await p.chromium.launch(headless=True)
        # Open a single browser page to reuse for all locations
        page = await browser.new_page()

        # Initialize/clear the master text file before starting
        with open('all_locations_descriptions.txt', 'w', encoding='utf-8') as f:
            f.write("NAWY LOCATIONS DESCRIPTIONS\n")

        for location in locations:
            url = f"https://www.nawy.com/area/{location}"
            print(f"\n--- Processing: {location} ---")

            try:
                # Navigate to the target URL
                await page.goto(url)

                # Wait until the 'head' container is loaded, with a timeout of 10 seconds to avoid hanging on bad pages
                await page.wait_for_selector("#head", timeout=10000)

                # Look for the 'See More' button to expand truncated text
                try:
                    show_more_btn = page.locator('button[data-test="show-more-less"]')

                    if await show_more_btn.is_visible(timeout=3000):
                        btn_text = await show_more_btn.text_content()
                        if btn_text and "More" in btn_text:
                            print(f"[{location}] Clicking 'See More' to expand the text...")
                            await show_more_btn.click()
                            await page.wait_for_timeout(1500)
                except Exception:
                    # Ignore if no button is found, it just means the text isn't truncated
                    pass

                # Extract the full HTML content for this page
                html_content = await page.content()

                # Parse the HTML using BeautifulSoup
                soup = BeautifulSoup(html_content, 'html.parser')
                head_container = soup.find('div', id='head')

                if head_container:
                    # Extract text and clean it
                    extracted_text = head_container.get_text(separator='\n', strip=True)

                    # Append the extracted text to the single master file
                    with open('all_locations_descriptions.txt', 'a', encoding='utf-8') as f:
                        f.write(f"\n\n{'='*50}\nLOCATION: {location.upper()}\n{'='*50}\n\n")
                        f.write(extracted_text)
                        
                    print(f"[{location}] Successfully appended to all_locations_descriptions.txt")
                else:
                    print(f"[{location}] Could not find the target container with id='head'.")

            except Exception as e:
                print(f"[{location}] Error extracting data: {e}")

        # Close the browser once all locations are processed
        await browser.close()
        print("\nAll locations processed!")

# In Jupyter, we can directly await the function to run it.
# (Note: If running as a standard python script outside Jupyter, use `asyncio.run(extract_all_areas())` instead)
await extract_all_areas()