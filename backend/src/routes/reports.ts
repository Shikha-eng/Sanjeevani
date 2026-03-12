import { Router, Response } from 'express';
import { protect } from '../middleware/auth';
import { upload } from '../config/multer';
import Report from '../models/Report';
import { performOCR, generateReportSummary, extractKeyFindings, extractParameters } from '../utils/ocr';
import path from 'path';

const router = Router();

/**
 * @route   POST /api/reports/upload
 * @desc    Upload and process a medical report with OCR
 * @access  Private (Patient only)
 */
router.post(
  '/upload',
  protect,
  upload.single('report'),
  async (req: any, res: Response): Promise<void> => {
    try {
      // Check if user is a patient
      if (req.user.role !== 'patient') {
        res.status(403).json({
          success: false,
          message: 'Only patients can upload reports',
        });
        return;
      }

      // Check if file was uploaded
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'Please upload a report image',
        });
        return;
      }

      const { reportName, reportType } = req.body;

      if (!reportName) {
        res.status(400).json({
          success: false,
          message: 'Report name is required',
        });
        return;
      }

      console.log('Processing report with OCR...');
      
      // Perform OCR on the uploaded image
      const ocrResult = await performOCR(req.file.path);
      
      console.log(`OCR completed with ${ocrResult.confidence}% confidence`);

      // Generate summary and extract information
      const summary = generateReportSummary(ocrResult.text);
      const keyFindings = extractKeyFindings(ocrResult.text);
      const parameters = extractParameters(ocrResult.text);

      // Create report record
      const report = await Report.create({
        patientId: req.user._id,
        reportName,
        reportType: reportType || 'Other',
        imageUrl: `/uploads/reports/${req.file.filename}`,
        ocrText: ocrResult.text,
        summary,
        keyFindings,
        parameters,
      });

      res.status(201).json({
        success: true,
        message: 'Report uploaded and processed successfully',
        data: report,
      });
    } catch (error: any) {
      console.error('Report upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Error uploading report',
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/reports
 * @desc    Get all reports for the logged-in patient
 * @access  Private (Patient only)
 */
router.get('/', protect, async (req: any, res: Response): Promise<void> => {
  try {
    if (req.user.role !== 'patient') {
      res.status(403).json({
        success: false,
        message: 'Only patients can view reports',
      });
      return;
    }

    const reports = await Report.find({ patientId: req.user._id })
      .sort({ uploadDate: -1 });

    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching reports',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/reports/:id
 * @desc    Get a specific report by ID
 * @access  Private (Patient only)
 */
router.get('/:id', protect, async (req: any, res: Response): Promise<void> => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      res.status(404).json({
        success: false,
        message: 'Report not found',
      });
      return;
    }

    // Check if the report belongs to the user
    if (report.patientId.toString() !== req.user._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to access this report',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching report',
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/reports/:id
 * @desc    Delete a report
 * @access  Private (Patient only)
 */
router.delete('/:id', protect, async (req: any, res: Response): Promise<void> => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      res.status(404).json({
        success: false,
        message: 'Report not found',
      });
      return;
    }

    // Check if the report belongs to the user
    if (report.patientId.toString() !== req.user._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to delete this report',
      });
      return;
    }

    await report.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Report deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error deleting report',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/reports/recent/latest
 * @desc    Get the most recent reports (for dashboard)
 * @access  Private (Patient only)
 */
router.get('/recent/latest', protect, async (req: any, res: Response): Promise<void> => {
  try {
    if (req.user.role !== 'patient') {
      res.status(403).json({
        success: false,
        message: 'Only patients can view reports',
      });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 3;

    const reports = await Report.find({ patientId: req.user._id })
      .sort({ uploadDate: -1 })
      .limit(limit);

    res.status(200).json({
      success: true,
      data: reports,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching recent reports',
      error: error.message,
    });
  }
});

export default router;
