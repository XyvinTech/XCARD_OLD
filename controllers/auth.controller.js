import asyncHandler from "../middlewares/async.middleware.js";
import admin from "firebase-admin";
import User from "../models/User.js";
import ErrorResponse from "../utils/error.response.js";
import Profile from "../models/Profile.js";

/**
 * @desc    Number Sign In User
 * @route   POST /api/v1/auth/login
 * @access  Private/User
 * @schema  Private
 */
export const loginUser = asyncHandler(async (req, res, next) => {
  // Get the Google OAuth token from the request
  const idToken = req.body.clientToken;
  // Verify the token with Firebase
  admin
    .auth()
    .verifyIdToken(idToken)
    .then(async function (decodedToken) {
      // Token is valid, create a custom token for the user
      const uid = decodedToken.uid;
      const user = await User.findOne({
        uid: uid,
      });
      let profiles;
      // To show the users admin in drawer,
      let profile;
      if (user?.role == "admin") {
        profiles = await Profile.findOne({ user: user.id });
      } else {
        profiles = await Profile.find({ user: user.id }).populate({
          path: "group",
        });
        const adminUser = await User.findById(profiles[0].group?.groupAdmin);
        profile = await Profile.findOne({ user: adminUser._id });
      }

      const token = user.getSignedJwtToken();
      return { user: user, profiles, profile, token: token };
    })
    .then(function (customToken) {
      const options = {
        expires: new Date(
          Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
      };
      // Send the custom token back to the client
      let message = { success: "Logged Successuly" };
      return res.status(200).cookie("token", customToken?.token, options).send({
        success: true,
        message,
        data: customToken,
        role: customToken?.user?.role,
      });
    })
    .catch(function (error) {
      // Token is invalid, return an error
      let message = { success: "Invalid Token" };
      return res.status(401).send({ success: false, message });
    });
});

/**
 * @desc    Check if user registered
 * @route   POST /api/v1/auth/checkuser
 * @access  Private/User
 * @schema  Private
 */
export const checkUser = asyncHandler(async (req, res, next) => {
  if (!req?.body?.phone) {
    return next(new ErrorResponse("Please pass phone number", 400));
  }
  const user = await User.findOne({ username: req?.body?.phone });
  if (user) {
    let message = { success: "User Registered" };
    return res.json({ success: true, message });
  }
  return next(new ErrorResponse("User not registered", 400));
});

/**
 * @desc    Get User Session
 * @route   GET /api/v1/auth/session
 * @access  Private/User
 * @schema  Private
 */
export const getUserSession = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  let profiles;
  // To show the users admin in drawer,
  let profile;
  if (user?.role == "admin") {
    profiles = await Profile.findOne({ user: user.id });
  } else {
    profiles = await Profile.find({ user: user.id }).populate({
      path: "group",
    });
    const adminUser = await User.findById(profiles[0].group?.groupAdmin);
    profile = await Profile.findOne({ user: adminUser._id });
  }

  let message = { success: "User Fetched" };
  return res.json({
    success: true,
    message,
    data: { user, profiles, profile },
    role: user?.role,
  });
});
