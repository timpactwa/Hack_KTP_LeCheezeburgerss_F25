"""Generate risk polygons from raw NYC crime data.

This script processes raw crime data, filters by time/category,
clusters points, and generates buffered risk polygons.
"""

import json
import sys
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Dict, Any

# Add backend to path so we can import services
sys.path.insert(0, str(Path(__file__).parent.parent))

from shapely.geometry import Point, mapping
from shapely.ops import unary_union
from sklearn.cluster import DBSCAN
import numpy as np

# Configuration
RAW_DATA_PATH = Path(__file__).parent.parent / "data" / "raw"
PROCESSED_DATA_PATH = Path(__file__).parent.parent / "data" / "processed"
PROCESSED_DATA_PATH.mkdir(parents=True, exist_ok=True)

# Crime categories to include (violent crimes relevant to nighttime safety)
RELEVANT_CATEGORIES = {
    "robbery", "assault", "burglary", "grand larceny", 
    "felony assault", "rape", "murder", "shooting"
}

# Weight mapping for different crime types (0.0 to 1.0)
CRIME_WEIGHTS = {
    "murder": 1.0,
    "rape": 0.95,
    "shooting": 0.9,
    "felony assault": 0.85,
    "robbery": 0.8,
    "assault": 0.7,
    "burglary": 0.65,
    "grand larceny": 0.6,
}


def get_crime_weight(category: str) -> float:
    """Get weight for a crime category based on severity."""
    category_lower = category.lower()
    for crime_type, weight in CRIME_WEIGHTS.items():
        if crime_type in category_lower:
            return weight
    return 0.7  # Default weight for other relevant crimes

# Time window: 8 PM (20:00) to 5 AM (05:00)
NIGHT_HOURS = set(range(20, 24)) | set(range(0, 6))

# Buffer distances (in degrees, roughly 50-150m)
MIN_BUFFER = 0.0005  # ~50m
MAX_BUFFER = 0.0015  # ~150m


def load_raw_data(file_path: Path) -> List[Dict[str, Any]]:
    """Load raw crime data from GeoJSON or CSV file."""
    if file_path.suffix == '.geojson':
        with open(file_path, 'r') as f:
            data = json.load(f)
        return data.get('features', [])
    elif file_path.suffix == '.csv':
        # If you get CSV data, you'll need pandas
        import pandas as pd
        df = pd.read_csv(file_path, low_memory=False)
        
        # Normalize column names (handle case variations)
        df.columns = df.columns.str.strip().str.lower()
        
        # Find coordinate columns (try common variations)
        # Prioritize separate lat/lon columns over combined lat_lon
        lng_col = None
        lat_col = None
        
        # First pass: look for separate latitude/longitude columns
        for col in df.columns:
            col_lower = col.lower()
            if col_lower == 'longitude' or (col_lower.startswith('longitude') and 'lat' not in col_lower):
                lng_col = col
            elif col_lower == 'latitude' or (col_lower.startswith('latitude') and 'lon' not in col_lower):
                lat_col = col
        
        # If we found both, we're done
        if lng_col and lat_col:
            pass
        # Otherwise, look for any lon/lat containing columns
        elif not lng_col or not lat_col:
            for col in df.columns:
                col_lower = col.lower()
                if not lng_col and ('longitude' in col_lower or ('lon' in col_lower and 'lat' not in col_lower)):
                    lng_col = col
                elif not lat_col and ('latitude' in col_lower or ('lat' in col_lower and 'lon' not in col_lower)):
                    lat_col = col
        
        if not lng_col or not lat_col:
            raise ValueError(f"Could not find longitude/latitude columns. Found: {list(df.columns)}")
        
        # Convert CSV to GeoJSON features format
        features = []
        for _, row in df.iterrows():
            # Skip rows with invalid coordinates
            try:
                lng = float(row[lng_col])
                lat = float(row[lat_col])
                # Skip if coordinates are 0,0 (invalid)
                if lng == 0 and lat == 0:
                    continue
            except (ValueError, TypeError):
                continue
            
            # Extract hour from time column (try common variations)
            hour = None
            for time_col in ['cmplnt_fr_tm', 'hour', 'time', 'complaint_time']:
                if time_col in df.columns:
                    time_val = row[time_col]
                    if pd.notna(time_val):
                        time_str = str(time_val)
                        # Parse "HH:MM:SS" or "HH:MM" format
                        if ':' in time_str:
                            hour = int(time_str.split(':')[0])
                            break
            
            # Extract category (try common variations)
            category = 'unknown'
            for cat_col in ['ofns_desc', 'category', 'offense', 'crime_type']:
                if cat_col in df.columns:
                    cat_val = row[cat_col]
                    if pd.notna(cat_val):
                        category = str(cat_val).lower()
                        break
            
            # Extract date
            date = ''
            for date_col in ['cmplnt_fr_dt', 'date', 'complaint_date']:
                if date_col in df.columns:
                    date_val = row[date_col]
                    if pd.notna(date_val):
                        date = str(date_val)
                        break
            
            features.append({
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': [lng, lat]
                },
                'properties': {
                    'hour': hour,
                    'category': category,
                    'date': date,
                    'weight': get_crime_weight(category)
                }
            })
        return features
    else:
        raise ValueError(f"Unsupported file format: {file_path.suffix}")


def filter_crime_data(features: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Filter features by time window and relevant categories."""
    filtered = []
    
    for feature in features:
        props = feature.get('properties', {})
        
        # Extract hour (handle different formats)
        hour = props.get('hour')
        if isinstance(hour, str):
            # Try to parse "23", "23:00", "23:00:00", etc.
            hour = int(hour.split(':')[0])
        elif hour is None:
            continue
        
        # Filter by time window (8 PM - 5 AM)
        if hour not in NIGHT_HOURS:
            continue
        
        # Filter by category
        category = props.get('category', '').lower()
        if not any(rel_cat in category for rel_cat in RELEVANT_CATEGORIES):
            continue
        
        # Only include valid coordinates
        coords = feature.get('geometry', {}).get('coordinates', [])
        if len(coords) != 2:
            continue
        
        lng, lat = coords
        # Basic NYC bounds check
        if not (-74.3 <= lng <= -73.7 and 40.4 <= lat <= 40.9):
            continue
        
        filtered.append(feature)
    
    return filtered


def cluster_crime_points(features: List[Dict[str, Any]], 
                        eps: float = 0.001,  # ~100m in degrees
                        min_samples: int = 3) -> List[List[Dict[str, Any]]]:
    """Cluster crime points using DBSCAN.
    
    Args:
        features: List of crime feature dicts
        eps: Maximum distance between points in same cluster (in degrees)
        min_samples: Minimum points to form a cluster
    
    Returns:
        List of clusters, each cluster is a list of features
    """
    # For small datasets, adjust min_samples
    if len(features) < min_samples:
        # If we have fewer points than min_samples, try with min_samples=2
        if len(features) >= 2:
            min_samples = 2
        else:
            return []
    
    # Extract coordinates
    coords = np.array([
        feature['geometry']['coordinates']  # [lng, lat]
        for feature in features
    ])
    
    # Run DBSCAN
    clustering = DBSCAN(eps=eps, min_samples=min_samples, metric='euclidean')
    cluster_labels = clustering.fit_predict(coords)
    
    # Group features by cluster label
    clusters = {}
    noise_points = []
    for idx, label in enumerate(cluster_labels):
        if label == -1:  # Noise points (not in any cluster)
            noise_points.append(features[idx])
            continue
        if label not in clusters:
            clusters[label] = []
        clusters[label].append(features[idx])
    
    # For very small datasets, if we have noise points but no clusters,
    # create individual clusters for each noise point
    if not clusters and noise_points and len(features) <= 5:
        return [[point] for point in noise_points]
    
    return list(clusters.values())


def generate_risk_polygons(clusters: List[List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
    """Generate buffered risk polygons from crime clusters.
    
    Args:
        clusters: List of crime point clusters
    
    Returns:
        List of GeoJSON Feature dicts with polygon geometries
    """
    polygons = []
    
    for cluster in clusters:
        if not cluster:
            continue
        
        # Calculate cluster properties
        total_weight = sum(
            float(f.get('properties', {}).get('weight', 0.5))
            for f in cluster
        )
        avg_weight = total_weight / len(cluster)
        incident_count = len(cluster)
        
        # Create points from cluster
        points = [
            Point(f['geometry']['coordinates'])  # [lng, lat]
            for f in cluster
        ]
        
        # Calculate buffer distance based on density and weight
        # More incidents + higher weight = larger buffer
        density_factor = min(incident_count / 10.0, 1.0)  # Cap at 1.0
        buffer_distance = MIN_BUFFER + (MAX_BUFFER - MIN_BUFFER) * (
            avg_weight * 0.5 + density_factor * 0.5
        )
        
        # Create convex hull or union of buffered points
        if len(points) == 1:
            buffered = points[0].buffer(buffer_distance)
        else:
            # Union all buffered points in cluster
            buffered_points = [p.buffer(buffer_distance) for p in points]
            buffered = unary_union(buffered_points)
        
        # Convert to polygon if it's a MultiPolygon (take largest)
        if hasattr(buffered, 'geoms'):
            # MultiPolygon - take the largest one
            buffered = max(buffered.geoms, key=lambda p: p.area)
        
        # Calculate risk score (incident count * avg weight * area)
        risk_score = incident_count * avg_weight * (buffered.area * 100000)
        
        polygons.append({
            'type': 'Feature',
            'geometry': mapping(buffered),
            'properties': {
                'risk_score': round(risk_score, 2),
                'incident_count': incident_count,
                'avg_weight': round(avg_weight, 2),
                'buffer_meters': round(buffer_distance * 111000, 0)  # Approx meters
            }
        })
    
    return polygons


def process_crime_data(input_file: str = "nyc_crime_sample.geojson",
                      output_heatmap: str = "crime_heatmap.geojson",
                      output_polygons: str = "risk_polygons.geojson"):
    """Main processing function.
    
    Args:
        input_file: Name of input file in data/raw/
        output_heatmap: Name of output heatmap file in data/processed/
        output_polygons: Name of output polygons file in data/processed/
    """
    input_path = RAW_DATA_PATH / input_file
    if not input_path.exists():
        print(f"Error: Input file not found: {input_path}")
        return
    
    print(f"Loading data from {input_path}...")
    raw_features = load_raw_data(input_path)
    print(f"Loaded {len(raw_features)} raw crime incidents")
    
    print("Filtering by time window and category...")
    filtered_features = filter_crime_data(raw_features)
    print(f"Filtered to {len(filtered_features)} nighttime violent crimes")
    
    if not filtered_features:
        print("No features after filtering. Check your data format.")
        return
    
    # Save filtered points for heatmap
    heatmap_data = {
        'type': 'FeatureCollection',
        'features': filtered_features
    }
    heatmap_path = PROCESSED_DATA_PATH / output_heatmap
    with open(heatmap_path, 'w') as f:
        json.dump(heatmap_data, f, indent=2)
    print(f"Saved heatmap data to {heatmap_path}")
    
    # Cluster and generate polygons
    print("Clustering crime points...")
    clusters = cluster_crime_points(filtered_features)
    print(f"Found {len(clusters)} crime clusters")
    
    print("Generating risk polygons...")
    polygons = generate_risk_polygons(clusters)
    print(f"Generated {len(polygons)} risk polygons")
    
    # Save polygons
    polygons_data = {
        'type': 'FeatureCollection',
        'features': polygons,
        'metadata': {
            'generated_at': datetime.now(timezone.utc).isoformat(),
            'source_file': input_file,
            'total_incidents': len(filtered_features),
            'total_clusters': len(clusters),
            'total_polygons': len(polygons)
        }
    }
    polygons_path = PROCESSED_DATA_PATH / output_polygons
    with open(polygons_path, 'w') as f:
        json.dump(polygons_data, f, indent=2)
    print(f"Saved risk polygons to {polygons_path}")
    
    # Print summary stats
    if polygons:
        total_risk = sum(p['properties']['risk_score'] for p in polygons)
        avg_incidents = sum(p['properties']['incident_count'] for p in polygons) / len(polygons)
        print(f"\nSummary:")
        print(f"  Total risk score: {total_risk:.2f}")
        print(f"  Average incidents per polygon: {avg_incidents:.1f}")
        print(f"  Largest polygon area: {max(p['properties']['risk_score'] for p in polygons):.2f}")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate risk polygons from crime data")
    parser.add_argument("--input", default="nyc_crime_sample.geojson",
                       help="Input file name in data/raw/")
    parser.add_argument("--output-heatmap", default="crime_heatmap.geojson",
                       help="Output heatmap file name")
    parser.add_argument("--output-polygons", default="risk_polygons.geojson",
                       help="Output polygons file name")
    
    args = parser.parse_args()
    process_crime_data(args.input, args.output_heatmap, args.output_polygons)