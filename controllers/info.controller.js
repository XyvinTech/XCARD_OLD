import asyncHandler from "../middlewares/async.middleware.js";
import Profile from "../models/Profile.js";

/**
 * @desc    Terms and Conditions
 * @route   GET /api/v1/information/terms
 * @access  Public
 * @schema  Public
 */
export const viewTerms = asyncHandler(async (req, res, next) => {
  res.render("terms");
});

/**
 * @desc    Privacy and {olicy}
 * @route   GET /api/v1/information/privacy
 * @access  Public
 * @schema  Public
 */
export const viewPrivacy = asyncHandler(async (req, res, next) => {
  res.render("privacy");
});

/**
 * @desc    Get profiles sorted by visit count with pagination
 * @route   GET /api/v1/information/trending-profiles
 * @access  Public
 * @schema  Public
 */
export const getTrendingProfiles = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const startIndex = (page - 1) * limit;

  const profiles = await Profile.find({ 
    'profile.name': { $exists: true, $ne: '' },  // Ensure profile has a name
    'visitCount': { $exists: true }  // Ensure visit count exists
  })
    .sort({ visitCount: -1 })
    .select('profile.name profile.companyName profile.designation profile.profilePicture visitCount')
    .skip(startIndex)
    .limit(limit);

  const totalValidProfiles = await Profile.countDocuments({ 
    'profile.name': { $exists: true, $ne: '' },
    'visitCount': { $exists: true }
  });

  res.status(200).json({
    success: true,
    data: profiles,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(totalValidProfiles / limit),
      totalResults: totalValidProfiles
    }
  });
});
