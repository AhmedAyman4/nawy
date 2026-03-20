# Nawy Property Scraper Documentation

## Overview

This Python script scrapes property listings from Nawy.com using Playwright for browser automation and BeautifulSoup for HTML parsing. It handles infinite scroll pagination and extracts comprehensive property data into a CSV file.

## Dependencies

```python
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright
import asyncio
import json
import pandas as pd
```

### Required Libraries
- **BeautifulSoup4**: HTML parsing and data extraction
- **Playwright**: Browser automation for JavaScript-rendered content
- **asyncio**: Asynchronous operations
- **pandas**: Data manipulation and CSV export

### Installation

```bash
pip install beautifulsoup4 playwright pandas
playwright install chromium
```

## Configuration

### Target URL

```python
url = "https://www.nawy.com/search?category=property&property_types=21"
```

**URL Parameters:**
- `category=property`: Filters for property listings
- `property_types=21`: Specific property type filter (appears to be for villas based on context)

## Core Functions

### `extract_properties()`

**Purpose:** Launches a headless browser, navigates to the target page, simulates infinite scroll, and extracts the fully loaded HTML.

**Returns:** `str` - Complete HTML content after all properties are loaded

#### Process Flow

1. **Browser Initialization**
   ```python
   async with async_playwright() as p:
       browser = await p.chromium.launch(headless=True)
       page = await browser.new_page()
   ```
   - Launches Chromium in headless mode (required for server environments)
   - Creates a new browser page instance

2. **Page Navigation**
   ```python
   await page.goto(url)
   await page.wait_for_selector("div.sc-46853e00-0.dtcWKQ")
   ```
   - Navigates to the target URL
   - Waits for the scrollable container to load

3. **Infinite Scroll Simulation**
   ```python
   while True:
       await page.evaluate("""
           () => {
               const container = document.querySelector('div.sc-46853e00-0.dtcWKQ');
               if (container) {
                   container.scrollTo(0, container.scrollHeight);
               }
           }
       """)
       await page.wait_for_timeout(5000)
   ```
   
   **Scroll Logic:**
   - Scrolls to bottom of container `div.sc-46853e00-0.dtcWKQ`
   - Waits 5 seconds for new content to load
   - Counts currently loaded property cards
   - Tracks consecutive iterations with no new properties
   - Stops after 3 consecutive iterations without new content

4. **HTML Extraction**
   ```python
   html_content = await page.content()
   await browser.close()
   ```
   - Retrieves complete page HTML after all scrolling
   - Closes browser to free resources

## Data Extraction

### HTML Parsing

```python
soup = BeautifulSoup(html_content, 'html.parser')
cover_images = soup.find_all('div', class_='cover-image')
```

Each property card is identified by its cover image, then traversed to the parent `<a>` tag.

### Extracted Fields

| Field | CSS Selector | Description |
|-------|-------------|-------------|
| `url_path` | `a[href]` | Full URL to property detail page |
| `tag` | `div.tag` | Property tag (e.g., "Resale", "New") |
| `cover_image` | `img[alt='Cover Image']` | URL of property cover image |
| `location` | `div.area` | Geographic location/area |
| `property_name` | `div.name` | Name of the property/compound |
| `developer_logo` | `img[alt='logo']` | Developer company logo URL |
| `title` | `h2` | Full property title |
| `description` | `h2.sc-4b9910fd-0.hHfZHY` | Property description |
| Dynamic features | `span.value` + `span.label` | Area, Beds, Baths, etc. |
| `payment_plan` | `span.down-payment` | Payment terms and down payment |
| `price` | `span.price` | Property price |

### Dynamic Feature Extraction

```python
values = card.find_all('span', class_='value')
labels = card.find_all('span', class_='label')

for val, lbl in zip(values, labels):
    feature_name = lbl.get_text(strip=True)
    feature_value = val.get_text(strip=True)
    extracted_data[feature_name] = feature_value
```

This loop dynamically creates columns for property features like:
- Area (square meters/feet)
- Bedrooms
- Bathrooms
- Other property-specific attributes

## Output

### DataFrame Creation

```python
df = pd.DataFrame(all_properties_data)
```

Converts the list of dictionaries into a structured pandas DataFrame.

### CSV Export

```python
df.to_csv('nawy_properties.csv', index=False)
```

**Output File:** `nawy_properties.csv`
- No index column included
- UTF-8 encoding by default
- All extracted fields as columns

## Usage Example

### In Jupyter Notebook

```python
# Direct await in notebook environment
html_content = await extract_properties()

# Process the data
soup = BeautifulSoup(html_content, 'html.parser')
# ... extraction logic ...

# Save results
df.to_csv('nawy_properties.csv', index=False)
print("\nData successfully saved to nawy_properties.csv")
```

### In Standard Python Script

```python
async def main():
    html_content = await extract_properties()
    # ... rest of the extraction logic ...
    
if __name__ == "__main__":
    asyncio.run(main())
```

## Key Features

### 1. Infinite Scroll Handling
- Automatically scrolls through all available properties
- Intelligent stop condition (3 consecutive unchanged iterations)
- Configurable wait time between scrolls (5 seconds)

### 2. Robust Data Extraction
- Handles missing fields gracefully (returns `None`)
- Dynamic feature extraction adapts to varying property attributes
- Text normalization with `strip=True` and space cleaning

### 3. Full JavaScript Support
- Playwright renders JavaScript-heavy pages
- Captures dynamically loaded content
- Headless mode for server compatibility

## Limitations & Considerations

### Performance
- 5-second wait between scroll iterations (can be adjusted)
- Full page load required before extraction begins
- Memory usage increases with number of properties

### Reliability
- Depends on specific CSS class names (e.g., `sc-46853e00-0.dtcWKQ`)
- Website structure changes will break the scraper
- No error handling for network failures

### Ethical Considerations
- Respect robots.txt and terms of service
- Implement rate limiting for production use
- Consider API alternatives if available

## Troubleshooting

### Common Issues

**"Selector not found" errors:**
- Website structure may have changed
- Update CSS selectors to match current HTML

**Incomplete data:**
- Increase wait timeout from 5000ms
- Adjust strike counter threshold (currently 3)

**Memory issues:**
- Process data in batches
- Clear browser cache between runs

**Headless mode failures:**
- Try `headless=False` for debugging
- Ensure Chromium is properly installed

## Customization

### Modify Scroll Behavior

```python
# Increase wait time between scrolls
await page.wait_for_timeout(7000)  # 7 seconds

# Change strike threshold
if unchanged_count_strikes >= 5:  # Stop after 5 unchanged iterations
```

### Filter Different Property Types

```python
# Change property_types parameter
url = "https://www.nawy.com/search?category=property&property_types=15"
```

### Add Additional Fields

```python
# Extract new field
new_field = card.find('div', class_='new-class-name')
extracted_data['new_field'] = new_field.get_text(strip=True) if new_field else None
```

## Best Practices

1. **Add delays:** Implement random delays to avoid detection
2. **User agents:** Rotate user agents for production scraping
3. **Error handling:** Wrap in try-except blocks
4. **Logging:** Add logging for debugging and monitoring
5. **Data validation:** Validate extracted data before saving
6. **Backups:** Save checkpoints during long scraping sessions

## License & Legal

Ensure compliance with:
- Nawy.com Terms of Service
- Local web scraping regulations
- Data protection laws (GDPR, etc.)
- robots.txt directives

---

**Last Updated:** March 2026  
**Script Version:** 1.0  
**Compatible With:** Playwright 1.x, BeautifulSoup4, Pandas 2.x
