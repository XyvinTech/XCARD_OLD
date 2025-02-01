import asyncHandler from "../middlewares/async.middleware.js";
import Profile from "../models/Profile.js";
import User from "../models/User.js";
import Group from "../models/Group.js";

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
// export const getTrendingProfiles = asyncHandler(async (req, res, next) => {
//   const page = parseInt(req.query.page, 10) || 1;
//   const limit = parseInt(req.query.limit, 10) || 20;
//   const startIndex = (page - 1) * limit;

//   const profiles = await Profile.find({ 
//     'profile.name': { $exists: true, $ne: '' },  // Ensure profile has a name
//     'visitCount': { $exists: true }  // Ensure visit count exists
//   })
//     .sort({ visitCount: -1 })
//     .select('profile.name profile.companyName profile.designation profile.profilePicture visitCount')
//     .skip(startIndex)
//     .limit(limit);

//   const totalValidProfiles = await Profile.countDocuments({ 
//     'profile.name': { $exists: true, $ne: '' },
//     'visitCount': { $exists: true }
//   });

//   res.status(200).json({
//     success: true,
//     data: profiles,
//     pagination: {
//       page,
//       limit,
//       totalPages: Math.ceil(totalValidProfiles / limit),
//       totalResults: totalValidProfiles
//     }
//   });
// });


export const getTrendingProfiles = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const startIndex = (page - 1) * limit;

  // Added profile.profileLink to select statement
  const profiles = await Profile.find({ 
    'profile.name': { $exists: true, $ne: '' },
    'visitCount': { $exists: true },
    'group': { $exists: true, $ne: null }
  })
    .sort({ visitCount: -1 })
    .select('profile.name profile.companyName profile.designation profile.profilePicture profile.profileLink visitCount group card.cardId') // Added profile.profileLink and card.cardId
    .populate({
      path: 'group',
      select: 'name groupAdmin'
    })
    .skip(startIndex)
    .limit(limit);

  const totalValidProfiles = await Profile.countDocuments({ 
    'profile.name': { $exists: true, $ne: '' },
    'visitCount': { $exists: true },
    'group': { $exists: true, $ne: null }
  });

  const response = await Promise.all(
    profiles.map(async (profile) => {
      try {
        if (!profile.group) {
          return {
            profileLink: `https://app.visitingcard.store/profile/${profile.card?.cardId || profile._id}`, // Constructed link
            profileName: profile.profile.name,
            profilePicture: profile.profile.profilePicture?.link || null,
            visitCount: profile.visitCount,
            groupName: 'N/A',
            adminName: 'N/A'
          };
        }

        // First find the user profile associated with the group admin
        const adminProfile = await Profile.findOne({ 
          user: profile.group.groupAdmin 
        }).select('profile.name');

        return {
          groupName: profile.group.name,
          adminName: adminProfile?.profile?.name || 'N/A',
          profileLink: `https://app.visitingcard.store/profile/${profile.card?.cardId || profile._id}`, // Constructed link
          profileName: profile.profile.name,
          profilePicture: profile.profile.profilePicture?.link || null,
          visitCount: profile.visitCount,
        };
      } catch (error) {
        console.error(`Error processing profile ${profile._id}:`, error);
        return {
          profileLink: `https://app.visitingcard.store/profile/${profile.card?.cardId || profile._id}`, // Constructed link
          profileName: profile.profile.name,
          profilePicture: null,
          visitCount: profile.visitCount,
          groupName: profile.group?.name || 'Error',
          adminName: 'Error'
        };
      }
    })
  );

  res.status(200).json({
    success: true,
    data: response,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(totalValidProfiles / limit),
      totalResults: totalValidProfiles,
    },
  });
});