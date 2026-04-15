import os

links_file = r"e:\Projects\nawy\01-nawy-scraping\data\locations-links.txt"
data_file = r"e:\Projects\nawy\01-nawy-scraping\data\locations_compounds_and_blogs_data.txt"
output_file = r"e:\Projects\nawy\01-nawy-scraping\data\locations_compounds_and_blogs_data_new.txt"

# 1. Load links
links_map = {}
with open(links_file, 'r', encoding='utf-8') as f:
    for line in f:
        url = line.strip()
        if not url:
            continue
        # Extract slug
        slug = url.split('/')[-1]
        location_key = slug.upper()
        links_map[location_key] = url

print(f"Loaded {len(links_map)} links.")

# 2. Process data file
with open(data_file, 'r', encoding='utf-8') as f_in, open(output_file, 'w', encoding='utf-8') as f_out:
    for line in f_in:
        stripped = line.strip()
        if stripped.startswith("LOCATION: "):
            location_name = stripped[len("LOCATION: "):].strip()
            url = links_map.get(location_name)
            if url:
                f_out.write("============================================================\n")
                f_out.write(f"URL: {url}\n")
                f_out.write("============================================================\n")
            else:
                print(f"Warning: No URL found for location '{location_name}'")
        f_out.write(line)

print("Processing complete.")
