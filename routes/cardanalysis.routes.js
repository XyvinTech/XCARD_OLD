import express from 'express';
import * as cardAnalysisController from '../controllers/cardanalysis.controller.js';
import { authorize, protect } from '../middlewares/auth.middleware.js';
import multer from 'multer';

/**
 * @route  Card Analysis Route
 * @desc   Route used for business card OCR analysis operations
 * @url    api/v1/cardanalysis
 */
const cardAnalysisRouter = express.Router({ mergeParams: true });

// Multer configuration for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for images
    fieldSize: 1 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Analyze business card route
cardAnalysisRouter
  .route('/analyze')
  .post(
    protect,
    authorize('admin', 'user', 'super'),
    upload.single('cardImage'),
    cardAnalysisController.analyzeCard
  );

// Save card data to profile route
cardAnalysisRouter
  .route('/save')
  .post(
    protect,
    authorize('admin', 'user', 'super'),
    cardAnalysisController.saveCardData
  );

// Get analysis history route
cardAnalysisRouter
  .route('/history')
  .get(
    protect,
    authorize('admin', 'user', 'super'),
    cardAnalysisController.getAnalysisHistory
  );

export default cardAnalysisRouter; 