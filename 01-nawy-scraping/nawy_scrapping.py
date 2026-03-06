from bs4 import BeautifulSoup
from playwright.async_api import async_playwright
import asyncio
import json
import pandas as pd

# Define the target URL for the Nawy property search page
# url = "https://www.nawy.com/search?page_number=1&category=property"
url = "https://www.nawy.com/search?category=property&property_types=21"


async def extract_properties():
    # Use Playwright to launch a Chromium browser instance for full JavaScript rendering
    async with async_playwright() as p:
        # Launch the browser in headless mode (Required for Google Colab/Linux servers)
        browser = await p.chromium.launch(headless=True)
        
        # Open a new browser page
        page = await browser.new_page()
        
        # Navigate to the target URL
        await page.goto(url)

        # Wait until the scrollable container (which holds the property listings) is loaded
        await page.wait_for_selector("div.sc-46853e00-0.dtcWKQ")

        # ================================
        # INFINITE SCROLL SIMULATION
        # ================================
        # Scroll down inside the scrollable container until no new properties load for 3 iterations
        previous_count = 0
        iteration = 1
        unchanged_count_strikes = 0

        while True:
            print(f"Scrolling iteration {iteration}...")
            await page.evaluate("""
                () => {
                    const container = document.querySelector('div.sc-46853e00-0.dtcWKQ');
                    if (container) {
                        // Scroll to the bottom of the container
                        container.scrollTo(0, container.scrollHeight);
                    }
                }
            """)
            await page.wait_for_timeout(5000)  # Wait 5 seconds to allow content to load
            
            # Count the number of property cards currently loaded in the DOM
            current_count = await page.locator("div.cover-image").count()
            print(f"Properties loaded so far: {current_count}")

            # Check if new items were loaded
            if current_count == previous_count:
                unchanged_count_strikes += 1
                print(f"No new properties loaded. Strike {unchanged_count_strikes}/3")
            else:
                unchanged_count_strikes = 0  # Reset the strike counter if new items appeared

            # Break the loop if no new items were loaded for 3 continuous iterations
            if unchanged_count_strikes >= 3:
                print("All properties loaded (count unchanged for 3 iterations). Stopping scroll.")
                break
                
            previous_count = current_count
            iteration += 1

        # ================================
        # EXTRACT FULL PAGE HTML AFTER SCROLLING
        # ================================
        # After scrolling, retrieve the complete page HTML (now includes dynamically loaded content)
        html_content = await page.content()
        
        # Close the browser once we have the HTML
        await browser.close()
        
    return html_content

# In Jupyter, we can directly await the function to run it
html_content = await extract_properties()

# Parse the HTML using BeautifulSoup for easier data extraction
soup = BeautifulSoup(html_content, 'html.parser')

# List to hold all extracted property dictionaries
all_properties_data = []

# Find all cover images, then find their parent <a> tag to use as the root for each property card
cover_images = soup.find_all('div', class_='cover-image')

for cover in cover_images:
    card = cover.find_parent('a')
    if not card:
        continue
        
    extracted_data = {}

    # 1. URL Path
    if 'href' in card.attrs:
        extracted_data['url_path'] = f"https://www.nawy.com{card['href']}"
    else:
        extracted_data['url_path'] = None

    # 2. Tag (e.g., "Resale")
    tag_elem = card.find('div', class_='tag')
    extracted_data['tag'] = tag_elem.get_text(strip=True) if tag_elem else None

    # 3. Cover Image URL
    cover_image = card.find('img', alt='Cover Image')
    extracted_data['cover_image'] = cover_image['src'] if cover_image else None

    # 4. Location
    area_elem = card.find('div', class_='area')
    extracted_data['location'] = area_elem.get_text(strip=True) if area_elem else None

    # 5. Property Name & Compound
    name_elem = card.find('div', class_='name')
    extracted_data['property_name'] = name_elem.get_text(strip=True) if name_elem else None

    # 6. Developer Logo URL
    logo_image = card.find('img', alt='logo')
    extracted_data['developer_logo'] = logo_image['src'] if logo_image else None

    # 7. Full Title/Description
    title_elem = card.find('h2')
    extracted_data['title'] = title_elem.get_text(strip=True) if title_elem else None

    # Description
    desc_elem = card.select_one('h2.sc-4b9910fd-0.hHfZHY')
    extracted_data['description'] = desc_elem.get_text(strip=True) if desc_elem else None

    # 8. Property Features (Area, Beds, Baths)
    values = card.find_all('span', class_='value')
    labels = card.find_all('span', class_='label')

    for val, lbl in zip(values, labels):
        feature_name = lbl.get_text(strip=True)
        feature_value = val.get_text(strip=True)
        extracted_data[feature_name] = feature_value

    # 9. Payment Plan
    down_payment_elem = card.find('span', class_='down-payment')
    if down_payment_elem:
        raw_payment = down_payment_elem.get_text(separator=' ', strip=True)
        extracted_data['payment_plan'] = " ".join(raw_payment.split())
    else:
        extracted_data['payment_plan'] = None

    # 10. Price
    price_elem = card.find('span', class_='price')
    if price_elem:
        raw_price = price_elem.get_text(separator=' ', strip=True)
        extracted_data['price'] = " ".join(raw_price.split())
    else:
        extracted_data['price'] = None

    # Append the extracted dictionary to our list
    all_properties_data.append(extracted_data)

# Convert the list of dictionaries into a pandas DataFrame
df = pd.DataFrame(all_properties_data)

# Display the first few rows in the notebook
# print(df.head())

# Save the DataFrame to a CSV file
df.to_csv('nawy_properties.csv', index=False)
print("\nData successfully saved to nawy_properties.csv")