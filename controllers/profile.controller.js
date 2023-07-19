import asyncHandler from "../middlewares/async.middleware.js";
import admin from "firebase-admin";
import User from "../models/User.js";
import Profile from "../models/Profile.js";
import ErrorResponse from "../utils/error.response.js";
import { uploadFiles } from "../utils/file.upload.js";
import getRandomFileName from "../helpers/filename.helper.js";

/**
 * @desc    Get user profile by id
 * @route   GET /api/v1/profile/:id
 * @access  Private/Admin Private/User
 * @schema  Private
 */
export const getProfile = asyncHandler(async (req, res, next) => {
  const profile = await Profile.findById(req?.params?.id).populate({
    path: "group",
  });
  let message = { success: "Profile Fetched Successfuly" };
  return res.status(200).send({ success: true, message, data: profile });
});

/**
 * @desc    Write Profile Write COunt
 * @route   POST /api/v1/profile/:id
 * @access  Private/Admin
 * @schema  Private
 */
export const updateProfile = asyncHandler(async (req, res, next) => {
  const profile = await Profile.findByIdAndUpdate(
    req?.params?.id,
    {
      $inc: { "card.cardWrited": 1 },
    },
    { new: true }
  ).populate({
    path: "group",
  });
  let message = { success: "Profile Writted Successfuly" };
  return res.status(200).send({ success: true, message, data: profile });
});

/**
 * @desc    Delete Profile
 * @route   DELETE /api/v1/profile/:id
 * @access  Private/Admin
 * @schema  Private
 */
export const deleteProfile = asyncHandler(async (req, res, next) => {
  const { id } = req?.params;
  const checkProfile = await Profile.findById(id).populate({
    path: "user",
  });
  const userProfilesCount = await Profile.find({
    user: checkProfile?.user._id,
  }).count();
  //Delete User If The User Has One Profle
  if (userProfilesCount == 1) {
    return admin
      .auth()
      .deleteUser(checkProfile?.user.uid)
      .then(async () => {
        //TODO: Delete All Profile, Product Images
        // Delete Mongo User Profile
        await User.findByIdAndDelete(checkProfile?.user?._id);
        await Profile.findByIdAndDelete(id);
        let message = { success: "Profile Deleted" };
        return res.status(200).send({ success: true, message });
      })
      .catch((err) => {
        return next(
          new ErrorResponse(`Something went wrong ${err?.errorInfo?.code}`, 400)
        );
      });
  }
  //TODO: Delete All Profile, Product Images
  await Profile.findByIdAndDelete(id);
  let message = { success: "Profile Deleted" };
  return res.status(200).send({ success: true, message });
});

/**
 * @desc    Public User EJS
 * @route   GET /api/v1/profile/view/:id
 * @access  Public
 * @schema  Public
 */
export const viewProfile = asyncHandler(async (req, res, next) => {
  console.log('viewProfile called');
  const profile = await Profile.findOneAndUpdate(
      { "card.cardId": req?.params?.id }, 
      { $inc: { visitCount: 1 } },
    );
  res.render("index", { data: profile });
});
