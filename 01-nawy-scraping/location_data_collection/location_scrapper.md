# Nawy Locations Scraper Documentation

## Overview

This script scrapes **location descriptions from the Nawy real estate website** for multiple areas in Egypt.

The script uses:

* **Playwright** for browser automation and JavaScript rendering.
* **BeautifulSoup** for HTML parsing.
* **Asyncio** for asynchronous execution.

Because the target website loads content dynamically, Playwright renders the page in a **headless Chromium browser** before extracting the data.

The script collects descriptions from all locations and saves them into a single text file:

```
all_locations_descriptions.txt
```

---

# Architecture

## Technologies Used

| Technology            | Purpose                          |
| --------------------- | -------------------------------- |
| `asyncio`             | Handles asynchronous execution   |
| `playwright`          | Loads JavaScript-heavy pages     |
| `BeautifulSoup`       | Parses HTML and extracts text    |
| `Chromium (headless)` | Browser environment for scraping |

---

# Data Source

Base URL pattern:

```
https://www.nawy.com/area/{location}
```

Example:

```
https://www.nawy.com/area/new-cairo
https://www.nawy.com/area/maadi
```

Each page contains a **description section** inside the HTML container:

```
<div id="head">
```

---

# Locations List

The script iterates over a predefined list of **Egyptian real estate locations**, including:

* Alexandria
* New Cairo
* Sheikh Zayed
* North Coast
* Hurghada
* Ain Sokhna
* New Capital City
* Madinaty
* Heliopolis
* Downtown Cairo
* and many more.

The locations are stored in the `locations` list.

Example:

```python
locations = [
    "alexandria",
    "new-cairo",
    "maadi",
    "hurghada",
    "madinaty",
    ...
]
```

---

# Workflow

The script performs the following steps:

### 1. Launch Browser

Playwright launches a **headless Chromium browser**.

```python
browser = await p.chromium.launch(headless=True)
```

Headless mode is required for:

* Google Colab
* Linux servers
* Cloud environments

---

### 2. Open a Page Instance

A single browser page is reused for all locations.

```python
page = await browser.new_page()
```

This improves performance and reduces browser overhead.

---

### 3. Initialize Output File

Before scraping begins, the script creates or clears the output file.

```python
with open('all_locations_descriptions.txt', 'w') as f:
    f.write("NAWY LOCATIONS DESCRIPTIONS\n")
```

---

### 4. Iterate Over Locations

For each location:

1. Construct the page URL.
2. Navigate to the page.
3. Wait for the description container to load.

Example:

```python
url = f"https://www.nawy.com/area/{location}"
await page.goto(url)
await page.wait_for_selector("#head")
```

---

### 5. Expand Hidden Content

Some pages truncate text and show a **"See More"** button.

The script checks for the button and clicks it if necessary.

```python
show_more_btn = page.locator('button[data-test="show-more-less"]')
```

If visible:

```
Click -> Wait -> Load full text
```

---

### 6. Extract Page HTML

After the page is fully rendered:

```python
html_content = await page.content()
```

---

### 7. Parse HTML with BeautifulSoup

The script extracts the description text from:

```
<div id="head">
```

```python
soup = BeautifulSoup(html_content, 'html.parser')
head_container = soup.find('div', id='head')
```

---

### 8. Clean and Format Text

The text is extracted and cleaned:

```python
extracted_text = head_container.get_text(separator='\n', strip=True)
```

This removes HTML tags and formats paragraphs.

---

### 9. Save Results

The data is appended to the output file with a location header.

Example output format:

```
==================================================
LOCATION: NEW CAIRO
==================================================

New Cairo is one of the most prominent urban developments...
```

Code used:

```python
with open('all_locations_descriptions.txt', 'a') as f:
    f.write(f"\n\n{'='*50}\nLOCATION: {location.upper()}\n{'='*50}\n\n")
    f.write(extracted_text)
```

---

### 10. Error Handling

Each location is wrapped in a `try/except` block to prevent the script from stopping if one page fails.

```python
except Exception as e:
    print(f"[{location}] Error extracting data: {e}")
```

---

### 11. Close Browser

Once all locations are processed:

```python
await browser.close()
```

---

# Output Example

Example content of `all_locations_descriptions.txt`:

```
NAWY LOCATIONS DESCRIPTIONS

==================================================
LOCATION: NEW CAIRO
==================================================

New Cairo is one of the most modern urban communities...

==================================================
LOCATION: MAADI
==================================================

Maadi is known for its greenery and quiet residential areas...
```

---

# Running the Script

## In Jupyter Notebook

Run directly using:

```python
await extract_all_areas()
```

---

## As a Python Script

Replace the last line with:

```python
asyncio.run(extract_all_areas())
```

Then run:

```bash
python scraper.py
```

---

# Dependencies

Install required packages:

```bash
pip install playwright beautifulsoup4
```

Install Playwright browsers:

```bash
playwright install
```

---

# Performance Notes

Advantages of the current implementation:

* Uses **async Playwright**
* **Reuses a single browser page**
* Handles **dynamic JavaScript content**
* Handles **hidden text expansion**

---

# Possible Improvements

Future improvements could include:

### 1. Parallel Scraping

Run multiple pages concurrently using `asyncio.gather`.

---

### 2. Structured Data Output

Instead of `.txt`, store results as:

* JSON
* CSV
* Database

Example JSON structure:

```json
{
  "location": "new-cairo",
  "description": "New Cairo is one of the most modern..."
}
```

---

### 3. Logging

Replace `print()` with structured logging.

---

### 4. Retry Mechanism

Retry failed pages automatically.

---

### 5. Data Pipeline Integration

This scraper could feed data into:

* NLP pipelines
* Real estate recommendation systems
* Vector databases for RAG systems
