import asyncHandler from '../middlewares/async.middleware.js';
import Tesseract from 'tesseract.js';
import CardAnalysis from '../models/CardAnalysis.js';
import Profile from '../models/Profile.js';
import ErrorResponse from '../utils/error.response.js';
import { uploadFile } from '../utils/file.upload.js';
import getRandomFileName from '../helpers/filename.helper.js';

/**
 * @desc    Analyze business card using OCR
 * @route   POST /api/v1/cardanalysis/analyze
 * @access  Private/User
 * @schema  Private
 */
export const analyzeCard = asyncHandler(async (req, res, next) => {
  const startTime = Date.now();
  
  console.log('=== CONTROLLER DEBUG ===');
  console.log('File in controller:', req.file ? 'File received' : 'No file');
  if (req.file) {
    console.log('File details:', {
      name: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size
    });
  }
  console.log('======================');
  
  if (!req.file) {
    return next(new ErrorResponse('Please upload a card image', 400));
  }

  // Upload the image to Firebase Storage
  const randomFileName = getRandomFileName('card-analysis-');
  const uploadedImage = await uploadFile(req.file, 'card-analysis', randomFileName);

  if (!uploadedImage) {
    return next(new ErrorResponse('Failed to upload image', 500));
  }

  try {
    // Perform OCR on the uploaded image
    const { data: { text, confidence } } = await Tesseract.recognize(req.file.buffer, 'eng', {
      logger: m => console.log(m) // Optional: log progress
    });

    const processingTime = Date.now() - startTime;

    // Extract specific data from OCR text
    const extractedData = extractBusinessCardData(text);

    // Save the analysis to database
    const cardAnalysis = await CardAnalysis.create({
      user: req.user.id,
      originalImage: uploadedImage,
      extractedData,
      rawOcrText: text,
      confidence,
      processingTime,
      status: 'completed'
    });

    let message = { success: 'Card analyzed successfully' };
    return res.status(200).json({
      success: true,
      message,
      data: {
        id: cardAnalysis._id,
        extractedData,
        rawOcrText: text,
        confidence,
        processingTime,
        originalImage: uploadedImage
      }
    });

  } catch (error) {
    console.error('OCR Error:', error);
    
    // Save failed analysis
    await CardAnalysis.create({
      user: req.user.id,
      originalImage: uploadedImage,
      extractedData: {},
      rawOcrText: '',
      confidence: 0,
      processingTime: Date.now() - startTime,
      status: 'failed'
    });

    return next(new ErrorResponse('Failed to analyze card', 500));
  }
});

/**
 * @desc    Save analyzed card data to user profile
 * @route   POST /api/v1/cardanalysis/save
 * @access  Private/User
 * @schema  Private
 */
export const saveCardData = asyncHandler(async (req, res, next) => {
  const { analysisId, profileId, selectedFields } = req.body;

  if (!analysisId) {
    return next(new ErrorResponse('Analysis ID is required', 400));
  }

  // Find the card analysis
  const cardAnalysis = await CardAnalysis.findById(analysisId);
  
  if (!cardAnalysis) {
    return next(new ErrorResponse('Card analysis not found', 404));
  }

  // Verify the analysis belongs to the current user
  if (cardAnalysis.user.toString() !== req.user.id) {
    return next(new ErrorResponse('Not authorized to access this analysis', 403));
  }

  // Find or create profile
  let profile;
  if (profileId) {
    profile = await Profile.findById(profileId);
    if (!profile) {
      return next(new ErrorResponse('Profile not found', 404));
    }
    // Verify the profile belongs to the current user
    if (profile.user.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized to access this profile', 403));
    }
  } else {
    // Create a new profile if profileId not provided
    profile = await Profile.create({
      user: req.user.id,
      visible: false // Set as not visible by default
    });
  }

  // Update profile with extracted data based on selected fields
  const updateData = {};
  const extractedData = cardAnalysis.extractedData;

  if (selectedFields?.name && extractedData.name) {
    updateData['profile.name'] = extractedData.name;
  }

  if (selectedFields?.business && extractedData.business) {
    updateData['profile.companyName'] = extractedData.business;
  }

  // Update contact information
  if (selectedFields?.phoneNumber && extractedData.phoneNumber) {
    // Find and update existing phone contact or add new one
    const phoneContact = profile.contact.contacts.find(contact => contact.type === 'phone');
    if (phoneContact) {
      phoneContact.value = extractedData.phoneNumber;
    } else {
      profile.contact.contacts.push({
        label: 'Phone',
        value: extractedData.phoneNumber,
        type: 'phone'
      });
    }
  }

  if (selectedFields?.email && extractedData.email) {
    // Find and update existing email contact or add new one
    const emailContact = profile.contact.contacts.find(contact => contact.type === 'email');
    if (emailContact) {
      emailContact.value = extractedData.email;
    } else {
      profile.contact.contacts.push({
        label: 'Email',
        value: extractedData.email,
        type: 'email'
      });
    }
  }

  if (selectedFields?.address && extractedData.address) {
    // Find and update existing address contact or add new one
    const addressContact = profile.contact.contacts.find(contact => contact.type === 'location');
    if (addressContact) {
      addressContact.value = extractedData.address;
    } else {
      profile.contact.contacts.push({
        label: 'Address',
        value: extractedData.address,
        type: 'location'
      });
    }
  }

  if (selectedFields?.website && extractedData.website) {
    // Add to websites array
    const existingWebsite = profile.website.websites.find(site => site.link === extractedData.website);
    if (!existingWebsite) {
      profile.website.websites.push({
        link: extractedData.website,
        name: extractedData.business || 'Business Website'
      });
      profile.website.status = true; // Enable website section
    }
  }

  // Update the profile with basic data
  if (Object.keys(updateData).length > 0) {
    await Profile.findByIdAndUpdate(profile._id, { $set: updateData });
  }

  // Save the profile with contact updates
  await profile.save();

  // Mark the card analysis as saved
  cardAnalysis.saved = true;
  cardAnalysis.savedToProfile = profile._id;
  await cardAnalysis.save();

  let message = { success: 'Card data saved to profile successfully' };
  return res.status(200).json({
    success: true,
    message,
    data: {
      profileId: profile._id,
      savedFields: selectedFields,
      analysisId: cardAnalysis._id
    }
  });
});

/**
 * @desc    Get user's card analysis history
 * @route   GET /api/v1/cardanalysis/history
 * @access  Private/User
 * @schema  Private
 */
export const getAnalysisHistory = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;
  
  const analyses = await CardAnalysis.find({ user: req.user.id })
    .populate('savedToProfile', 'profile.name card.theme')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await CardAnalysis.countDocuments({ user: req.user.id });

  let message = { success: 'Analysis history fetched successfully' };
  return res.status(200).json({
    success: true,
    message,
    data: {
      analyses,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    }
  });
});

/**
 * Helper function to extract business card data from OCR text
 */
function extractBusinessCardData(text) {
  const extractedData = {
    name: '',
    phoneNumber: '',
    email: '',
    address: '',
    website: '',
    business: ''
  };

  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  // Regular expressions for different data types
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const phoneRegex = /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}|\+?[0-9]{1,4}[-.\s]?[0-9]{6,14}/;
  const websiteRegex = /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/;

  let foundName = false;
  let foundBusiness = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Extract email
    if (!extractedData.email) {
      const emailMatch = line.match(emailRegex);
      if (emailMatch) {
        extractedData.email = emailMatch[0];
        continue;
      }
    }

    // Extract phone number
    if (!extractedData.phoneNumber) {
      const phoneMatch = line.match(phoneRegex);
      if (phoneMatch) {
        extractedData.phoneNumber = phoneMatch[0];
        continue;
      }
    }

    // Extract website
    if (!extractedData.website) {
      const websiteMatch = line.match(websiteRegex);
      if (websiteMatch) {
        let website = websiteMatch[0];
        if (!website.startsWith('http')) {
          website = 'https://' + website;
        }
        extractedData.website = website;
        continue;
      }
    }

    // Extract name (usually first non-contact line)
    if (!foundName && line.length > 2 && line.length < 50 && 
        !emailRegex.test(line) && !phoneRegex.test(line) && !websiteRegex.test(line)) {
      // Skip if it looks like a business name (all caps, contains common business words)
      const businessWords = ['LLC', 'INC', 'CORP', 'LTD', 'COMPANY', 'SOLUTIONS', 'SERVICES', 'GROUP'];
      const isBusinessName = businessWords.some(word => line.toUpperCase().includes(word)) || 
                            line === line.toUpperCase();
      
      if (!isBusinessName) {
        extractedData.name = line;
        foundName = true;
        continue;
      }
    }

    // Extract business name
    if (!foundBusiness && line.length > 2 && line.length < 100 &&
        !emailRegex.test(line) && !phoneRegex.test(line) && !websiteRegex.test(line)) {
      const businessWords = ['LLC', 'INC', 'CORP', 'LTD', 'COMPANY', 'SOLUTIONS', 'SERVICES', 'GROUP'];
      const isBusinessName = businessWords.some(word => line.toUpperCase().includes(word)) || 
                            (line === line.toUpperCase() && line.length > 5);
      
      if (isBusinessName) {
        extractedData.business = line;
        foundBusiness = true;
        continue;
      }
    }
  }

  // Extract address (remaining lines that don't match other patterns)
  const addressLines = lines.filter(line => 
    !emailRegex.test(line) && 
    !phoneRegex.test(line) && 
    !websiteRegex.test(line) &&
    line !== extractedData.name &&
    line !== extractedData.business &&
    line.length > 5
  );

  if (addressLines.length > 0) {
    extractedData.address = addressLines.join(', ');
  }

  return extractedData;
} 