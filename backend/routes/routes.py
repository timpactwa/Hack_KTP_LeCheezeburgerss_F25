"""Blueprint powering routing + heatmap APIs for the dashboard."""

from __future__ import annotations

from flask import Blueprint, jsonify, request

from ..services.crime_data import crime_data_service
from ..services.routing import OpenRouteServiceClient, RoutingError, summarize_route

bp = Blueprint("routes", __name__)
ors_client = OpenRouteServiceClient()


@bp.post("/safe-route")
def safe_route():
    """Fetch shortest + safest routes leveraging risk polygons."""

    payload = request.get_json(silent=True) or {}
    start = payload.get("start")
    end = payload.get("end")
    if not (start and end):
        return jsonify({"error": "start and end payloads required"}), 400

    risk_polygons = crime_data_service.get_risk_polygons({"start": start, "end": end})
    
    # Log for debugging
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Found {len(risk_polygons)} risk polygons for route")
    
    # Don't create avoid_polygons_geometry here - let the adaptive strategy create it selectively
    # This prevents using ALL polygons which blocks all alternative routes
    
    warnings: list[str] = []
    try:
        shortest = ors_client.build_route(start, end)
    except RoutingError as exc:
        warnings.append(str(exc))
        shortest = ors_client._fallback_route(start, end)

    if len(risk_polygons) > 0:
        try:
            # Import all shapely functions at the top to avoid scope issues
            from shapely.geometry import shape, LineString, MultiPolygon, mapping
            
            # Check which polygons actually intersect the shortest route
            shortest_line = LineString(shortest.get("geometry", {}).get("coordinates", []))
            
            # More precise selection: only polygons that directly intersect the route path
            intersecting_polygons = []
            for feature in risk_polygons:
                try:
                    poly_shape = shape(feature["geometry"])
                    # Only include if polygon directly intersects the route line (not just nearby)
                    if poly_shape.intersects(shortest_line):
                        intersecting_polygons.append(feature)
                except Exception:
                    continue
            
            logger.info(f"Found {len(intersecting_polygons)} polygons directly intersecting shortest route")
            
            # Adaptive strategy: try with fewer zones to find alternative routes
            safest = None
            zones_to_try = [3, 1]  # Try top 3, then top 1
            
            if intersecting_polygons:
                # Sort by risk score (highest first)
                sorted_polygons = sorted(
                    intersecting_polygons,
                    key=lambda f: f.get("properties", {}).get("risk_score", 0),
                    reverse=True
                )
                
                for zone_count in zones_to_try:
                    if len(sorted_polygons) < zone_count:
                        continue
                    
                    # Take top N highest-risk zones
                    selected_polygons = sorted_polygons[:zone_count]
                    logger.info(f"Trying avoidance with top {len(selected_polygons)} highest-risk zones")
                    
                    # Build MultiPolygon with selected zones
                    geometries = []
                    for feature in selected_polygons:
                        geom = shape(feature["geometry"])
                        if geom.is_valid and geom.area < 0.1:
                            # Simplify if too complex
                            if hasattr(geom, 'exterior') and len(geom.exterior.coords) > 100:
                                geom = geom.simplify(0.0001, preserve_topology=True)
                            geometries.append(geom)
                    
                    if geometries:
                        # Try MultiPolygon first
                        if len(geometries) > 1:
                            try:
                                multipoly = MultiPolygon(geometries)
                                if multipoly.is_valid:
                                    test_avoid_polygons = mapping(multipoly)
                                    logger.info(f"Created valid MultiPolygon with {len(geometries)} polygons")
                                else:
                                    # MultiPolygon invalid - try to fix by buffering slightly
                                    logger.warning(f"MultiPolygon invalid, trying to fix...")
                                    # Try using just the first few polygons
                                    test_geoms = geometries[:min(3, len(geometries))]
                                    if len(test_geoms) > 1:
                                        multipoly = MultiPolygon(test_geoms)
                                        if multipoly.is_valid:
                                            test_avoid_polygons = mapping(multipoly)
                                            logger.info(f"Created valid MultiPolygon with {len(test_geoms)} polygons (reduced)")
                                        else:
                                            # Fall back to single polygon
                                            test_avoid_polygons = mapping(geometries[0])
                                            logger.info(f"Using single polygon fallback")
                                    else:
                                        test_avoid_polygons = mapping(geometries[0])
                                        logger.info(f"Using single polygon (only one geometry)")
                            except Exception as e:
                                logger.warning(f"Error creating MultiPolygon: {e}, using first polygon")
                                test_avoid_polygons = mapping(geometries[0])
                        else:
                            # Only one geometry - use as single Polygon
                            test_avoid_polygons = mapping(geometries[0])
                            logger.info(f"Using single Polygon (1 geometry)")
                        
                        try:
                            test_safest = ors_client.build_route(start, end, test_avoid_polygons)
                            
                            # Check if this route is different from shortest
                            shortest_coords = shortest.get("geometry", {}).get("coordinates", [])
                            test_coords = test_safest.get("geometry", {}).get("coordinates", [])
                            
                            # Compare routes - they're different if coordinates differ
                            if len(test_coords) != len(shortest_coords) or test_coords != shortest_coords:
                                safest = test_safest
                                avoid_polygons_geometry = test_avoid_polygons
                                logger.info(f"✅ Successfully found different route using {len(geometries)} zones")
                                break
                            else:
                                logger.info(f"Route with {len(geometries)} zones is identical, trying fewer zones...")
                        except RoutingError as e:
                            logger.warning(f"Failed to build route with {len(geometries)} zones: {e}")
                            continue
                
                # If we still don't have a different route, try one more time with just the highest-risk zone
                if safest is None and len(sorted_polygons) > 0:
                    logger.info("Trying with single highest-risk zone")
                    top_zone = sorted_polygons[0]
                    geom = shape(top_zone["geometry"])
                    if geom.is_valid and geom.area < 0.1:
                        single_zone_avoid = mapping(geom)
                        try:
                            safest = ors_client.build_route(start, end, single_zone_avoid)
                            # Verify it's different
                            shortest_coords = shortest.get("geometry", {}).get("coordinates", [])
                            safest_coords = safest.get("geometry", {}).get("coordinates", [])
                            if len(safest_coords) == len(shortest_coords) and safest_coords == shortest_coords:
                                logger.warning("Even single highest-risk zone produces identical route")
                                warnings.append("No alternative route available - all paths blocked by risk zones")
                            else:
                                logger.info("Found different route using single highest-risk zone")
                        except RoutingError:
                            logger.warning("Failed to build route even with single zone")
            else:
                logger.info("No polygons directly intersect shortest route")
            
            # Final check: if we still don't have a different route, use shortest
            if safest is None:
                logger.warning("Could not find alternative route - using shortest")
                safest = shortest
                warnings.append("Safest route matches shortest - dense risk zones may block all alternatives")
            else:
                # Final verification that routes are different
                shortest_coords = shortest.get("geometry", {}).get("coordinates", [])
                safest_coords = safest.get("geometry", {}).get("coordinates", [])
                if len(shortest_coords) == len(safest_coords) and shortest_coords == safest_coords:
                    logger.warning("Final check: routes are still identical")
                    warnings.append("Routes are identical - no safer alternative available")
                else:
                    logger.info(f"✅ Routes differ: shortest has {len(shortest_coords)} points, safest has {len(safest_coords)} points")
                
        except RoutingError as exc:
            warnings.append(f"Safest route fallback: {exc}")
            logger.error(f"Failed to build safest route: {exc}")
            safest = shortest
        except Exception as e:
            logger.error(f"Error processing polygons for safest route: {e}", exc_info=True)
            safest = shortest
    else:
        logger.info("No risk polygons found, using shortest route for both")
        safest = shortest

    response = {
        "start": start,
        "end": end,
        "shortest": summarize_route(shortest, avoided=0),
        "safest": summarize_route(safest, avoided=len(risk_polygons)),
        "risk_polygons": {"type": "FeatureCollection", "features": risk_polygons} if risk_polygons else None,
        "warnings": warnings,
    }
    return jsonify(response)


def build_avoid_polygons(features):
    """Convert risk polygon features into ORS-compatible Polygon/MultiPolygon."""

    if not features:
        return None

    polygons = []
    for feature in features:
        geometry = feature.get("geometry") or {}
        gtype = geometry.get("type")
        coords = geometry.get("coordinates")
        if not coords:
            continue
        if gtype == "Polygon":
            if len(coords[0]) >= 4:
                polygons.append(coords)
        elif gtype == "MultiPolygon":
            for poly in coords:
                if poly and len(poly[0]) >= 4:
                    polygons.append(poly)

    if not polygons:
        return None

    if len(polygons) == 1:
        return {"type": "Polygon", "coordinates": polygons[0]}
    return {"type": "MultiPolygon", "coordinates": polygons}


@bp.get("/crime-heatmap")
def crime_heatmap():
    """Return GeoJSON features powering the Mapbox heatmap layer."""

    return jsonify(crime_data_service.get_heatmap())
