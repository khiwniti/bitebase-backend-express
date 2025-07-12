import { Hono } from 'hono';

export function createLocationHandler() {
  const location = new Hono();

  // Search locations
  location.get('/search', async (c) => {
    const { query, lat, lng, radius = 5000 } = c.req.query();
    
    try {
      // Use Google Maps API through fetch
      const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
      url.searchParams.append('location', `${lat},${lng}`);
      url.searchParams.append('radius', radius);
      url.searchParams.append('type', 'restaurant');
      url.searchParams.append('keyword', query || '');
      url.searchParams.append('key', c.env.GOOGLE_MAPS_API_KEY);

      const response = await fetch(url.toString());
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error_message || 'Google Maps API error');
      }

      // Transform and return results
      const results = data.results.map(place => ({
        id: place.place_id,
        name: place.name,
        address: place.vicinity,
        location: place.geometry.location,
        rating: place.rating,
        priceLevel: place.price_level,
        types: place.types,
        isOpen: place.opening_hours?.open_now
      }));

      return c.json({ results, total: results.length });
    } catch (error) {
      console.error('Location search error:', error);
      return c.json({ error: 'Failed to search locations' }, 500);
    }
  });

  // Get location details
  location.get('/details/:placeId', async (c) => {
    const { placeId } = c.req.param();
    
    try {
      const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
      url.searchParams.append('place_id', placeId);
      url.searchParams.append('fields', 'name,rating,formatted_address,geometry,photos,reviews,opening_hours,website,formatted_phone_number');
      url.searchParams.append('key', c.env.GOOGLE_MAPS_API_KEY);

      const response = await fetch(url.toString());
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error_message || 'Google Maps API error');
      }

      return c.json(data.result);
    } catch (error) {
      console.error('Location details error:', error);
      return c.json({ error: 'Failed to fetch location details' }, 500);
    }
  });

  // Geocoding
  location.get('/geocode', async (c) => {
    const { address } = c.req.query();
    
    try {
      const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
      url.searchParams.append('address', address);
      url.searchParams.append('key', c.env.GOOGLE_MAPS_API_KEY);

      const response = await fetch(url.toString());
      const data = await response.json();

      if (!response.ok || data.status !== 'OK') {
        throw new Error(data.error_message || 'Geocoding failed');
      }

      const result = data.results[0];
      return c.json({
        formatted_address: result.formatted_address,
        location: result.geometry.location,
        place_id: result.place_id
      });
    } catch (error) {
      console.error('Geocoding error:', error);
      return c.json({ error: 'Failed to geocode address' }, 500);
    }
  });

  // Analyze location
  location.post('/analyze', async (c) => {
    const body = await c.req.json();
    const { location, radius = 5000 } = body;
    
    try {
      // Fetch nearby competitors
      const competitorsUrl = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
      competitorsUrl.searchParams.append('location', `${location.lat},${location.lng}`);
      competitorsUrl.searchParams.append('radius', radius);
      competitorsUrl.searchParams.append('type', 'restaurant');
      competitorsUrl.searchParams.append('key', c.env.GOOGLE_MAPS_API_KEY);

      const competitorsResponse = await fetch(competitorsUrl.toString());
      const competitorsData = await competitorsResponse.json();

      const competitors = competitorsData.results || [];
      
      // Calculate analytics
      const analysis = {
        location,
        radius,
        competitorCount: competitors.length,
        averageRating: competitors.reduce((sum, c) => sum + (c.rating || 0), 0) / competitors.length,
        priceDistribution: analyzePriceDistribution(competitors),
        topCompetitors: competitors
          .sort((a, b) => (b.rating || 0) - (a.rating || 0))
          .slice(0, 5)
          .map(c => ({
            name: c.name,
            rating: c.rating,
            reviews: c.user_ratings_total,
            priceLevel: c.price_level
          })),
        marketSaturation: calculateMarketSaturation(competitors.length, radius),
        recommendations: generateLocationRecommendations(competitors, radius)
      };

      return c.json(analysis);
    } catch (error) {
      console.error('Location analysis error:', error);
      return c.json({ error: 'Failed to analyze location' }, 500);
    }
  });

  return location;
}

// Helper functions
function analyzePriceDistribution(competitors) {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0 };
  competitors.forEach(c => {
    if (c.price_level) {
      distribution[c.price_level]++;
    }
  });
  return distribution;
}

function calculateMarketSaturation(competitorCount, radius) {
  const areaKm2 = Math.PI * Math.pow(radius / 1000, 2);
  const density = competitorCount / areaKm2;
  
  if (density < 2) return 'low';
  if (density < 5) return 'moderate';
  if (density < 10) return 'high';
  return 'very high';
}

function generateLocationRecommendations(competitors, radius) {
  const recommendations = [];
  
  const avgRating = competitors.reduce((sum, c) => sum + (c.rating || 0), 0) / competitors.length;
  if (avgRating < 4) {
    recommendations.push({
      type: 'opportunity',
      message: 'Low average competitor ratings indicate opportunity for quality differentiation'
    });
  }
  
  const priceGaps = analyzePriceGaps(competitors);
  if (priceGaps.length > 0) {
    recommendations.push({
      type: 'pricing',
      message: `Consider targeting ${priceGaps.join(', ')} price segments`
    });
  }
  
  return recommendations;
}

function analyzePriceGaps(competitors) {
  const distribution = analyzePriceDistribution(competitors);
  const gaps = [];
  
  if (distribution[1] < competitors.length * 0.1) gaps.push('budget');
  if (distribution[2] < competitors.length * 0.2) gaps.push('moderate');
  if (distribution[3] < competitors.length * 0.1) gaps.push('upscale');
  if (distribution[4] < competitors.length * 0.05) gaps.push('luxury');
  
  return gaps;
}