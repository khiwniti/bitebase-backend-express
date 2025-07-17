/**
 * Foot Traffic Analytics Service
 * Handles area traffic analysis, visit patterns, and demographic insights
 */

// FoursquareClient removed - using mock implementation

class FootTrafficAnalytics {
  constructor(foursquareClient = null, database = null) {
    // Mock Foursquare client (service removed)
    this.foursquare = foursquareClient || {
      getFootTrafficData: async () => ({ traffic: [] }),
      getVenueVisitStats: async () => ({ visits: [] }),
      getAreaAnalytics: async () => ({ analytics: {} })
    };
    this.db = database;
  }

  setDatabase(db) {
    this.db = db;
  }

  /**
   * Analyze area traffic patterns for a given location
   */
  async analyzeAreaTraffic(location, radius = 1000) {
    if (!location || !location.lat || !location.lng) {
      throw new Error('Location with lat and lng is required');
    }

    try {
      console.log(`📊 Analyzing area traffic for location: ${location.lat}, ${location.lng} (radius: ${radius}m)`);

      // Check if we have cached analysis
      const cachedAnalysis = await this.getCachedAreaAnalysis(location, radius);
      if (cachedAnalysis) {
        console.log('📋 Using cached area traffic analysis');
        return cachedAnalysis;
      }

      // Get all venues in the area
      const venues = await this.foursquare.searchVenues({
        location,
        radius,
        categories: ['13000'], // Food and Dining
        limit: 50,
        sort: 'popularity'
      });

      if (venues.length === 0) {
        return this.generateEmptyAnalysis(location, radius);
      }

      // Get traffic stats for each venue (with fallbacks for premium API limitations)
      const trafficData = await this.gatherVenueTrafficData(venues);

      // Analyze the traffic patterns
      const analysis = this.analyzeAreaTrafficPatterns(trafficData, location, radius);

      // Cache the analysis
      await this.cacheAreaAnalysis(location, radius, analysis);

      return analysis;
    } catch (error) {
      console.error('❌ Error analyzing area traffic:', error);
      throw new Error(`Failed to analyze area traffic: ${error.message}`);
    }
  }

  /**
   * Gather traffic data for venues with fallbacks
   */
  async gatherVenueTrafficData(venues) {
    const trafficData = [];

    for (const venue of venues) {
      try {
        // Try to get actual visit stats (requires premium API)
        let visitStats = null;
        try {
          visitStats = await this.foursquare.getVenueStats(venue.fsq_id);
        } catch (error) {
          console.warn(`⚠️ Could not get visit stats for ${venue.name}, using estimated data`);
        }

        // If no real stats available, generate estimated data based on venue attributes
        if (!visitStats) {
          visitStats = this.generateEstimatedVisitStats(venue);
        }

        trafficData.push({
          venue,
          stats: visitStats
        });
      } catch (error) {
        console.warn(`⚠️ Failed to process venue ${venue.name}:`, error.message);
        // Continue with other venues
      }
    }

    return trafficData;
  }

  /**
   * Generate estimated visit stats based on venue attributes
   */
  generateEstimatedVisitStats(venue) {
    // Base estimates on popularity, rating, and price point
    const popularity = venue.popularity || 50;
    const rating = venue.rating || 3.0;
    const price = venue.price || 2;

    // Estimate daily visits based on popularity and rating
    const baseVisits = Math.round((popularity / 100) * 500 * (rating / 5));
    const dailyVisits = Math.max(baseVisits, 20); // Minimum 20 visits per day

    // Generate hourly distribution
    const hourlyVisits = this.generateHourlyDistribution(dailyVisits, venue);

    // Generate demographic estimates
    const demographics = this.estimateDemographics(venue);

    // Generate weekly pattern
    const weeklyPattern = this.generateWeeklyPattern(dailyVisits);

    return {
      venue_id: venue.fsq_id,
      estimated: true,
      visits_by_day: weeklyPattern,
      visits_by_hour: hourlyVisits,
      demographic_breakdown: demographics,
      comparison_data: {
        vs_last_week: (Math.random() - 0.5) * 0.4, // ±20% variation
        vs_last_month: (Math.random() - 0.5) * 0.6, // ±30% variation
        vs_last_year: (Math.random() - 0.5) * 0.8 // ±40% variation
      },
      total_daily_visits: dailyVisits,
      confidence_level: this.calculateConfidenceLevel(venue)
    };
  }

  /**
   * Generate realistic hourly visit distribution
   */
  generateHourlyDistribution(dailyVisits, venue) {
    const hourlyDistribution = [];
    
    // Different patterns based on venue type
    const categories = venue.categories || [];
    const isCafe = categories.some(cat => cat.name?.toLowerCase().includes('cafe') || cat.name?.toLowerCase().includes('coffee'));
    const isFastFood = categories.some(cat => cat.name?.toLowerCase().includes('fast') || cat.name?.toLowerCase().includes('quick'));
    const isBar = categories.some(cat => cat.name?.toLowerCase().includes('bar') || cat.name?.toLowerCase().includes('nightlife'));

    for (let hour = 0; hour < 24; hour++) {
      let multiplier = 0.02; // Base 2% of daily traffic per hour

      if (isCafe) {
        // Cafe pattern: morning and afternoon peaks
        if (hour >= 7 && hour <= 9) multiplier = 0.12; // Morning rush
        else if (hour >= 10 && hour <= 11) multiplier = 0.08;
        else if (hour >= 14 && hour <= 16) multiplier = 0.10; // Afternoon peak
        else if (hour >= 12 && hour <= 13) multiplier = 0.06; // Lunch
        else if (hour >= 17 && hour <= 19) multiplier = 0.04;
        else if (hour < 7 || hour > 20) multiplier = 0.01;
      } else if (isFastFood) {
        // Fast food pattern: lunch and dinner peaks
        if (hour >= 11 && hour <= 13) multiplier = 0.15; // Lunch rush
        else if (hour >= 17 && hour <= 19) multiplier = 0.12; // Dinner rush
        else if (hour >= 14 && hour <= 16) multiplier = 0.05;
        else if (hour >= 19 && hour <= 21) multiplier = 0.08;
        else if (hour < 11 || hour > 22) multiplier = 0.01;
      } else if (isBar) {
        // Bar pattern: evening and night peaks
        if (hour >= 17 && hour <= 19) multiplier = 0.08; // Happy hour
        else if (hour >= 20 && hour <= 23) multiplier = 0.15; // Prime time
        else if (hour >= 0 && hour <= 2) multiplier = 0.10; // Late night
        else if (hour < 16) multiplier = 0.01;
      } else {
        // Regular restaurant pattern
        if (hour >= 11 && hour <= 13) multiplier = 0.12; // Lunch
        else if (hour >= 17 && hour <= 20) multiplier = 0.15; // Dinner
        else if (hour >= 14 && hour <= 16) multiplier = 0.04;
        else if (hour >= 21 && hour <= 22) multiplier = 0.06;
        else if (hour < 11 || hour > 22) multiplier = 0.01;
      }

      // Add some randomness
      multiplier *= (0.8 + Math.random() * 0.4); // ±20% variation

      const visits = Math.round(dailyVisits * multiplier);
      const avgVisits = visits * (0.9 + Math.random() * 0.2); // Historical average
      const popularityScore = Math.min(100, (visits / (dailyVisits * 0.15)) * 100);

      hourlyDistribution.push({
        hour,
        visits,
        avg_visits: Math.round(avgVisits),
        popularity_score: Math.round(popularityScore)
      });
    }

    return hourlyDistribution;
  }

  /**
   * Estimate demographic breakdown
   */
  estimateDemographics(venue) {
    const price = venue.price || 2;
    const categories = venue.categories || [];
    
    // Age group estimation based on venue type and price
    let ageGroups;
    if (price <= 1) {
      // Budget-friendly venues skew younger
      ageGroups = [
        { range: '18-24', percentage: 35 },
        { range: '25-34', percentage: 30 },
        { range: '35-44', percentage: 20 },
        { range: '45-54', percentage: 10 },
        { range: '55+', percentage: 5 }
      ];
    } else if (price >= 3) {
      // Higher-end venues skew older
      ageGroups = [
        { range: '18-24', percentage: 10 },
        { range: '25-34', percentage: 25 },
        { range: '35-44', percentage: 30 },
        { range: '45-54', percentage: 25 },
        { range: '55+', percentage: 10 }
      ];
    } else {
      // Mid-range venues
      ageGroups = [
        { range: '18-24', percentage: 20 },
        { range: '25-34', percentage: 30 },
        { range: '35-44', percentage: 25 },
        { range: '45-54', percentage: 15 },
        { range: '55+', percentage: 10 }
      ];
    }

    // Gender estimation (slightly random but realistic)
    const gender = {
      male: 45 + Math.random() * 10, // 45-55%
      female: 45 + Math.random() * 10, // 45-55%
      other: Math.random() * 2 // 0-2%
    };

    // Normalize gender percentages
    const genderTotal = gender.male + gender.female + gender.other;
    gender.male = Math.round((gender.male / genderTotal) * 100);
    gender.female = Math.round((gender.female / genderTotal) * 100);
    gender.other = 100 - gender.male - gender.female;

    return {
      age_groups: ageGroups,
      gender: gender,
      estimated: true
    };
  }

  /**
   * Generate weekly visit pattern
   */
  generateWeeklyPattern(dailyVisits) {
    const weeklyPattern = [];
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    // Different multipliers for different days
    const dayMultipliers = {
      monday: 0.8,
      tuesday: 0.9,
      wednesday: 0.9,
      thursday: 1.0,
      friday: 1.2,
      saturday: 1.3,
      sunday: 1.1
    };

    days.forEach(day => {
      const multiplier = dayMultipliers[day] * (0.9 + Math.random() * 0.2);
      const visits = Math.round(dailyVisits * multiplier);
      const avgDuration = 45 + Math.random() * 30; // 45-75 minutes

      weeklyPattern.push({
        date: day,
        visits: visits,
        avg_duration: Math.round(avgDuration)
      });
    });

    return weeklyPattern;
  }

  /**
   * Calculate confidence level for estimated data
   */
  calculateConfidenceLevel(venue) {
    let confidence = 0.5; // Base 50% confidence for estimates

    // Increase confidence based on available data
    if (venue.popularity) confidence += 0.2;
    if (venue.rating) confidence += 0.15;
    if (venue.price) confidence += 0.1;
    if (venue.verified) confidence += 0.1;
    if (venue.categories && venue.categories.length > 0) confidence += 0.05;

    return Math.min(confidence, 0.9); // Max 90% confidence for estimates
  }

  /**
   * Analyze area traffic patterns from venue data
   */
  analyzeAreaTrafficPatterns(venueData, location, radius) {
    if (venueData.length === 0) {
      return this.generateEmptyAnalysis(location, radius);
    }

    // Calculate aggregate metrics
    const totalVenues = venueData.length;
    const totalDailyVisits = venueData.reduce((sum, { stats }) => 
      sum + (stats.total_daily_visits || stats.visits_by_day?.reduce((daySum, day) => daySum + day.visits, 0) || 0), 0
    );

    const averageDailyVisits = totalDailyVisits / Math.max(totalVenues, 1);

    // Identify peak hours across all venues
    const hourlyData = new Array(24).fill(0).map((_, hour) => ({
      hour,
      total_visits: venueData.reduce((sum, { stats }) => {
        const hourData = stats.visits_by_hour?.find(h => h.hour === hour);
        return sum + (hourData?.visits || 0);
      }, 0),
      avg_popularity: 0
    }));

    // Calculate average popularity for each hour
    hourlyData.forEach(hourData => {
      const hourVisits = venueData.map(({ stats }) => {
        const hourInfo = stats.visits_by_hour?.find(h => h.hour === hourData.hour);
        return hourInfo?.popularity_score || 0;
      }).filter(score => score > 0);

      hourData.avg_popularity = hourVisits.length > 0 
        ? hourVisits.reduce((a, b) => a + b) / hourVisits.length 
        : 0;
    });

    // Identify peak hours (top 3)
    const peakHours = hourlyData
      .sort((a, b) => b.total_visits - a.total_visits)
      .slice(0, 3)
      .map(h => h.hour)
      .sort((a, b) => a - b);

    // Aggregate demographic data
    const allDemographics = venueData
      .map(d => d.stats.demographic_breakdown)
      .filter(demo => demo && demo.age_groups);

    const aggregatedDemographics = this.aggregateDemographics(allDemographics);

    // Calculate competition density
    const competitionDensity = this.calculateCompetitionDensity(venueData, radius);

    // Calculate opportunity score
    const opportunityScore = this.calculateOpportunityScore({
      average_daily_visits: averageDailyVisits,
      competition_density: competitionDensity,
      peak_hours: peakHours,
      total_venues: totalVenues
    });

    // Identify trends and patterns
    const trends = this.identifyTrafficTrends(venueData);

    // Generate insights
    const insights = this.generateTrafficInsights(
      averageDailyVisits, 
      competitionDensity, 
      peakHours, 
      aggregatedDemographics
    );

    return {
      location: {
        latitude: location.lat,
        longitude: location.lng,
        radius_meters: radius
      },
      total_venues: totalVenues,
      average_daily_visits: Math.round(averageDailyVisits),
      total_daily_visits: totalDailyVisits,
      peak_hours: peakHours,
      hourly_distribution: hourlyData,
      demographic_profile: aggregatedDemographics,
      competition_density: competitionDensity,
      opportunity_score: opportunityScore,
      trends: trends,
      insights: insights,
      confidence_level: this.calculateAnalysisConfidence(venueData),
      analysis_date: new Date().toISOString(),
      estimated_data: venueData.some(v => v.stats.estimated)
    };
  }

  /**
   * Aggregate demographics from multiple venues
   */
  aggregateDemographics(demographicsArray) {
    if (demographicsArray.length === 0) {
      return {
        age_groups: [],
        gender: { male: 50, female: 50, other: 0 },
        estimated: true
      };
    }

    // Aggregate age groups
    const ageGroupTotals = {};
    demographicsArray.forEach(demo => {
      if (demo.age_groups) {
        demo.age_groups.forEach(group => {
          if (!ageGroupTotals[group.range]) {
            ageGroupTotals[group.range] = { total: 0, count: 0 };
          }
          ageGroupTotals[group.range].total += group.percentage;
          ageGroupTotals[group.range].count += 1;
        });
      }
    });

    const aggregatedAgeGroups = Object.entries(ageGroupTotals).map(([range, data]) => ({
      range,
      percentage: Math.round(data.total / data.count)
    }));

    // Aggregate gender data
    const genderTotals = { male: 0, female: 0, other: 0 };
    let genderCount = 0;

    demographicsArray.forEach(demo => {
      if (demo.gender) {
        genderTotals.male += demo.gender.male || 0;
        genderTotals.female += demo.gender.female || 0;
        genderTotals.other += demo.gender.other || 0;
        genderCount += 1;
      }
    });

    const aggregatedGender = genderCount > 0 ? {
      male: Math.round(genderTotals.male / genderCount),
      female: Math.round(genderTotals.female / genderCount),
      other: Math.round(genderTotals.other / genderCount)
    } : { male: 50, female: 50, other: 0 };

    return {
      age_groups: aggregatedAgeGroups,
      gender: aggregatedGender,
      estimated: demographicsArray.some(demo => demo.estimated)
    };
  }

  /**
   * Calculate competition density (venues per km²)
   */
  calculateCompetitionDensity(venueData, radius) {
    const areaKm2 = Math.PI * Math.pow(radius / 1000, 2);
    return parseFloat((venueData.length / areaKm2).toFixed(2));
  }

  /**
   * Calculate opportunity score (0-100)
   */
  calculateOpportunityScore(analysis) {
    // Scoring algorithm based on multiple factors
    const {
      average_daily_visits,
      competition_density,
      peak_hours,
      total_venues
    } = analysis;

    // Traffic score (higher traffic = higher opportunity)
    const trafficScore = Math.min(100, (average_daily_visits / 200) * 40);

    // Competition score (lower competition = higher opportunity)
    const competitionScore = Math.max(0, 40 - (competition_density * 5));

    // Diversity score (more spread out peak hours = better)
    const peakHourSpread = this.calculatePeakHourDiversity(peak_hours);
    const diversityScore = peakHourSpread * 20;

    return Math.round(trafficScore + competitionScore + diversityScore);
  }

  /**
   * Calculate peak hour diversity score
   */
  calculatePeakHourDiversity(peakHours) {
    if (peakHours.length < 2) return 0;

    // Calculate the spread of peak hours
    const minHour = Math.min(...peakHours);
    const maxHour = Math.max(...peakHours);
    const spread = maxHour - minHour;

    // Score based on how spread out the peak hours are
    return Math.min(1, spread / 12); // Normalize to 0-1
  }

  /**
   * Identify traffic trends
   */
  identifyTrafficTrends(venueData) {
    const trends = [];

    // Calculate average growth rates from comparison data
    const growthRates = {
      week: [],
      month: [],
      year: []
    };

    venueData.forEach(({ stats }) => {
      if (stats.comparison_data) {
        if (stats.comparison_data.vs_last_week !== undefined) {
          growthRates.week.push(stats.comparison_data.vs_last_week);
        }
        if (stats.comparison_data.vs_last_month !== undefined) {
          growthRates.month.push(stats.comparison_data.vs_last_month);
        }
        if (stats.comparison_data.vs_last_year !== undefined) {
          growthRates.year.push(stats.comparison_data.vs_last_year);
        }
      }
    });

    // Analyze trends
    Object.entries(growthRates).forEach(([period, rates]) => {
      if (rates.length > 0) {
        const avgGrowth = rates.reduce((a, b) => a + b) / rates.length;
        let trendDescription;

        if (avgGrowth > 0.1) {
          trendDescription = `Strong growth (+${(avgGrowth * 100).toFixed(1)}%)`;
        } else if (avgGrowth > 0.05) {
          trendDescription = `Moderate growth (+${(avgGrowth * 100).toFixed(1)}%)`;
        } else if (avgGrowth > -0.05) {
          trendDescription = 'Stable traffic patterns';
        } else if (avgGrowth > -0.1) {
          trendDescription = `Slight decline (${(avgGrowth * 100).toFixed(1)}%)`;
        } else {
          trendDescription = `Declining traffic (${(avgGrowth * 100).toFixed(1)}%)`;
        }

        trends.push({
          period: period,
          growth_rate: avgGrowth,
          description: trendDescription
        });
      }
    });

    return trends;
  }

  /**
   * Generate traffic insights
   */
  generateTrafficInsights(averageDailyVisits, competitionDensity, peakHours, demographics) {
    const insights = [];

    // Traffic volume insights
    if (averageDailyVisits > 300) {
      insights.push('High-traffic area with strong customer base');
    } else if (averageDailyVisits > 150) {
      insights.push('Moderate traffic area with good potential');
    } else {
      insights.push('Lower traffic area - consider marketing strategies');
    }

    // Competition insights
    if (competitionDensity < 5) {
      insights.push('Low competition density provides market opportunity');
    } else if (competitionDensity > 15) {
      insights.push('High competition requires strong differentiation');
    }

    // Peak hours insights
    const morningPeak = peakHours.some(h => h >= 7 && h <= 10);
    const lunchPeak = peakHours.some(h => h >= 11 && h <= 14);
    const dinnerPeak = peakHours.some(h => h >= 17 && h <= 20);

    if (morningPeak && lunchPeak && dinnerPeak) {
      insights.push('Consistent traffic throughout day - all-day dining opportunity');
    } else if (lunchPeak && dinnerPeak) {
      insights.push('Traditional meal-time peaks - standard restaurant hours optimal');
    } else if (morningPeak) {
      insights.push('Morning traffic peak - breakfast/cafe concept may work well');
    }

    // Demographic insights
    if (demographics.age_groups) {
      const youngDemographic = demographics.age_groups
        .filter(g => g.range.includes('18-24') || g.range.includes('25-34'))
        .reduce((sum, g) => sum + g.percentage, 0);

      if (youngDemographic > 60) {
        insights.push('Young demographic - consider trendy, social media-friendly concepts');
      }

      const matureDemographic = demographics.age_groups
        .filter(g => g.range.includes('45-54') || g.range.includes('55+'))
        .reduce((sum, g) => sum + g.percentage, 0);

      if (matureDemographic > 40) {
        insights.push('Mature demographic - focus on quality, service, and comfort');
      }
    }

    return insights;
  }

  /**
   * Calculate confidence level for the analysis
   */
  calculateAnalysisConfidence(venueData) {
    if (venueData.length === 0) return 0.1;

    const realDataVenues = venueData.filter(v => !v.stats.estimated).length;
    const totalVenues = venueData.length;
    
    // Base confidence on amount of real vs estimated data
    const realDataRatio = realDataVenues / totalVenues;
    
    // Confidence increases with more venues analyzed
    const volumeBonus = Math.min(0.2, totalVenues / 50 * 0.2);
    
    return Math.min(0.9, 0.3 + (realDataRatio * 0.5) + volumeBonus);
  }

  /**
   * Generate empty analysis for areas with no venues
   */
  generateEmptyAnalysis(location, radius) {
    return {
      location: {
        latitude: location.lat,
        longitude: location.lng,
        radius_meters: radius
      },
      total_venues: 0,
      average_daily_visits: 0,
      total_daily_visits: 0,
      peak_hours: [],
      hourly_distribution: [],
      demographic_profile: {
        age_groups: [],
        gender: { male: 50, female: 50, other: 0 },
        estimated: true
      },
      competition_density: 0,
      opportunity_score: 95,
      trends: [],
      insights: [
        'No dining establishments found in area',
        'Excellent opportunity for first-mover advantage',
        'Market research recommended to understand demand'
      ],
      confidence_level: 0.2,
      analysis_date: new Date().toISOString(),
      estimated_data: true
    };
  }

  /**
   * Get cached area analysis
   */
  async getCachedAreaAnalysis(location, radius) {
    if (!this.db) return null;

    try {
      const query = `
        SELECT * FROM area_traffic_analysis 
        WHERE latitude = $1 AND longitude = $2 AND radius_meters = $3 
        AND analysis_date = CURRENT_DATE
        AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY created_at DESC 
        LIMIT 1
      `;

      const result = await this.db.query(query, [
        parseFloat(location.lat.toFixed(4)),
        parseFloat(location.lng.toFixed(4)),
        radius
      ]);

      if (result.rows.length > 0) {
        const cached = result.rows[0];
        return {
          ...cached.venue_data,
          cached: true,
          cache_date: cached.created_at
        };
      }

      return null;
    } catch (error) {
      console.warn('⚠️ Error retrieving cached analysis:', error.message);
      return null;
    }
  }

  /**
   * Cache area analysis
   */
  async cacheAreaAnalysis(location, radius, analysis) {
    if (!this.db) return;

    try {
      // Set expiration to 4 hours from now
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 4);

      const query = `
        INSERT INTO area_traffic_analysis (
          latitude, longitude, radius_meters, total_venues, average_daily_visits,
          peak_hours, demographic_profile, competition_density, opportunity_score,
          venue_data, analysis_date, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_DATE, $11)
        ON CONFLICT (latitude, longitude, radius_meters, analysis_date)
        DO UPDATE SET
          total_venues = EXCLUDED.total_venues,
          average_daily_visits = EXCLUDED.average_daily_visits,
          peak_hours = EXCLUDED.peak_hours,
          demographic_profile = EXCLUDED.demographic_profile,
          competition_density = EXCLUDED.competition_density,
          opportunity_score = EXCLUDED.opportunity_score,
          venue_data = EXCLUDED.venue_data,
          expires_at = EXCLUDED.expires_at,
          created_at = NOW()
      `;

      await this.db.query(query, [
        parseFloat(location.lat.toFixed(4)),
        parseFloat(location.lng.toFixed(4)),
        radius,
        analysis.total_venues,
        analysis.average_daily_visits,
        JSON.stringify(analysis.peak_hours),
        JSON.stringify(analysis.demographic_profile),
        analysis.competition_density,
        analysis.opportunity_score,
        JSON.stringify(analysis),
        expiresAt
      ]);

      console.log('✅ Cached area traffic analysis');
    } catch (error) {
      console.warn('⚠️ Error caching analysis:', error.message);
      // Don't throw - caching is non-critical
    }
  }
}

module.exports = FootTrafficAnalytics;