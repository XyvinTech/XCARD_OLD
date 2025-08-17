import asyncHandler from '../middlewares/async.middleware.js';
import admin from 'firebase-admin';
import User from '../models/User.js';
import axios from 'axios';
import Profile from '../models/Profile.js';
import ErrorResponse from '../utils/error.response.js';
import { uploadFiles, uploadFile } from '../utils/file.upload.js';
import getRandomFileName from '../helpers/filename.helper.js';
import QRCode from 'qrcode';
import { nanoid, customAlphabet } from 'nanoid';
import Setting from '../models/Setting.js';
const randomId = customAlphabet('0123456789ABCDEFGHIJKLMNOP', 8);

/**
 * @desc    Get user profile by id
 * @route   GET /api/v1/profile/:id
 * @access  Private/Admin Private/User
 * @schema  Private
 */
export const getProfile = asyncHandler(async (req, res, next) => {
  const profile = await Profile.findById(req?.params?.id).populate({
    path: 'group',
  });
  let message = { success: 'Profile Fetched Successfuly' };
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
      $inc: { 'card.cardWrited': 1 },
    },
    { new: true }
  ).populate({
    path: 'group',
  });
  let message = { success: 'Profile Writted Successfuly' };
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
    path: 'user',
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
        let message = { success: 'Profile Deleted' };
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
  let message = { success: 'Profile Deleted' };
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
    { 'card.cardId': req?.params?.id },
    { $inc: { visitCount: 1 } }
  );
  const result = await Setting.findOne({ _id: '64836d5124c08425ddd429fa' }, { "application.gamesEnabledPaths": 1, _id: 0 });
  const gamesEnabledPaths = result?.application?.gamesEnabledPaths || [];

  console.log('gamesEnabledPaths called', gamesEnabledPaths);

  const profileTheme = profile?.card?.theme;
  /*
  Themes

    'gold&black',
    'white&black',
    'violet&green',
    'orange&black',
    'white&blue',
    'blue&black'
    'restaturants'

  */

  if (profileTheme == 'gold&black') {
    res.render('gold-black', { data: profile });
  } else if (profileTheme == 'white&black') {
    res.render('white-black', { data: profile });
  } else if (profileTheme == 'orange&black') {
    res.render('orange-black', { data: profile });
  } else if (profileTheme == 'white&blue') {
    res.render('white-blue', { data: profile });
  } else if (profileTheme == 'blue&black') {
    res.render('blue-black', { data: profile });
  } else if (profileTheme == 'aero&black') {
    res.render('sky-blue', { data: profile });
  } else if (profileTheme == 'restaturants') {
    res.render('sienna', { data: profile , gamesEnabledPaths: gamesEnabledPaths});
  } else {
    res.render('index', { data: profile });
  }
});
/**
 * @desc    Public User EJS
 * @route   GET /api/v1/profile/view/:id
 * @access  Public
 * @schema  Public
 */
export const submitForm = asyncHandler(async (req, res, next) => {
  try {
    const { id, name, phone, email, message } = req.body;
    const profile = await Profile.findByIdAndUpdate(
      { _id: id },
      {
        $push: {
          'form.forms': {
            name: name,
            phone: phone,
            email: email,
            message: message,
          },
        },
        $inc: { 'form.status': 1 },
      },
      { new: true }
    ).populate('user', 'fcm_token');
    if (!profile || !profile.user) {
      throw new Error('Profile not found or user reference not available.');
    }
    let payload = {};
    const tokens = profile.user.fcm_token;
    const messaging = admin.messaging();
    const notificationStatus =
      profile.form.status == null ? 0 : profile.form.status;
    console.log(notificationStatus);
    await tokens.forEach(async (element) => {
      payload = {
        token: element,
        notification: {
          title: name,
          body: `${email}\nPhone: ${phone}\n${message}`,
          sound: 'default',
        },
        data: {
          status: `${notificationStatus}`,
          ...req.body,
        },
        android: {
          priority: 'high',
        },
        apns: {
          payload: {
            aps: {
              'content-available': true,
            },
          },
          fcm_options: {},
        },
      };
      await messaging.send(payload).then((message) => {
        console.log('message sent');
      });
    });
    res.status(200).json({ message: 'Form submission successful' });
  } catch (e) {
    console.log(e);
    res.status(500).json({ e });
  }
});

/**
 * @desc    Duplicate a profile
 * @route   POST /api/v1/profile/duplicate/:profileId
 * @access  Public (should be protected in production)
 */
export const duplicateProfile = asyncHandler(async (req, res, next) => {
  const { profileId } = req.params;
  const { name, email, phone } = req.body;
  let newProfile = null;

  // Debug logging
  console.log('Duplicate profile called with:', { profileId, name, email, phone });

  // 1. Find the profile to duplicate
  const profileToDuplicate = await Profile.findById(profileId);
  if (!profileToDuplicate) {
    return res.status(404).json({ success: false, message: 'Profile not found' });
  }

  // 2. Generate cardId and profileLink
  const cardId = `${name.toLowerCase().split(' ').join('')}-${randomId().toLowerCase()}`;
  const profileLink = `${process.env.HOST_URL_HTTPS}/profile/${cardId}`;

  // 3. Generate QR Code
  const qrOptions = {
    scale: 34,
    color: { dark: '#BEFF6C', light: '#1C1C1E' },
  };
  let qrImageUrl = '';
  try {
    const qrCode = await QRCode.toBuffer(profileLink, qrOptions);
    const qrFile = { buffer: qrCode, mimetype: 'image/jpeg' };
    qrImageUrl = await uploadFile(qrFile, 'cards', getRandomFileName('card-'));
  } catch (err) {
    console.error('QR code generation/upload failed:', err);
    return res.status(500).json({ success: false, message: 'QR code generation failed' });
  }

  // 4. Try to create a new Firebase user
  let user = null;
  let userRecord = null;
  try {
    userRecord = await admin.auth().createUser({
      email: email,
      password: phone,
      phoneNumber: phone,
      displayName: name,
      disabled: false,
    });
    user = await User.create({
      username: phone,
      uid: userRecord?.uid,
      role: 'user',
      providerData: userRecord?.providerData,
    });
  } catch (error) {
    // If user already exists, fetch user
    if (error?.errorInfo?.code === 'auth/phone-number-already-exists' || error?.errorInfo?.code === 'auth/email-already-exists') {
      try {
        if (error?.errorInfo?.code === 'auth/email-already-exists') {
          userRecord = await admin.auth().getUserByEmail(email);
        } else if (error?.errorInfo?.code === 'auth/phone-number-already-exists') {
          userRecord = await admin.auth().getUserByPhoneNumber(phone);
        }
        user = await User.findOne({ username: phone });
        if (!user) {
          user = await User.create({
            username: phone,
            uid: userRecord?.uid,
            role: 'user',
            providerData: userRecord?.providerData,
          });
        }
      } catch (fetchError) {
        console.error('Error fetching existing user:', fetchError);
        return res.status(500).json({ success: false, message: 'Error fetching existing user' });
      }
    } else {
      console.error('Firebase user creation error:', error);
      return res.status(500).json({ success: false, message: 'User creation failed' });
    }
  }

  // 5. Duplicate the profile data
  try {
    const duplicatedData = profileToDuplicate.toObject();
    delete duplicatedData._id;
    duplicatedData.profile.name = name;
    if (duplicatedData.contact && duplicatedData.contact.contacts) {
      duplicatedData.contact.contacts = duplicatedData.contact.contacts.map((contact) => {
        if (contact.type === 'phone') return { ...contact, value: phone };
        if (contact.type === 'email') return { ...contact, value: email };
        return contact;
      });
    }
    duplicatedData.user = user?.id;
    duplicatedData.card = {
      ...duplicatedData.card,
      cardId,
      theme: duplicatedData.card?.theme,
    };
    duplicatedData.profile = {
      ...duplicatedData.profile,
      profileLink,
      profileQR: qrImageUrl,
    };
    duplicatedData.visitCount = 0;
    duplicatedData.form = {
      status: 0,
      forms: [],
    };
    newProfile = new Profile(duplicatedData);
    await newProfile.save();
  } catch (duplicationError) {
    console.error('Profile duplication error:', duplicationError);
    return res.status(500).json({ success: false, message: 'Profile duplication failed' });
  }

  // 6. Respond with the new profile
  return res.status(201).json({ success: true, data: newProfile });
});

// Controller to check if games are enabled for a profile
export const getIsGamesEnabled = async (req, res, next) => {
  try {
    const { profileId } = req.params;

    // Find the setting document that holds the gamesEnabledPaths
    const setting = await Setting.findOne({_id: '64836d5124c08425ddd429fa'});
    const gamesEnabledPaths = setting?.application?.gamesEnabledPaths || [];
    // console.log('gamesEnabledPaths', gamesEnabled);
    // Check if the profileId is in the gamesEnabledPaths array
    const isGamesEnabled = gamesEnabledPaths.includes(profileId);

    // Respond with the result
    res.status(200).json({
      status: 'success',
      data: isGamesEnabled,
      // list: gamesEnabledPaths,
      
    });
  } catch (error) {
    // Handle any errors that occur
    next(new AppError('Error retrieving games enabled status', 500));
  }
};

// Controller to enable games for a profile
export const enableGames = async (req, res, next) => {
  try {
    const { profileId } = req.params;

    // Find the setting document that holds the gamesEnabledPaths
    const setting = await Setting.findOne({_id: '64836d5124c08425ddd429fa'});
    let gamesEnabledPaths = setting?.application?.gamesEnabledPaths || [];

    // Check if the profileId already exists in the array
    if (!gamesEnabledPaths.includes(profileId)) {
      // Add the profileId to the array
      gamesEnabledPaths.push(profileId);

      // Update the setting document with the new array
      await Setting.updateOne({_id: '64836d5124c08425ddd429fa'},
        { $set: { "application.gamesEnabledPaths": gamesEnabledPaths } }
      );
    }

    // Respond with the updated paths
    res.status(200).json({
      status: 'success',
      data: {
        gamesEnabledPaths,
      },
    });
  } catch (error) {
    // Handle any errors that occur
    next(new AppError('Error enabling games', 500));
  }
};

// Controller to disable games for a profile
export const disableGames = async (req, res, next) => {
  try {
    const { profileId } = req.params;

    // Find the setting document that holds the gamesEnabledPaths
    const setting = await Setting.findOne({_id: '64836d5124c08425ddd429fa'});
    let gamesEnabledPaths = setting?.application?.gamesEnabledPaths || [];

    // Check if the profileId exists in the array
    if (gamesEnabledPaths.includes(profileId)) {
      // Remove the profileId from the array
      gamesEnabledPaths = gamesEnabledPaths.filter(id => id !== profileId);

      // Update the setting document with the new array
      await Setting.updateOne({_id: '64836d5124c08425ddd429fa'},
        { $set: { "application.gamesEnabledPaths": gamesEnabledPaths } }
      );
    }

    // Respond with the updated paths
    res.status(200).json({
      status: 'success',
      data: {
        gamesEnabledPaths,
      },
    });
  } catch (error) {
    // Handle any errors that occur
    next(new AppError('Error disabling games', 500));
  }
};

