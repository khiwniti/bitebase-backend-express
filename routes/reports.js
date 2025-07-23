const express = require('express');
const router = express.Router();
const reportService = require('../services/reportService');

// Get all reports
router.get('/', async (req, res) => {
  try {
    const reports = await reportService.getAllReports();
    res.json({
      success: true,
      data: reports
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reports'
    });
  }
});

// Get specific report
router.get('/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const report = await reportService.getReport(reportId);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch report'
    });
  }
});

// Generate Sales Report
router.post('/generate/sales', async (req, res) => {
  try {
    const params = req.body;
    const report = await reportService.generateSalesReport(params);
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating sales report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate sales report'
    });
  }
});

// Generate Customer Report
router.post('/generate/customer', async (req, res) => {
  try {
    const params = req.body;
    const report = await reportService.generateCustomerReport(params);
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating customer report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate customer report'
    });
  }
});

// Generate Performance Report
router.post('/generate/performance', async (req, res) => {
  try {
    const params = req.body;
    const report = await reportService.generatePerformanceReport(params);
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating performance report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate performance report'
    });
  }
});

// Generate Market Analysis Report
router.post('/generate/market', async (req, res) => {
  try {
    const params = req.body;
    const report = await reportService.generateMarketAnalysisReport(params);
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating market analysis report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate market analysis report'
    });
  }
});

// Generate Competitor Report
router.post('/generate/competitor', async (req, res) => {
  try {
    const params = req.body;
    const report = await reportService.generateCompetitorReport(params);
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating competitor report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate competitor report'
    });
  }
});

// Generate Discovery Report
router.post('/generate/discovery', async (req, res) => {
  try {
    const params = req.body;
    const report = await reportService.generateDiscoveryReport(params);
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating discovery report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate discovery report'
    });
  }
});

// Download report as PDF
router.get('/:reportId/download', async (req, res) => {
  try {
    const { reportId } = req.params;
    const pdfPath = await reportService.generatePDF(reportId);
    
    res.download(pdfPath, `${reportId}.pdf`, (err) => {
      if (err) {
        console.error('Error downloading PDF:', err);
        res.status(500).json({
          success: false,
          error: 'Failed to download PDF'
        });
      }
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate PDF'
    });
  }
});

// Delete report
router.delete('/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const success = await reportService.deleteReport(reportId);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete report'
    });
  }
});

module.exports = router;