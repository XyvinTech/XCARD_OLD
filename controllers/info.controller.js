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
 * @desc    Get profiles sorted by visit count with pagination, search and filter functionality
 * @route   GET /api/v1/information/trending-profiles
 * @access  Public
 * @schema  Public
 * @query   {string} [search] - Search across name, company, designation, bio, and theme
 * @query   {boolean} [searchInDesignation] - When true, search only in designation field
 * @query   {string} [profileName] - Filter by exact profile name
 * @query   {string} [companyName] - Filter by exact company name
 * @query   {string} [designation] - Filter by designation (partial match)
 * @query   {string} [exactDesignation] - Filter by exact designation (exact match only)
 * @query   {string} [theme] - Filter by card theme
 * @query   {number} [minVisits] - Minimum visit count
 * @query   {number} [maxVisits] - Maximum visit count
 * @query   {boolean} [visible] - Filter by visibility status
 * @query   {boolean} [isDisabled] - Filter by disabled status
 * @query   {number} [page=1] - Page number for pagination
 * @query   {number} [limit=20] - Number of results per page
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

  // Build base query
  let baseQuery = { 
    'profile.name': { $exists: true, $ne: '' },
    'visitCount': { $exists: true },
    'group': { $exists: true, $ne: null }
  };

  // Search functionality - search across multiple fields
  const searchTerm = req.query.search;
  const searchInDesignation = req.query.searchInDesignation;
  
  if (searchTerm) {
    // Escape special regex characters and create a more precise search
    const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // For multi-word searches, prioritize exact phrase matches
    const words = escapedSearchTerm.trim().split(/\s+/);
    
    if (searchInDesignation === 'true') {
      // Search only in designation field
      if (words.length === 1) {
        const searchRegex = new RegExp(escapedSearchTerm, 'i');
        baseQuery['profile.designation'] = searchRegex;
      } else {
        const exactPhraseRegex = new RegExp(escapedSearchTerm, 'i');
        baseQuery['profile.designation'] = exactPhraseRegex;
      }
    } else {
      // Search across all fields (original behavior)
      if (words.length === 1) {
        // Single word search - use simple regex
        const searchRegex = new RegExp(escapedSearchTerm, 'i');
        baseQuery.$or = [
          { 'profile.name': searchRegex },
          { 'profile.companyName': searchRegex },
          { 'profile.designation': searchRegex },
          { 'profile.bio': searchRegex },
          { 'card.theme': searchRegex }
        ];
      } else {
        // Multi-word search - prioritize exact phrase matches
        const exactPhraseRegex = new RegExp(escapedSearchTerm, 'i');
        
        baseQuery.$or = [
          // Exact phrase match (highest priority)
          { 'profile.name': exactPhraseRegex },
          { 'profile.companyName': exactPhraseRegex },
          { 'profile.designation': exactPhraseRegex },
          { 'profile.bio': exactPhraseRegex },
          { 'card.theme': exactPhraseRegex }
        ];
      }
    }
  }

  // Filter functionality
  const filters = {};
  
  // Filter by profile name
  if (req.query.profileName) {
    filters['profile.name'] = new RegExp(req.query.profileName, 'i');
  }
  
  // Filter by company name
  if (req.query.companyName) {
    filters['profile.companyName'] = new RegExp(req.query.companyName, 'i');
  }
  
  // Filter by designation
  if (req.query.designation) {
    filters['profile.designation'] = new RegExp(req.query.designation, 'i');
  }
  
  // Filter by exact designation (for more precise matching)
  if (req.query.exactDesignation) {
    filters['profile.designation'] = new RegExp(`^${req.query.exactDesignation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  }
  
  // Filter by card theme
  if (req.query.theme) {
    filters['card.theme'] = req.query.theme;
  }
  
  // Filter by visit count range
  if (req.query.minVisits) {
    filters.visitCount = { ...filters.visitCount, $gte: parseInt(req.query.minVisits) };
  }
  if (req.query.maxVisits) {
    filters.visitCount = { ...filters.visitCount, $lte: parseInt(req.query.maxVisits) };
  }
  
  // Filter by visibility
  if (req.query.visible !== undefined) {
    filters.visible = req.query.visible === 'true';
  }
  
  // Filter by disabled status
  if (req.query.isDisabled !== undefined) {
    filters.isDisabled = req.query.isDisabled === 'true';
  }

  // Combine base query with filters
  const finalQuery = { ...baseQuery, ...filters };

  // Added profile.profileLink to select statement
  const profiles = await Profile.find(finalQuery)
    .sort({ visitCount: -1 })
    .select('profile.name profile.companyName profile.designation profile.profilePicture profile.profileLink profile.bio visitCount group card.cardId card.theme visible isDisabled') // Added more fields for filtering
    .populate({
      path: 'group',
      select: 'name groupAdmin'
    })
    .skip(startIndex)
    .limit(limit);

  const totalValidProfiles = await Profile.countDocuments(finalQuery);

  const response = await Promise.all(
    profiles.map(async (profile) => {
      try {
        if (!profile.group) {
          return {
            profileLink: `https://app.visitingcard.store/profile/${profile.card?.cardId || profile._id}`, // Constructed link
            profileName: profile.profile.name,
            companyName: profile.profile.companyName || null,
            designation: profile.profile.designation || null,
            bio: profile.profile.bio || null,
            profilePicture: profile.profile.profilePicture?.link || null,
            visitCount: profile.visitCount,
            theme: profile.card?.theme || null,
            visible: profile.visible,
            isDisabled: profile.isDisabled,
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
          companyName: profile.profile.companyName || null,
          designation: profile.profile.designation || null,
          bio: profile.profile.bio || null,
          profilePicture: profile.profile.profilePicture?.link || null,
          visitCount: profile.visitCount,
          theme: profile.card?.theme || null,
          visible: profile.visible,
          isDisabled: profile.isDisabled,
        };
      } catch (error) {
        console.error(`Error processing profile ${profile._id}:`, error);
        return {
          profileLink: `https://app.visitingcard.store/profile/${profile.card?.cardId || profile._id}`, // Constructed link
          profileName: profile.profile.name,
          companyName: profile.profile.companyName || null,
          designation: profile.profile.designation || null,
          bio: profile.profile.bio || null,
          profilePicture: null,
          visitCount: profile.visitCount,
          theme: profile.card?.theme || null,
          visible: profile.visible,
          isDisabled: profile.isDisabled,
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
    filters: {
      search: searchTerm || null,
      appliedFilters: Object.keys(filters).length > 0 ? filters : null,
      availableFilters: {
        search: "Search across name, company, designation, bio, and theme (prioritizes exact phrase matches)",
        searchInDesignation: "When true, search only in designation field (use with search parameter)",
        profileName: "Filter by exact profile name",
        companyName: "Filter by exact company name", 
        designation: "Filter by designation (partial match)",
        exactDesignation: "Filter by exact designation (exact match only)",
        theme: "Filter by card theme (gold&black, white&black, violet&green, orange&black, aero&black, white&blue, blue&black, restaturants)",
        minVisits: "Minimum visit count",
        maxVisits: "Maximum visit count",
        visible: "Filter by visibility status (true/false)",
        isDisabled: "Filter by disabled status (true/false)"
      }
    }
  });
});