const fs = require('fs').promises;
const path = require('path');
const PDFDocument = require('pdfkit');

class ReportService {
  constructor() {
    this.reportsDir = path.join(__dirname, '../reports');
    this.ensureReportsDirectory();
  }

  async ensureReportsDirectory() {
    try {
      await fs.access(this.reportsDir);
    } catch {
      await fs.mkdir(this.reportsDir, { recursive: true });
    }
  }

  // Generate Sales Report
  async generateSalesReport(params) {
    const { dateRange, location, filters = {} } = params;
    
    const reportData = {
      id: `sales_${Date.now()}`,
      type: 'sales',
      title: 'Sales Performance Report',
      generatedAt: new Date().toISOString(),
      dateRange,
      location,
      data: {
        summary: {
          totalRevenue: 125000,
          totalOrders: 1250,
          averageOrderValue: 100,
          growthRate: 15.5
        },
        dailySales: this.generateMockDailySales(dateRange),
        topProducts: [
          { name: 'Pad Thai', sales: 45000, orders: 450 },
          { name: 'Green Curry', sales: 38000, orders: 380 },
          { name: 'Tom Yum Soup', sales: 32000, orders: 320 }
        ],
        hourlyDistribution: this.generateHourlyDistribution(),
        paymentMethods: {
          cash: 35,
          card: 45,
          digital: 20
        }
      },
      insights: [
        'Peak sales occur between 12:00-14:00 and 18:00-20:00',
        'Digital payments increased by 25% this month',
        'Pad Thai remains the top-selling item with consistent growth'
      ]
    };

    await this.saveReport(reportData);
    return reportData;
  }

  // Generate Customer Analytics Report
  async generateCustomerReport(params) {
    const { location, radius, analysisType } = params;
    
    const reportData = {
      id: `customer_${Date.now()}`,
      type: 'customer',
      title: 'Customer Demographics & Analytics Report',
      generatedAt: new Date().toISOString(),
      location,
      radius,
      data: {
        demographics: {
          totalCustomers: 2500,
          newCustomers: 350,
          returningCustomers: 2150,
          customerSegments: [
            {
              segment: 'Families with Children',
              percentage: 35,
              characteristics: ['Weekend dining', 'Larger orders', 'Kid-friendly preferences'],
              avgSpending: 120
            },
            {
              segment: 'Working Professionals',
              percentage: 40,
              characteristics: ['Lunch orders', 'Quick service', 'Higher spending'],
              avgSpending: 85
            },
            {
              segment: 'Students',
              percentage: 15,
              characteristics: ['Budget-conscious', 'Evening orders', 'Group dining'],
              avgSpending: 45
            },
            {
              segment: 'Tourists',
              percentage: 10,
              characteristics: ['Authentic cuisine', 'Photo-friendly', 'Cultural experience'],
              avgSpending: 95
            }
          ]
        },
        behaviorAnalysis: {
          visitFrequency: {
            daily: 5,
            weekly: 25,
            monthly: 45,
            occasional: 25
          },
          preferredTimes: [
            { time: '12:00-14:00', percentage: 35 },
            { time: '18:00-20:00', percentage: 40 },
            { time: '20:00-22:00', percentage: 15 },
            { time: 'Other', percentage: 10 }
          ]
        },
        marketOpportunities: [
          {
            opportunity: 'Family Meal Packages',
            potential: 'High',
            description: 'Large family segment suggests opportunity for family meal deals'
          },
          {
            opportunity: 'Lunch Express Menu',
            potential: 'High',
            description: 'Working professionals need quick lunch options'
          },
          {
            opportunity: 'Student Discounts',
            potential: 'Medium',
            description: 'Student segment is price-sensitive but loyal'
          }
        ]
      },
      insights: [
        'Working professionals represent the largest customer segment (40%)',
        'Peak dining times align with standard meal hours',
        'Family segment shows highest average spending per visit'
      ]
    };

    await this.saveReport(reportData);
    return reportData;
  }

  // Generate Performance Report
  async generatePerformanceReport(params) {
    const { dateRange, metrics } = params;
    
    const reportData = {
      id: `performance_${Date.now()}`,
      type: 'performance',
      title: 'Restaurant Performance Analytics',
      generatedAt: new Date().toISOString(),
      dateRange,
      data: {
        kpis: {
          customerSatisfaction: 4.6,
          averageWaitTime: 12,
          orderAccuracy: 98.5,
          staffEfficiency: 87
        },
        operationalMetrics: {
          tableUtilization: 78,
          kitchenEfficiency: 85,
          deliveryTime: 25,
          foodWaste: 3.2
        },
        financialMetrics: {
          profitMargin: 22.5,
          costOfGoods: 32,
          laborCost: 28,
          overheadCost: 17.5
        },
        trends: {
          customerGrowth: 15.5,
          revenueGrowth: 18.2,
          orderVolumeGrowth: 12.8
        }
      },
      recommendations: [
        'Optimize kitchen workflow to reduce wait times during peak hours',
        'Implement inventory management system to reduce food waste',
        'Consider staff training programs to improve efficiency'
      ]
    };

    await this.saveReport(reportData);
    return reportData;
  }

  // Generate Market Analysis Report
  async generateMarketAnalysisReport(params) {
    const { location, competitorAnalysis, marketSize } = params;
    
    const reportData = {
      id: `market_${Date.now()}`,
      type: 'market',
      title: 'Market Analysis & Competitive Intelligence',
      generatedAt: new Date().toISOString(),
      location,
      data: {
        marketOverview: {
          marketSize: 2500000,
          growthRate: 8.5,
          competitorCount: 45,
          marketShare: 12.5
        },
        competitorAnalysis: [
          {
            name: 'Thai Garden Restaurant',
            distance: 0.5,
            rating: 4.2,
            priceRange: '$$',
            strengths: ['Authentic cuisine', 'Good location'],
            weaknesses: ['Limited seating', 'Slow service']
          },
          {
            name: 'Bangkok Bistro',
            distance: 0.8,
            rating: 4.4,
            priceRange: '$$$',
            strengths: ['Premium ambiance', 'Excellent service'],
            weaknesses: ['High prices', 'Limited parking']
          }
        ],
        marketGaps: [
          'Fast-casual Thai dining',
          'Healthy Thai options',
          'Late-night Thai food'
        ],
        opportunities: [
          {
            opportunity: 'Health-Conscious Menu',
            market: 'Growing health food trend',
            potential: 'High'
          },
          {
            opportunity: 'Delivery Optimization',
            market: 'Increasing delivery demand',
            potential: 'Medium'
          }
        ]
      },
      insights: [
        'Market shows strong growth potential with 8.5% annual growth',
        'Limited competition in fast-casual segment',
        'Health-conscious dining trend presents opportunity'
      ]
    };

    await this.saveReport(reportData);
    return reportData;
  }

  // Generate Competitor Report
  async generateCompetitorReport(params) {
    const { location, radius, analysisDepth } = params;
    
    const reportData = {
      id: `competitor_${Date.now()}`,
      type: 'competitor',
      title: 'Competitive Analysis Report',
      generatedAt: new Date().toISOString(),
      location,
      radius,
      data: {
        competitorOverview: {
          totalCompetitors: 15,
          directCompetitors: 8,
          indirectCompetitors: 7,
          averageRating: 4.2
        },
        detailedAnalysis: [
          {
            name: 'Spice Garden',
            type: 'Direct Competitor',
            distance: 0.3,
            rating: 4.5,
            reviews: 1250,
            priceRange: '$$',
            cuisine: 'Thai',
            strengths: ['Authentic flavors', 'Fast service', 'Good value'],
            weaknesses: ['Limited seating', 'No delivery'],
            menuHighlights: ['Pad Thai', 'Green Curry', 'Mango Sticky Rice'],
            estimatedRevenue: 85000,
            marketShare: 8.5
          },
          {
            name: 'Golden Dragon',
            type: 'Indirect Competitor',
            distance: 0.6,
            rating: 4.1,
            reviews: 890,
            priceRange: '$$$',
            cuisine: 'Asian Fusion',
            strengths: ['Premium ambiance', 'Unique dishes'],
            weaknesses: ['High prices', 'Slow service'],
            menuHighlights: ['Fusion Curry', 'Dragon Roll', 'Sake Selection'],
            estimatedRevenue: 120000,
            marketShare: 12
          }
        ],
        swotAnalysis: {
          strengths: ['Unique positioning', 'Quality ingredients', 'Good location'],
          weaknesses: ['New brand', 'Limited marketing', 'Small team'],
          opportunities: ['Growing market', 'Digital presence', 'Catering services'],
          threats: ['Established competitors', 'Rising costs', 'Economic uncertainty']
        }
      },
      recommendations: [
        'Focus on unique value proposition to differentiate from competitors',
        'Invest in digital marketing to compete with established brands',
        'Consider competitive pricing strategy for market entry'
      ]
    };

    await this.saveReport(reportData);
    return reportData;
  }

  // Generate Discovery Report
  async generateDiscoveryReport(params) {
    const { location, objectives, timeline } = params;
    
    const reportData = {
      id: `discovery_${Date.now()}`,
      type: 'discovery',
      title: 'Market Discovery & Opportunity Analysis',
      generatedAt: new Date().toISOString(),
      location,
      objectives,
      data: {
        marketDiscovery: {
          demographicInsights: [
            'High concentration of young professionals (25-35 years)',
            'Growing expatriate community',
            'Increasing health consciousness'
          ],
          behaviorPatterns: [
            'Strong preference for authentic cuisine',
            'Increasing demand for delivery services',
            'Social media influence on dining choices'
          ],
          unmetNeeds: [
            'Healthy Thai food options',
            'Quick lunch solutions',
            'Late-night dining'
          ]
        },
        opportunityMapping: [
          {
            opportunity: 'Healthy Thai Cuisine',
            marketSize: 'Large',
            competition: 'Low',
            feasibility: 'High',
            timeline: '3-6 months'
          },
          {
            opportunity: 'Express Lunch Menu',
            marketSize: 'Medium',
            competition: 'Medium',
            feasibility: 'High',
            timeline: '1-3 months'
          },
          {
            opportunity: 'Late Night Service',
            marketSize: 'Small',
            competition: 'Low',
            feasibility: 'Medium',
            timeline: '6-12 months'
          }
        ],
        riskAssessment: {
          high: ['Economic downturn', 'Supply chain disruption'],
          medium: ['New competitors', 'Changing regulations'],
          low: ['Seasonal variations', 'Staff turnover']
        }
      },
      actionPlan: [
        'Conduct customer surveys to validate healthy food demand',
        'Develop prototype healthy menu items',
        'Test express lunch concept with limited menu',
        'Analyze late-night market feasibility'
      ]
    };

    await this.saveReport(reportData);
    return reportData;
  }

  // Helper methods
  generateMockDailySales(dateRange) {
    const sales = [];
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      sales.push({
        date: d.toISOString().split('T')[0],
        revenue: Math.floor(Math.random() * 5000) + 2000,
        orders: Math.floor(Math.random() * 50) + 20
      });
    }
    
    return sales;
  }

  generateHourlyDistribution() {
    const hours = [];
    for (let i = 0; i < 24; i++) {
      const hour = i.toString().padStart(2, '0') + ':00';
      let sales = 0;
      
      // Peak hours logic
      if (i >= 11 && i <= 14) sales = Math.floor(Math.random() * 1000) + 800; // Lunch
      else if (i >= 17 && i <= 21) sales = Math.floor(Math.random() * 1200) + 1000; // Dinner
      else if (i >= 7 && i <= 10) sales = Math.floor(Math.random() * 400) + 200; // Breakfast
      else sales = Math.floor(Math.random() * 200) + 50; // Off-peak
      
      hours.push({ hour, sales });
    }
    
    return hours;
  }

  // Save report to file system
  async saveReport(reportData) {
    const filename = `${reportData.id}.json`;
    const filepath = path.join(this.reportsDir, filename);
    await fs.writeFile(filepath, JSON.stringify(reportData, null, 2));
    return filepath;
  }

  // Get all reports
  async getAllReports() {
    try {
      const files = await fs.readdir(this.reportsDir);
      const reports = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filepath = path.join(this.reportsDir, file);
          const content = await fs.readFile(filepath, 'utf8');
          const report = JSON.parse(content);
          
          // Add file metadata
          const stats = await fs.stat(filepath);
          report.fileSize = stats.size;
          report.lastModified = stats.mtime;
          
          reports.push(report);
        }
      }
      
      return reports.sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));
    } catch (error) {
      console.error('Error getting reports:', error);
      return [];
    }
  }

  // Get specific report
  async getReport(reportId) {
    try {
      const filepath = path.join(this.reportsDir, `${reportId}.json`);
      const content = await fs.readFile(filepath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Error getting report:', error);
      return null;
    }
  }

  // Delete report
  async deleteReport(reportId) {
    try {
      const filepath = path.join(this.reportsDir, `${reportId}.json`);
      await fs.unlink(filepath);
      return true;
    } catch (error) {
      console.error('Error deleting report:', error);
      return false;
    }
  }

  // Generate PDF report
  async generatePDF(reportId) {
    const report = await this.getReport(reportId);
    if (!report) throw new Error('Report not found');

    const doc = new PDFDocument();
    const pdfPath = path.join(this.reportsDir, `${reportId}.pdf`);
    
    doc.pipe(require('fs').createWriteStream(pdfPath));
    
    // Header
    doc.fontSize(20).text(report.title, 50, 50);
    doc.fontSize(12).text(`Generated: ${new Date(report.generatedAt).toLocaleDateString()}`, 50, 80);
    doc.moveDown();

    // Content based on report type
    this.addPDFContent(doc, report);
    
    doc.end();
    
    return pdfPath;
  }

  addPDFContent(doc, report) {
    switch (report.type) {
      case 'sales':
        this.addSalesPDFContent(doc, report);
        break;
      case 'customer':
        this.addCustomerPDFContent(doc, report);
        break;
      case 'performance':
        this.addPerformancePDFContent(doc, report);
        break;
      default:
        doc.text('Report content will be displayed here.');
    }
  }

  addSalesPDFContent(doc, report) {
    const { data } = report;
    
    doc.fontSize(16).text('Sales Summary', 50, doc.y + 20);
    doc.fontSize(12)
       .text(`Total Revenue: $${data.summary.totalRevenue.toLocaleString()}`, 70, doc.y + 10)
       .text(`Total Orders: ${data.summary.totalOrders.toLocaleString()}`, 70, doc.y + 5)
       .text(`Average Order Value: $${data.summary.averageOrderValue}`, 70, doc.y + 5)
       .text(`Growth Rate: ${data.summary.growthRate}%`, 70, doc.y + 5);

    doc.fontSize(16).text('Top Products', 50, doc.y + 20);
    data.topProducts.forEach((product, index) => {
      doc.fontSize(12).text(`${index + 1}. ${product.name}: $${product.sales.toLocaleString()} (${product.orders} orders)`, 70, doc.y + 5);
    });

    doc.fontSize(16).text('Key Insights', 50, doc.y + 20);
    report.insights.forEach((insight, index) => {
      doc.fontSize(12).text(`• ${insight}`, 70, doc.y + 5);
    });
  }

  addCustomerPDFContent(doc, report) {
    const { data } = report;
    
    doc.fontSize(16).text('Customer Demographics', 50, doc.y + 20);
    doc.fontSize(12)
       .text(`Total Customers: ${data.demographics.totalCustomers.toLocaleString()}`, 70, doc.y + 10)
       .text(`New Customers: ${data.demographics.newCustomers.toLocaleString()}`, 70, doc.y + 5)
       .text(`Returning Customers: ${data.demographics.returningCustomers.toLocaleString()}`, 70, doc.y + 5);

    doc.fontSize(16).text('Customer Segments', 50, doc.y + 20);
    data.demographics.customerSegments.forEach((segment, index) => {
      doc.fontSize(14).text(`${segment.segment} (${segment.percentage}%)`, 70, doc.y + 10);
      doc.fontSize(12).text(`Average Spending: $${segment.avgSpending}`, 90, doc.y + 5);
      segment.characteristics.forEach(char => {
        doc.fontSize(10).text(`• ${char}`, 90, doc.y + 3);
      });
    });
  }

  addPerformancePDFContent(doc, report) {
    const { data } = report;
    
    doc.fontSize(16).text('Key Performance Indicators', 50, doc.y + 20);
    doc.fontSize(12)
       .text(`Customer Satisfaction: ${data.kpis.customerSatisfaction}/5.0`, 70, doc.y + 10)
       .text(`Average Wait Time: ${data.kpis.averageWaitTime} minutes`, 70, doc.y + 5)
       .text(`Order Accuracy: ${data.kpis.orderAccuracy}%`, 70, doc.y + 5)
       .text(`Staff Efficiency: ${data.kpis.staffEfficiency}%`, 70, doc.y + 5);

    doc.fontSize(16).text('Financial Metrics', 50, doc.y + 20);
    doc.fontSize(12)
       .text(`Profit Margin: ${data.financialMetrics.profitMargin}%`, 70, doc.y + 10)
       .text(`Cost of Goods: ${data.financialMetrics.costOfGoods}%`, 70, doc.y + 5)
       .text(`Labor Cost: ${data.financialMetrics.laborCost}%`, 70, doc.y + 5);
  }
}

module.exports = new ReportService();