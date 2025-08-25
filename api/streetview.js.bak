export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { searchParams } = new URL(req.url, `https://${req.headers.host}`);
    
    // Extract parameters
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const size = searchParams.get('size') || '640x360';
    const heading = searchParams.get('heading') || '0';
    const pitch = searchParams.get('pitch') || '0';
    const fov = searchParams.get('fov') || '90';

    // Validate required parameters
    if (!lat || !lng) {
      return res.status(400).json({ 
        error: 'Missing required parameters: lat, lng' 
      });
    }

    // Validate coordinates
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ 
        error: 'Invalid coordinates' 
      });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ 
        error: 'Coordinates out of range' 
      });
    }

    // Check for API key
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('Missing GOOGLE_MAPS_API_KEY environment variable');
      return res.status(500).json({ 
        error: 'Street View service temporarily unavailable' 
      });
    }

    // Build Google Street View Static API URL
    const streetViewUrl = new URL('https://maps.googleapis.com/maps/api/streetview');
    streetViewUrl.searchParams.set('location', `${latitude},${longitude}`);
    streetViewUrl.searchParams.set('size', size);
    streetViewUrl.searchParams.set('heading', heading);
    streetViewUrl.searchParams.set('pitch', pitch);
    streetViewUrl.searchParams.set('fov', fov);
    streetViewUrl.searchParams.set('key', apiKey);

    // Fetch image from Google Street View
    const response = await fetch(streetViewUrl.toString());

    if (!response.ok) {
      // Handle Google API errors
      if (response.status === 404) {
        // No Street View data available for this location
        return res.status(404).json({ 
          error: 'No Street View imagery available for this location' 
        });
      }
      
      console.error('Google Street View API error:', response.status, response.statusText);
      return res.status(response.status).json({ 
        error: 'Street View service error' 
      });
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Set caching headers (30 days)
    res.setHeader('Cache-Control', 'public, s-maxage=2592000, stale-while-revalidate=86400');
    res.setHeader('Content-Type', contentType);
    
    // Add CORS headers for frontend access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    // Return the image
    return res.send(Buffer.from(imageBuffer));

  } catch (error) {
    console.error('Street View proxy error:', error);
    return res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}

export const config = {
  runtime: 'edge',
};