# Quick Start: Adding Real NYC Crime Data

## Step 1: Download the Data

1. **Go to NYC Open Data:**
   - Visit: https://data.cityofnewyork.us/Public-Safety/NYPD-Complaint-Data-Historic/qgea-i56i

2. **Export the Data:**
   - Click the **"Export"** button (top right)
   - Select **"CSV"**
   - **Optional:** Filter to last 6-12 months to keep file size manageable
     - Click "Filter" → Add filter: `CMPLNT_FR_DT >= '2024-01-01'`
   - Save as `nyc_crime_data.csv`

3. **Move the File:**
   - Place `nyc_crime_data.csv` in the `data/raw/` folder

## Step 2: Process the Data

Run the script from the project root:

```powershell
py scripts/generate_risk_polygons.py --input nyc_crime_data.csv --output-polygons risk_polygons_nyc.geojson
```

This will:
- ✅ Load the CSV file
- ✅ Extract coordinates (handles various column name formats)
- ✅ Filter by nighttime hours (8 PM - 5 AM)
- ✅ Filter by relevant crime categories
- ✅ Cluster crime points using DBSCAN
- ✅ Generate risk polygons with proper buffering
- ✅ Save to `data/processed/risk_polygons_nyc.geojson`

## Step 3: Verify the Output

Check the console output - you should see:
```
Loading data from ...
Loaded XXXX raw crime incidents
Filtered to XXXX nighttime violent crimes
Found XXX crime clusters
Generated XXX risk polygons
```

## Step 4: Use the Processed Data

The backend will automatically load the new polygons from `data/processed/`. Restart your backend server to pick up the new data:

```powershell
# Stop current server (Ctrl+C), then:
py run_backend.py
```

## Troubleshooting

### "Could not find longitude/latitude columns"
- The script looks for columns containing "longitude"/"latitude" (case-insensitive)
- Check your CSV column names
- Common NYC data columns: `Latitude`, `Longitude`, or `Lat_Lon`

### "No features after filtering"
- Check if your data has crimes in the 8 PM - 5 AM time window
- Verify the time column format (should be HH:MM:SS or HH:MM)
- Check if crimes match the relevant categories

### File too large / Processing too slow
- Filter the CSV before processing (keep only recent months)
- Or add date filtering in the script's `load_raw_data()` function

## Expected NYC Data Format

The script automatically handles these NYC Open Data columns:
- **Coordinates:** `Latitude`, `Longitude` (or variations)
- **Time:** `CMPLNT_FR_TM` (format: "HH:MM:SS")
- **Category:** `OFNS_DESC` (e.g., "ROBBERY", "ASSAULT 3")
- **Date:** `CMPLNT_FR_DT` (format: "MM/DD/YYYY")

## What Gets Filtered

The script only includes:
- **Time:** Crimes between 8:00 PM and 5:59 AM
- **Categories:** Robbery, Assault, Burglary, Grand Larceny, Felony Assault, Rape, Murder, Shooting
- **Location:** Valid coordinates within NYC bounds (-74.3 to -73.7 longitude, 40.4 to 40.9 latitude)

## Next Steps

After processing, the risk polygons will be:
- ✅ Available via `/crime-heatmap` endpoint
- ✅ Used by `/safe-route` endpoint to avoid high-risk areas
- ✅ Displayed on the map in the frontend

