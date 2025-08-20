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
    console.log('=== FILE FILTER DEBUG ===');
    console.log('File object:', file);
    console.log('Field name:', file?.fieldname);
    console.log('Original name:', file?.originalname);
    console.log('Mimetype:', file?.mimetype);
    console.log('Size:', file?.size);
    console.log('=== FILE FILTER DEBUG ===');
    console.log('========================');
    
    // Very permissive check - accept anything that looks like an image
    if (!file) {
      console.log('❌ No file object received');
      cb(new Error('No file received'), false);
      return;
    }
    
    // Accept if it has image mimetype OR image file extension
    const hasImageMimetype = file.mimetype && file.mimetype.includes('image');
    const hasImageExtension = file.originalname && 
      /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(file.originalname);
    
    if (hasImageMimetype || hasImageExtension) {
      console.log('✅ File accepted - mimetype:', file.mimetype, 'name:', file.originalname);
      cb(null, true);
    } else {
      console.log('❌ File rejected - mimetype:', file.mimetype, 'name:', file.originalname);
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