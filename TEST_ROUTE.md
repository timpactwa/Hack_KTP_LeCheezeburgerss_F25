# Testing the /safe-route Endpoint

## PowerShell Syntax (Correct Way)

PowerShell's `curl` is an alias for `Invoke-WebRequest` which has different syntax:

```powershell
$body = @{
    start = @{lat=40.73061; lng=-74.0007}
    end = @{lat=40.7152; lng=-73.983}
} | ConvertTo-Json

Invoke-WebRequest -Uri http://127.0.0.1:5000/safe-route `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body `
  -UseBasicParsing | Select-Object -ExpandProperty Content
```

Or use the simpler one-liner:
```powershell
$body = '{"start":{"lat":40.73061,"lng":-74.0007},"end":{"lat":40.7152,"lng":-73.983}}'; Invoke-WebRequest -Uri http://127.0.0.1:5000/safe-route -Method POST -ContentType "application/json" -Body $body -UseBasicParsing | Select-Object -ExpandProperty Content
```

## Current Status

The endpoint is working, but the ORS API key is still returning 403 errors. The response shows:
- Routes are being generated (using fallback)
- Risk polygons are loaded (96 polygons found)
- But ORS API calls are failing with 403

## Next Steps to Fix ORS

1. **Check API Key Format** in `scripts/.env`:
   - Should be: `ORS_API_KEY=your_key_here`
   - NO quotes, NO spaces, NO "Bearer" prefix

2. **Verify Key is Activated**:
   - Go to https://openrouteservice.org/dev/#/account
   - Check if Directions API is enabled for your key

3. **Test Key Manually**:
   ```powershell
   $key = "YOUR_KEY_HERE"
   $body = '{"coordinates":[[-74.0007,40.73061],[-73.983,40.7152]]}' | ConvertTo-Json
   Invoke-WebRequest -Uri "https://api.openrouteservice.org/v2/directions/foot-walking/geojson" `
     -Method POST `
     -Headers @{"Authorization"="Bearer $key"; "Content-Type"="application/json"} `
     -Body $body
   ```

