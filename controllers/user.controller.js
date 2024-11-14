import asyncHandler from '../middlewares/async.middleware.js';
import admin from 'firebase-admin';
import User from '../models/User.js';
import Profile from '../models/Profile.js';
import ErrorResponse from '../utils/error.response.js';
import {
  uploadBufferFile,
  deleteBufferFile,
  uploadFile,
  uploadFiles,
  deleteFileByUrl,
} from '../utils/file.upload.js';
import { nanoid, customAlphabet } from 'nanoid';
const randomId = customAlphabet('0123456789ABCDEFGHIJKLMNOP', 8);
import QRCode from 'qrcode';
import getRandomFileName from '../helpers/filename.helper.js';
import xlsx from 'xlsx';
import fs from 'fs';
import { Stream } from 'stream';
import getFileFromUrl from '../helpers/getfilefromurl.helper.js';
import { Buffer } from 'node:buffer';
import getSocialMedia from '../helpers/socialmediaregex.helper.js';
import { Types } from 'mongoose';
import Group from '../models/Group.js';
import Setting from '../models/Setting.js';
import Nodemailer from 'nodemailer';
import { query } from 'express';

/**
 * @desc    Create new user profile
 * @route   POST /api/v1/user/create
 * @access  Private/Admin
 * @schema  Private
 */
// Handler for creating a user profile
export const createUserProfile = asyncHandler(async (req, res, next) => {
  try {
    const { phone, update, theme, email } = req?.body;
    const all = JSON.parse(update);

    // Destructure properties from the update object
    const {
      profile,
      contact,
      social,
      website,
      category,
      video,
      service,
      document,
      certificate,
      award,
      bank,
      product,
      enquiry,
    } = all;

    // Check if user already exists
    let existingUser = await User.findOne({ username: phone });
    if (existingUser) {
      // If user exists, create a new profile for the existing user
      const userProfile = await Profile.create({
        user: existingUser._id,
        profile: profile,
        contact: contact,
        social: social,
        website: website,
        category: category,
        video: video,
        service: service,
        document: document,
        certificate: certificate,
        award: award,
        bank: bank,
        product: product,
        enquiry: enquiry
      });
      return res.status(201).json({ success: true, message: 'Profile created for existing user', data: userProfile });
    }

    // Proceed with creating a new user if not found
    console.log('[INFO] - Starting to create user profile...');

    // Upload files (profile images, banners, etc.)
    const images = await uploadFiles(req?.files, 'profiles', req?.body?.asFunction);

    // Generate QR Code for the profile
    const options = {
      scale: 34,
      color: {
        dark: '#BEFF6C', // dark color
        light: '#1C1C1E', // light color
      },
    };

    const cardId = `${profile?.name.toLowerCase().replace(/\s+/g, '')}-${randomId().toLowerCase()}`;
    const profileLink = `${process.env.HOST_URL_HTTPS}/profile/${cardId}`;
    const qrCode = await QRCode.toBuffer(profileLink, options);
    const qrFile = { buffer: qrCode, mimetype: 'image/jpeg' };

    // Trim and validate email format
    const trimmedEmail = email?.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      throw new ErrorResponse("Invalid email format.", 400);
    }

    console.log(`[DEBUG] - Creating Firebase user with email: ${trimmedEmail}`);

    // Create Firebase user
    const userRecord = await admin.auth().createUser({
      email: trimmedEmail,
      password: phone, // User's password
      phoneNumber: phone,
      displayName: profile?.name,
      disabled: false,
    });

    console.log(`[SUCCESS] - Firebase user created: ${userRecord?.uid}`);

    // Create a new user record in the application DB
    const user = await User.create({
      username: phone,
      uid: userRecord?.uid,
      role: 'user',
      providerData: userRecord?.providerData,
    });

    console.log(`[INFO] - User created in DB with ID: ${user?.id}`);

    // Upload QR Image
    const qrImageUrl = await uploadFile(qrFile, 'cards', getRandomFileName('card-'));
    console.log(`[INFO] - QR Code uploaded successfully.`);

    // Process and upload images for products, services, etc.
    const modifiedProduct = await processAndUploadImages(product?.products, 'product', 'products');
    const modifiedService = await processAndUploadImages(service?.services, 'service', 'services');
    const modifiedAward = await processAndUploadImages(award?.awards, 'award', 'awards');
    const modifiedCertificate = await processAndUploadImages(certificate?.certificates, 'certificate', 'certificates');

    // Create the Profile document
    const profileDoc = await Profile.create({
      user: user?.id,
      group: req?.query?.group,
      card: { cardId, theme },
      profile: {
        ...profile,
        profileLink,
        profilePicture: images?.find((obj) => obj.type === 'profile') || null,
        profileBanner: images?.find((obj) => obj.type === 'banner') || null,
        profileQR: qrImageUrl,
      },
      contact: {
        ...contact,
        status: contact?.contacts?.length > 0,
        contacts: filterEmptyFields(contact?.contacts),
      },
      social: {
        ...social,
        status: social?.socials?.length > 0,
        socials: filterSocialMedia(social?.socials),
      },
      website: {
        ...website,
        status: website?.websites?.length > 0,
        websites: filterEmptyFields(website?.websites),
      },
      category: {
        ...category,
        status: category?.categorys?.length > 0,
        categorys: filterEmptyFields(category?.categorys),
      },
      service: {
        ...service,
        status: modifiedService.length > 0,
        services: modifiedService,
      },
      document: {
        ...document,
        status: document?.documents?.length > 0,
        documents: filterEmptyFields(document?.documents),
      },
      award: {
        ...award,
        status: modifiedAward.length > 0,
        awards: modifiedAward,
      },
      certificate: {
        ...certificate,
        status: modifiedCertificate.length > 0,
        certificates: modifiedCertificate,
      },
      product: {
        ...product,
        status: modifiedProduct.length > 0,
        products: modifiedProduct,
      },
      bank: {
        ...bank,
        status: !!bank?.bankDetails?.accnumber,
        bankDetails: bank?.bankDetails,
      },
      video: {
        ...video,
        status: !!video?.link?.link,
        link: video?.link,
      },
      enquiry: {
        ...enquiry,
        status: !!enquiry?.email?.email,
        email: enquiry?.email,
      },
    });

    console.log('[SUCCESS] - Profile created successfully.');

    // Send a success response
    if (!req?.body?.asFunction) {
      return res.status(201).json({ success: true, message: 'User Profile Created', data: user });
    }

  } catch (error) {
    console.error('[ERROR] - An error occurred while creating the user profile:', error);
    return next(new ErrorResponse(`Something went wrong: ${error.message || error}`, 400));
  }
});

// Function to handle existing users
async function handleExistingUser(req, res, next) {
  const { phone, profile, theme } = req?.body;

  try {
    let user = await User.findOne({ username: phone });

    if (!user) {
      const userRecord = await admin.auth().getUserByPhoneNumber(phone);
      user = await User.create({
        username: phone,
        uid: userRecord?.uid,
        role: 'user',
        providerData: userRecord?.providerData,
      });
    }

    console.log('[INFO] - Existing user found. Creating additional profile.');

    const options = {
      scale: 34,
      color: {
        dark: '#BEFF6C',
        light: '#1C1C1E',
      },
    };

    const cardId = `${profile?.name.toLowerCase().replace(/\s+/g, '')}-${randomId().toLowerCase()}`;
    const profileLink = `${process.env.HOST_URL_HTTPS}/profile/${cardId}`;
    const qrCode = await QRCode.toBuffer(profileLink, options);
    const qrFile = { buffer: qrCode, mimetype: 'image/jpeg' };

    const qrImageUrl = await uploadFile(qrFile, 'cards', getRandomFileName('card-'));

    const modifiedProduct = await processAndUploadImages(req.body.product?.products, 'product', 'products');
    const modifiedService = await processAndUploadImages(req.body.service?.services, 'service', 'services');

    await Profile.create({
      user: user?.id,
      card: { cardId, theme },
      profile: {
        ...profile,
        profileLink,
        profileQR: qrImageUrl,
      },
      product: { products: modifiedProduct },
      service: { services: modifiedService },
    });

    console.log('[SUCCESS] - Additional profile created for existing user.');

    if (!req?.body?.asFunction) {
      return res.status(201).json({ success: true, message: 'User Profile Created', data: user });
    }

  } catch (error) {
    console.error('[ERROR] - Error handling existing user:', error);
    if (!req?.body?.asFunction) {
      return next(new ErrorResponse(`Error handling existing user: ${error.message || error}`, 400));
    }
  }
}

// Helper functions

// Filters out null or empty fields
function filterEmptyFields(items) {
  return items?.map((obj) => {
    const filteredObj = Object.fromEntries(
      Object.entries(obj).filter(([_, value]) => value !== null)
    );
    delete filteredObj['_id'];
    return filteredObj;
  }) || [];
}

// Handles social media input
function filterSocialMedia(socials) {
  return socials?.map((obj) => {
    const filteredObj = Object.fromEntries(
      Object.entries(obj).filter(([_, value]) => value !== null)
    );
    delete filteredObj['_id'];
    if (obj.type === 'other') {
      const getSocial = getSocialMedia(filteredObj?.value);
      return {
        label: getSocial === 'Other' ? 'Social Media' : getSocial,
        type: getSocial.toLowerCase(),
        value: filteredObj.value,
      };
    } else {
      return filteredObj;
    }
  }) || [];
}

// Processes and uploads images for various categories
async function processAndUploadImages(items, filePrefix, folderName) {
  return Promise.all(
    items?.map(async (item) => {
      const { _id, ...rest } = item; // Exclude _id from items
      if (rest?.file) {
        rest.file = await uploadFile(rest.file, folderName, getRandomFileName(filePrefix));
      }
      return rest;
    }) || []
  );
}


/**
 * @desc    Create new admin user profile
 * @route   POST /api/v1/user/createAdmin
 * @access  Public/Access
 * @schema  Public
 */
export const createAdminUserProfile = asyncHandler(async (req, res, next) => {
  const form = JSON.parse(req?.body?.form);
  await uploadFiles(req?.files, 'profiles')
    .then(async (images) => {
      const { phone, profile, contact, email } = form;

      admin
        .auth()
        .createUser({
          email: email,
          password: phone,
          phoneNumber: phone,
          displayName: profile?.name,
          disabled: false,
        })
        .then(async (userRecord) => {
          //If new user enters create single user and profile.
          const user = await User.create({
            username: phone,
            uid: userRecord?.uid,
            role: 'admin',
            providerData: userRecord?.providerData,
          });
          await Profile.create({
            user: user?.id,
            profile: {
              ...profile,
              companyName: profile?.name,
              profilePicture: images[0],
            },
            contact: {
              ...contact,
              status: true,
              contacts: contact?.contacts.map((obj) => {
                const filteredObj = Object.fromEntries(
                  Object.entries(obj).filter(([key, value]) => value !== null)
                );
                delete filteredObj['_id']; // remove the _id key from the filtered object
                return filteredObj;
              }),
            },
          });

          let message = { success: 'Admin User Profile Created' };
          return res.status(201).send({ success: true, message, data: user });
        })
        .catch(async (error) => {
          if (error?.errorInfo?.code === 'auth/phone-number-already-exists') {
            let user = await User.findOne({ username: phone });
            if (!user) {
              const userRecord = await admin.auth().getUserByPhoneNumber(phone);
              const user = await User.create({
                username: phone,
                uid: userRecord?.uid,
                role: 'admin',
                providerData: userRecord?.providerData,
              });
              await Profile.create({
                user: user?.id,
                profile: {
                  ...profile,
                  companyName: profile?.name,
                  profilePicture: images[0],
                },
                contact: {
                  ...contact,
                  status: true,
                  contacts: contact?.contacts.map((obj) => {
                    const filteredObj = Object.fromEntries(
                      Object.entries(obj).filter(
                        ([key, value]) => value !== null
                      )
                    );
                    delete filteredObj['_id']; // remove the _id key from the filtered object
                    return filteredObj;
                  }),
                },
              });

              let message = { success: 'Admin User Profile Created' };
              return res
                .status(201)
                .send({ success: true, message, data: user });
            }
          }
          return next(
            new ErrorResponse(`Error: ${error?.errorInfo?.message}`, 400)
          );
        });
    })
    .catch((err) => {
      console.log(err);
      return next(new ErrorResponse(`File upload failed ${err}`, 400));
    });
});

/**
 * @desc    Get All Admin Users
 * @route   GET /api/v1/user/admin
 * @access  Private/Super
 * @schema  Private
 */

export const getAllAdmin = asyncHandler(async (req, res, next) => {
  const profile = await Profile.aggregate([
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $unwind: {
        path: '$user',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: {
        'user.role': 'admin',
      },
    },
    {
      $lookup: {
        from: 'groups',
        localField: 'user._id',
        foreignField: 'groupAdmin',
        as: 'groups',
      },
    },
    {
      $lookup: {
        from: 'profiles',
        let: {
          groupIdList: '$groups._id',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ['$group', '$$groupIdList'],
              },
            },
          },
        ],
        as: 'profiles',
      },
    },
    {
      $addFields: {
        groupCount: {
          $size: '$groups',
        },
        profileCount: {
          $size: '$profiles',
        },
      },
    },
    {
      $project: {
        groups: 0,
        profiles: 0,
      },
    },
  ]);
  let message = { success: 'All Admin Users with Counts' };
  return res.status(200).send({ success: true, message, profile });
});

/**
 * @desc    Search All Admin Users with Count
 * @route   GET /api/v1/user/admin/search?query
 * @access  Private/Super
 * @schema  Private
 */

export const searchAllAdmin = asyncHandler(async (req, res, next) => {
  const searchQuery = req.query.query;
  const profile = await Profile.aggregate([
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $unwind: {
        path: '$user',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: {
        'user.role': 'admin',
        'profile.name': { $regex: searchQuery, $options: 'i' },
      },
    },
    {
      $lookup: {
        from: 'groups',
        localField: 'user._id',
        foreignField: 'groupAdmin',
        as: 'groups',
      },
    },
    {
      $lookup: {
        from: 'profiles',
        let: {
          groupIdList: '$groups._id',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ['$group', '$$groupIdList'],
              },
            },
          },
        ],
        as: 'profiles',
      },
    },
    {
      $addFields: {
        groupCount: {
          $size: '$groups',
        },
        profileCount: {
          $size: '$profiles',
        },
      },
    },
    {
      $project: {
        groups: 0,
        profiles: 0,
      },
    },
  ]);
  let message = { success: 'Search Results' };
  return res.status(200).send({ success: true, message, profile });
});

/**
 * @desc    Get all profiles of an admin
 * @route   GET /api/v1/user/admin/profile?admin
 * @access  Private/Super
 * @schema  Private
 */

export const getAllProfilesOfAdmin = asyncHandler(async (req, res, next) => {
  if (!req?.query?.admin) {
    return next(new ErrorResponse('Please provide admin id', 400));
  }
  const profiles = await Profile.aggregate([
    {
      $lookup: {
        from: 'groups',
        localField: 'group',
        foreignField: '_id',
        as: 'group',
      },
    },
    {
      $unwind: {
        path: '$group',
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $match: {
        'group.groupAdmin': new Types.ObjectId(req?.query?.admin),
      },
    },
  ]);
  let message = { success: 'All Admin Users' };
  return res.status(200).send({ success: true, message, profiles });
});

/**
 * @desc    Search all profiles of an admin
 * @route   GET /api/v1/user/admin/profile/search?admin&query?
 * @access  Private/Super
 * @schema  Private
 */

export const searchAllProfilesOfAdmin = asyncHandler(async (req, res, next) => {
  const searchQuery = req.query.query;
  if (!req?.query?.admin) {
    return next(new ErrorResponse('Please provide admin id', 400));
  }
  const profiles = await Profile.aggregate([
    {
      $lookup: {
        from: 'groups',
        localField: 'group',
        foreignField: '_id',
        as: 'group',
      },
    },
    {
      $unwind: {
        path: '$group',
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $match: {
        'group.groupAdmin': new Types.ObjectId(req?.query?.admin),
        'profile.name': { $regex: searchQuery, $options: 'i' },
      },
    },
  ]);
  let message = { success: 'All Admin Users' };
  return res.status(200).send({ success: true, message, profiles });
});

/**
 * @desc    Export all profiles, analytics of an admin
 * @route   GET /api/v1/user/admin/export?admin
 * @access  Private/Super
 * @schema  Private
 */

export const exportAdminData = asyncHandler(async (req, res, next) => {
  try {
    const superadmin = await Profile.findOne({
      user: new Types.ObjectId(req?.user?.id),
    });
    const admin = await Profile.findOne({
      user: new Types.ObjectId(req?.query?.admin),
    });
    const groups = await Group.aggregate([
      {
        $match: {
          groupAdmin: new Types.ObjectId(req?.query?.admin),
        },
      },
      {
        $lookup: {
          from: 'profiles',
          localField: '_id',
          foreignField: 'group',
          as: 'profiles',
        },
      },
      {
        $project: {
          name: 1,
          groupAdmin: 1,
          groupPicture: 1,
          createdAt: 1,
          updatedAt: 1,
          userCount: {
            $size: '$profiles',
          },
        },
      },
      {
        $sort: {
          userCount: -1,
        },
      },
    ]);
    const profiles = await Profile.aggregate([
      {
        $lookup: {
          from: 'groups',
          localField: 'group',
          foreignField: '_id',
          as: 'group',
        },
      },
      {
        $unwind: {
          path: '$group',
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $match: {
          'group.groupAdmin': new Types.ObjectId(req?.query?.admin),
        },
      },
      {
        $sort: {
          'group.name': 1,
        },
      },
    ]);

    const adminPhone = admin?.contact?.contacts?.filter(
      (item) => item.type === 'phone'
    )[0]?.value;
    const adminEmail = admin?.contact?.contacts?.filter(
      (item) => item.type === 'email'
    )[0]?.value;
    const superadminEmails = superadmin?.contact?.contacts
      ?.filter((item) => item.type === 'email')
      .map((item) => item.value);

    const superAdminEmailList = superadminEmails.join(', ');
    // Extract the specific fields from the data
    const extractedAdmin = [
      {
        Name: admin?.profile?.name,
        Bio: admin?.profile?.bio,
        Phone: adminPhone,
        Email: adminEmail,
        Created: admin.createdAt,
      },
    ];
    const extractedGroup = groups.map((item) => {
      return {
        Name: item?.name,
        Created: item.createdAt,
      };
    });
    const extractedData = profiles?.map((item) => {
      let bank;
      const phone = item?.contact?.contacts?.filter(
        (item) => item.type === 'phone'
      )[0]?.value;
      const email = item?.contact?.contacts?.filter(
        (item) => item.type === 'email'
      )[0]?.value;
      const social = item?.social?.socials
        ?.filter((obj) => obj?.value != null && obj?.value != '')
        ?.map((obj, inx) => {
          return `Social ${inx + 1} ${obj?.value}`;
        })
        .join(', ');
      const website = item?.website?.websites
        ?.filter((obj) => obj?.link != null && obj?.link != '')
        ?.map((obj, inx) => {
          return `Website ${inx + 1} ${obj?.link}`;
        })
        .join(', ');
      const skippedField = '_id';
      if (item?.bank) {
        bank = Object?.entries(item?.bank?.bankDetails)
          ?.map(function ([key, value]) {
            if (value == null || value == '' || value == undefined) return;
            else return key === skippedField ? '' : `${key}: ${value}`;
          })
          ?.filter(Boolean)
          ?.join(', ');
      }
      return {
        Name: item?.profile?.name,
        Group: item?.group?.name,
        Company: item?.profile?.companyName,
        Designation: item?.profile?.designation,
        Phone: phone,
        Email: email,
        Social: social,
        Website: website,
        Bank: bank ?? '',
        Created: item.createdAt,
      };
    });
    // Convert data to Excel worksheet
    const worksheet = xlsx.utils.json_to_sheet(extractedAdmin);
    const worksheet1 = xlsx.utils.json_to_sheet(extractedGroup);
    const worksheet2 = xlsx.utils.json_to_sheet(extractedData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Admin');
    xlsx.utils.book_append_sheet(workbook, worksheet1, 'Groups');
    xlsx.utils.book_append_sheet(workbook, worksheet2, 'Profiles');
    // Generate the Excel file
    const excelBuffer = xlsx.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });

    // Create a Nodemailer transporter
    const transporter = Nodemailer.createTransport({
      service: process.env.NODE_MAILER_PROVIDER,
      auth: {
        user: process.env.NODE_MAILER_USER,
        pass: process.env.NODE_MAILER_PASS,
      },
    });

    // Compose the email
    const mailOptions = {
      from: process.env.NODE_MAILER_USER,
      to: superAdminEmailList,
      subject: `${admin?.profile?.name} Exported Data`,
      text: 'Please find attached excel file.',
      attachments: [
        {
          filename: `${admin?.profile?.name.toLowerCase()}-exported-data.xlsx`,
          content: excelBuffer,
        },
      ],
    };
    // Send the email
    const info = await transporter.sendMail(mailOptions);
    let message = { success: `Export Data sent to ${superAdminEmailList}` };
    res.status(200).json({ message });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: 'An error occurred while sending the email' });
  }
});

/**
 * @desc    Get All Admin Analysis
 * @route   GET /api/v1/user/analytics
 * @access  Private/Super
 * @schema  Private
 */

export const getAdminAnalytics = asyncHandler(async (req, res, next) => {
  const profile = await Profile.aggregate([
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $unwind: {
        path: '$user',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: {
        'user.role': 'admin',
      },
    },
    {
      $lookup: {
        from: 'groups',
        localField: 'user._id',
        foreignField: 'groupAdmin',
        as: 'groups',
      },
    },
    {
      $lookup: {
        from: 'profiles',
        let: {
          groupIdList: '$groups._id',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ['$group', '$$groupIdList'],
              },
            },
          },
        ],
        as: 'profiles',
      },
    },
    {
      $addFields: {
        groupCount: {
          $size: '$groups',
        },
        profileCount: {
          $size: '$profiles',
        },
      },
    },
    {
      $project: {
        groups: 0,
        profiles: 0,
      },
    },
  ]);
  let message = { success: 'All Admin Users with Counts' };
  return res.status(200).send({ success: true, message, profile });
});

/**
 * @desc    Get Admin Analysis by id
 * @route   GET /api/v1/user/admin/analytics
 * @access  Private/Super
 * @schema  Private
 */

export const getSingleAdminAnalytics = asyncHandler(async (req, res, next) => {
  const [profile] = await Profile.aggregate([
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $unwind: {
        path: '$user',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: {
        'user.role': 'admin',
        'user._id': new Types.ObjectId(req?.query?.admin),
      },
    },
    {
      $lookup: {
        from: 'groups',
        localField: 'user._id',
        foreignField: 'groupAdmin',
        as: 'groups',
      },
    },
    {
      $lookup: {
        from: 'profiles',
        let: {
          groupIdList: '$groups._id',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ['$group', '$$groupIdList'],
              },
            },
          },
        ],
        as: 'profiles',
      },
    },
    {
      $addFields: {
        groupCount: {
          $size: '$groups',
        },
        profileCount: {
          $size: '$profiles',
        },
      },
    },
    {
      $project: {
        groups: 0,
        profiles: 0,
      },
    },
  ]);
  let message = { success: 'All Admin Users with Counts' };
  return res.status(200).send({ success: true, message, profile });
});

/**
 * @desc    Get All Admin Profile,Groups,Admins Count Analysis
 * @route   GET /api/v1/user/analytics/counts
 * @access  Private/Super
 * @schema  Private
 */

export const getAdminCountAnalytics = asyncHandler(async (req, res, next) => {
  const counts = await User.aggregate([
    {
      $match: {
        role: 'admin',
      },
    },
    {
      $group: {
        _id: 1,
        count: {
          $sum: 1,
        },
      },
    },
    {
      $addFields: {
        name: 'Total Admins',
      },
    },
    {
      $unionWith: {
        coll: 'groups',
        pipeline: [
          {
            $group: {
              _id: 2,
              count: {
                $sum: 1,
              },
            },
          },
          {
            $addFields: {
              name: 'Total Groups',
            },
          },
        ],
      },
    },
    {
      $unionWith: {
        coll: 'users',
        pipeline: [
          {
            $match: {
              role: 'user',
            },
          },
          {
            $group: {
              _id: 3,
              count: {
                $sum: 1,
              },
            },
          },
          {
            $addFields: {
              name: 'Total Profiles',
            },
          },
        ],
      },
    },
  ]);
  let message = { success: 'All User Counts' };
  return res.status(200).send({ success: true, message, counts: counts });
});

/**
 * @desc    Delete User Account
 * @route   DELETE /api/v1/user/delete
 * @access  Private/Admin Private/User
 * @schema  Private
 */

export const deleteUser = asyncHandler(async (req, res, next) => {
  //TODO Delete users linked product images and profile and banner images from google storage
  const { user } = req?.query;
  const userid = await User.findByIdAndDelete(user);
  admin.auth().deleteUser(userid?.uid);
  await Profile.deleteMany({ user: userid });
  let message = { success: 'User Account Deleted' };
  return res.status(200).send({ success: true, message });
});

/**
 * @desc    Delete Firebase Users All
 * @route   DELETE /api/v1/user/deleteFirebaseUsers
 * @access  Private/Admin Private/User
 * @schema  Private
 */

export const deleteFirebaseUser = asyncHandler(async (req, res, next) => {
  admin
    .auth()
    .listUsers()
    .then((listUsersResult) => {
      const deletePromises = listUsersResult.users.map((userRecord) => {
        return admin.auth().deleteUser(userRecord.uid);
      });

      return Promise.all(deletePromises);
    })
    .then(() => {
      return res.status(200).send({
        success: true,
        message: 'All Firebase users deleted successfully',
      });
    })
    .catch((error) => {
      return res
        .status(400)
        .send({ success: false, message: 'Error deleting Firebase users' });
    });
});
/**
 * @desc    Update User Profile
 * @route   POST /api/v1/user/update
 * @access  Private/Admin Private/User
 * @schema  Private
 */
export const updateUserProfile = asyncHandler(async (req, res, next) => {
  await uploadFiles(req?.files, 'profiles')
    .then(async (images) => {
      const { name, designation, companyName, bio, theme, labelUpdates } =
        req?.body;
      //TODO: Delete old profile picture from Firebase Storage
      const updateArray = JSON?.parse(req?.body?.update) ?? [];

      const updateStatusArray = JSON?.parse(req?.body?.status) ?? [];
      if (Array?.isArray(updateArray) && updateArray?.length > 0) {
        await mixinEngine(req, updateArray);
      }
      if (Array?.isArray(updateStatusArray) && updateStatusArray?.length > 0) {
        await statusEngine(req, updateStatusArray);
      }
      console.log(labelUpdates);
      var parsedLabelUpdates = labelUpdates;
      if (typeof parsedLabelUpdates === 'string') {
        try {
          parsedLabelUpdates = JSON.parse(labelUpdates);
        } catch (error) {
          console.error('Parsing error:', error);
          // Handle parsing error, perhaps set labelUpdates to null or []
          parsedLabelUpdates = null; // or []
        }
      }
      // New label updates handling
      if (Array.isArray(parsedLabelUpdates) && parsedLabelUpdates.length > 0) {
        const labelSetOperations = {};
        parsedLabelUpdates.forEach((update) => {
          const sectionKey = Object.keys(update)[0]; // Gets the section name, e.g., 'contact'
          const labelValue = update[sectionKey]; // Gets the new label value
          labelSetOperations[`${sectionKey}.label`] = labelValue; // Builds the $set operation
        });

        if (Object.keys(labelSetOperations).length > 0) {
          await Profile.findOneAndUpdate(
            {
              user: req?.query?.user ?? req?.user?.id,
              _id: req?.query?.profile,
            },
            {
              $set: labelSetOperations,
            },
            { new: true }
          );
        }
      }

      const profile = await Profile.findOneAndUpdate(
        {
          user: req?.query?.user ?? req?.user?.id,
          _id: req?.query?.profile,
        },
        {
          $set: {
            'card.theme': theme,
            'profile.name': name,
            'profile.designation': designation,
            'profile.companyName': companyName,
            'profile.bio': bio,
            'profile.profileBanner': images?.find(
              (obj) => obj.type === 'banner'
            ),
            'profile.profilePicture': images?.find(
              (obj) => obj.type === 'profile'
            ),
          },
        },
        { upsert: true, new: true }
      );
      let message = { success: 'User Profile Updated' };
      return res.status(200).send({ success: true, message, data: profile });
    })
    .catch((err) => {
      console.log(err);
      return next(new ErrorResponse(`File upload failed ${err}`, 400));
    });
});

/**
 * @desc    Update Admin Profile
 * @route   POST /api/v1/user/updateAdmin
 * @access  Private/Admin
 * @schema  Private
 */
export const updateAdminUserProfile = asyncHandler(async (req, res, next) => {
  let image;

  try {
    if (req?.file)
      image = await uploadFile(
        req?.file,
        'profiles',
        getRandomFileName('profile-')
      );
    function isObject(value) {
      return typeof value === 'object' && value !== null;
    }
    //TODO: Delete old profile picture from Firebase Storage
    const updateArray = JSON?.parse(req?.body?.update) ?? [];
    if (Array?.isArray(updateArray) && updateArray?.length > 0) {
      await mixinEngine(req, updateArray);
    }
    //UPDATE USER COLLECTION
    if (req?.body?.uid) {
      const user = await User.findOneAndUpdate(
        { _id: req?.query?.admin ? req?.query?.admin : req?.user?.id },
        {
          $set: {
            username: req?.body?.phone,
            uid: req?.body.uid,
            'providerData.0.uid': req?.body?.phone,
            'providerData.0.phoneNumber': req?.body?.phone,
          },
        },
        { new: true }
      );
      await Profile.updateMany(
        { user: req?.query?.admin ? req?.query?.admin : req?.user?.id },
        {
          $set: {
            'contact.contacts.0.value': req?.body?.phone,
          },
        }
      );
    }
    //UPDATE USER ENDED

    if (image !== undefined) {
      await Profile.updateMany(
        { user: req?.query?.admin ? req?.query?.admin : req?.user?.id },
        {
          $set: {
            profile: {
              ...req?.body,
              name: req?.body?.companyName,
              companyName: req?.body?.companyName,
              profilePicture: image,
            },
          },
        },
        { new: true }
      );
      const profile = await Profile.findOne({
        user: req?.query?.admin ? req?.query?.admin : req?.user?.id,
      });
      let message = { success: 'Admin User Profile Updated' };
      return res.status(200).send({ success: true, message, data: profile });
    } else {
      let phone;
      if (req?.body?.phone) phone = req?.body.phone;
      await Profile.updateMany(
        { user: req?.query?.admin ? req?.query?.admin : req?.user?.id },
        {
          $set: {
            'profile.name': req?.body?.companyName,
            'profile.companyName': req?.body?.companyName,
            'profile.bio': req?.body?.bio,
          },
        },
        { new: true }
      );
      let message = { success: 'Admin User Profile Updated' };
      const profile = await Profile.findOne({
        user: req?.query?.admin ? req?.query?.admin : req?.user?.id,
      });
      return res.status(200).send({ success: true, message, data: profile });
    }
  } catch (err) {
    console.log(err);
    return next(new ErrorResponse(`File upload failed ${err}`, 400));
  }
});
/**
 * @desc    Update user contact in user collection
 * @route   POST /api/v1/user/updateUserContact
 * @access  Private/Admin
 * @schema  Private
 */
export const updateUserContact = asyncHandler(async (req, res, next) => {
  try {
    //UPDATE USER COLLECTION
    let phone = req?.body?.phone;
    const user = await User.findOneAndUpdate(
      { _id: req?.user?.id },
      {
        $set: {
          username: phone,
          uid: req?.body?.uid,
          'providerData.0.uid': phone,
          'providerData.0.phoneNumber': phone,
        },
      },
      { new: true }
    );
    let message = { success: 'Successfully updated user contact' };
    //UPDATE USER ENDED
    return res.status(200).send({ success: true, message, user });
  } catch (err) {
    console.log(err);
    return next(new ErrorResponse(`${err}`, 400));
  }
});
/**
 * @desc    Enable disable admin users or any. only super admin can access this
 * @route   POST /api/v1/user/updateUserContact
 * @access  Private/Admin
 * @schema  Private
 */
export const enableDisableUser = asyncHandler(async (req, res, next) => {
  try {
    //UPDATE USER COLLECTION
    let phone = req.body.phone;
    if (!phone)
      return res
        .status(400)
        .send({ success: false, message: 'Please enter phone number' });
    const user = await User.findOneAndUpdate(
      { username: phone },
      {
        $set: {
          isDisabled: req?.body?.isDisabled,
        },
      },
      { new: true }
    );
    let message = { success: 'Successfully updated user contact' };
    //UPDATE USER ENDED
    return res.status(200).send({ success: true, message, user });
  } catch (err) {
    console.log(err);
    return next(new ErrorResponse(`${err}`, 400));
  }
});
/**
 * @desc    Update user contact in user collection
 * @route   POST /api/v1/user/updateUserContact
 * @access  Private/Admin
 * @schema  Private
 */
export const enableDisableProfile = asyncHandler(async (req, res, next) => {
  try {
    //UPDATE USER COLLECTION
    let id = req.body.id;
    if (!id)
      return res
        .status(400)
        .send({ success: false, message: `Profile not found with id: ${id}` });
    const user = await Profile.updateOne(
      { _id: id },
      {
        $set: {
          isDisabled: req?.body?.isDisabled,
        },
      },
      { new: true }
    );
    let message = { success: 'Successfully updated profile' };
    //UPDATE USER ENDED
    return res.status(200).send({ success: true, message, user });
  } catch (err) {
    console.log(err);
    return next(new ErrorResponse(`${err}`, 400));
  }
});

export const enableDisableEditing = asyncHandler(async (req, res, next) => {
  try {
    //UPDATE USER COLLECTION
    let id = req.body.id;
    if (!id)
      return res
        .status(400)
        .send({ success: false, message: `Profile not found with id: ${id}` });
    const user = await Profile.updateOne(
      { _id: id },
      {
        $set: {
          disabledEditing: req?.body?.disabledEditing,
        },
      },
      { new: true }
    );
    let message = { success: 'Successfully updated profile' };
    //UPDATE USER ENDED
    return res.status(200).send({ success: true, message, user });
  } catch (err) {
    console.log(err);
    return next(new ErrorResponse(`${err}`, 400));
  }
});

/**
 * @desc    Update Admin Profile
 * @route   POST /api/v1/user/updateSuperAdmin
 * @access  Private/Admin
 * @schema  Private
 */
export const updateSuperAdminUserProfile = asyncHandler(
  async (req, res, next) => {
    await uploadFile(req?.file, 'profiles', getRandomFileName('profile-'))
      .then(async (image) => {
        function isObject(value) {
          return typeof value === 'object' && value !== null;
        }
        //TODO: Delete old profile picture from Firebase Storage
        const updateArray = JSON?.parse(req?.body?.update) ?? [];
        if (Array?.isArray(updateArray) && updateArray?.length > 0) {
          mixinEngineAdmin(req, updateArray);
        }
        if (image !== undefined) {
          const profile = await Profile.findOneAndUpdate(
            { user: req?.query?.admin ? req?.query?.admin : req?.user?.id },
            {
              $set: {
                profile: {
                  ...req?.body,
                  name: req?.body?.companyName,
                  companyName: req?.body?.companyName,
                  profilePicture: image,
                },
              },
            },
            { new: true }
          );
          let message = { success: 'Admin User Profile Updated' };
          return res
            .status(200)
            .send({ success: true, message, data: profile });
        } else {
          const profile = await Profile.findOneAndUpdate(
            { user: req?.query?.admin ? req?.query?.admin : req?.user?.id },
            {
              $set: {
                'profile.name': req?.body?.companyName,
                'profile.companyName': req?.body?.companyName,
                'profile.bio': req?.body?.bio,
              },
            },
            { new: true }
          );
          let message = { success: 'Admin User Profile Updated' };
          return res
            .status(200)
            .send({ success: true, message, data: profile });
        }
      })
      .catch((err) => {
        return next(new ErrorResponse(`File upload failed ${err}`, 400));
      });
  }
);

async function mixinEngine(req, array) {
  const validAddSection = [
    'social',
    'website',
    'category',
    'service',
    'document',
    'award',
    'certificate',
    'product',
  ];
  const validEditSection = [
    ...validAddSection,
    'contact',
    'bank',
    'video',
    'enquiry',
  ];

  const validDeleteSection = [...validAddSection, 'video'];
  const add = [];
  const addProduct = [];
  const editProduct = [];
  const addService = [];
  const editService = [];
  const addAward = [];
  const editAward = [];
  const addCertificate = [];
  const editCertificate = [];
  const editCategory = [];
  const addDocument = [];
  const editDocument = [];
  const edit = [];
  const del = [];
  //Sort All the actions and send to different mixins
  for (let index = 0; index < array.length; index++) {
    const element = array[index];
    if (element.action === 'add') {
      if (
        validAddSection.includes(element.section) &&
        element.section === 'product'
      ) {
        addProduct.push(element);
      } else if (
        validAddSection.includes(element.section) &&
        element.section === 'service'
      ) {
        addService.push(element);
      } else if (
        validAddSection.includes(element.section) &&
        element.section === 'document'
      ) {
        addDocument.push(element);
      } else if (
        validAddSection.includes(element.section) &&
        element.section === 'award'
      ) {
        addAward.push(element);
      } else if (
        validAddSection.includes(element.section) &&
        element.section === 'certificate'
      ) {
        addCertificate.push(element);
      } else add.push(element);
    }
    if (element.action === 'edit') {
      if (
        validEditSection.includes(element.section) &&
        element.section === 'product'
      ) {
        editProduct.push(element);
      } else if (
        validEditSection.includes(element.section) &&
        element.section === 'service'
      ) {
        editService.push(element);
      } else if (
        validEditSection.includes(element.section) &&
        element.section === 'document'
      ) {
        editDocument.push(element);
      } else if (
        validEditSection.includes(element.section) &&
        element.section === 'award'
      ) {
        editAward.push(element);
      } else if (
        validEditSection.includes(element.section) &&
        element.section === 'certificate'
      ) {
        editCertificate.push(element);
      } else if (
        validEditSection.includes(element.section) &&
        element.section === 'category'
      ) {
        editCategory.push(element);
      } else edit.push(element);
    }
    if (element.action === 'delete') {
      validDeleteSection.includes(element.section) && del.push(element);
    }
  }

  add.length > 0 && mixinEngineAdd(req, add);
  del.length > 0 && (await mixinEngineDelete(req, del));
  edit.length > 0 && mixinEngineEdit(req, edit);
  // Only for product
  addProduct.length > 0 && (await mixinEngineAddProduct(req, addProduct));
  editProduct.length > 0 && (await mixinEngineEditProduct(req, editProduct));

  //Only for service
  addService.length > 0 &&
    (await mixinEngineAddService(req, addService, 'service'));
  editService.length > 0 &&
    (await mixinEngineEditService(req, editService, 'service'));

  //Only for document
  addDocument.length > 0 &&
    (await mixinEngineAddService(req, addDocument, 'document'));
  editDocument.length > 0 &&
    (await mixinEngineEditService(req, editDocument, 'document'));

  //Only for award
  addAward.length > 0 && (await mixinEngineAddService(req, addAward, 'award'));
  editAward.length > 0 &&
    (await mixinEngineEditService(req, editAward, 'award'));

  //Only for certificate
  addCertificate.length > 0 &&
    (await mixinEngineAddService(req, addCertificate, 'certificate'));
  editCertificate.length > 0 &&
    (await mixinEngineEditService(req, editCertificate, 'certificate'));

  // Only for category
  editCategory.length > 0 && (await mixinEngineEditCategory(req, editCategory));
}

async function mixinEngineAdmin(req, array) {
  const validAddSection = [
    'contact',
    'website',
    'category',
    'service',
    'award',
    'certificate',
    'product',
  ];
  const validEditSection = [
    ...validAddSection,
    // "contact",
    'bank',
    'video',
    'enquiry',
  ];
  const add = [];
  const edit = [];
  //Sort All the actions and send to different mixins
  for (let index = 0; index < array.length; index++) {
    const element = array[index];
    if (element.action === 'add') {
      validAddSection.includes(element.section) && add.push(element);
    }
    if (element.action === 'edit') {
      validEditSection.includes(element.section) && edit.push(element);
    }
  }
  add.length > 0 && mixinEngineAdminAdd(req, add);
  edit.length > 0 && mixinEngineAdminEdit(req, edit);
}

async function statusEngine(req, array) {
  const status = [];
  //Sort All the actions and send to different mixins
  for (let index = 0; index < array.length; index++) {
    const element = array[index];
    if (element.action === 'status') {
      status.push(element);
    }
  }
  status.length > 0 && mixinEngineStatus(req, status);
}
/**
 * @desc   Mixin Admin Add
 * @model  {
      "section":"sectionName",
      "action":"add",
      "data":{}
   }
 */
async function mixinEngineAdminAdd(req, array) {
  const updates = array.map((item) => {
    const { _id, ...rest } = item.data;
    let update;
    let query;
    query = {
      user: req?.query?.admin,
    };
    update = {
      $push: {
        [`${item?.section}.${item?.section}s`]: rest,
      },
    };
    return { query, update };
  });
  Promise.all(
    updates.map(({ query, update }) => Profile.updateOne(query, update))
  )
    .then((results) => {
      console.log(`${results.length} items added.`);
    })
    .catch((error) => console.error(error));
}

/**
 * @desc   Mixin Add
 * @model  {
      "section":"sectionName",
      "action":"add",
      "data":{}
   }
 */
async function mixinEngineAdd(req, array) {
  const updates = array.map((item) => {
    const { _id, ...rest } = item.data;
    let update;
    let query;
    // Only for social section
    if (item?.section == 'social') {
      const getSocial = getSocialMedia(rest?.value);
      const socialmedia = {
        label: getSocial === 'Other' ? 'Social Media' : getSocial,
        type: getSocial.toLowerCase(),
      };
      query = {
        user: req?.query?.user ?? req?.user?.id,
        _id: req?.query?.profile,
      };
      update = {
        $push: {
          [`${item?.section}.${item?.section}s`]: { ...rest, ...socialmedia },
        },
      };
    } else {
      query = {
        user: req?.query?.user ?? req?.user?.id,
        _id: req?.query?.profile,
      };
      update = {
        $push: {
          [`${item?.section}.${item?.section}s`]: rest,
        },
      };
    }
    return { query, update };
  });
  Promise.all(
    updates.map(({ query, update }) => Profile.updateOne(query, update))
  )
    .then((results) => {
      console.log(`${results.length} items added.`);
    })
    .catch((error) => console.error(error));
}
/**
 * @desc   Mixin Add Service
 * @model  {
      "section":"sectionName",
      "action":"add",
      "data":{}
   }
 */
async function mixinEngineAddService(req, array, name) {
  array.map(async (item) => {
    const { _id, ...all } = item?.data;
    const query = {
      user: req?.query?.user ?? req?.user?.id,
      _id: req?.query?.profile,
    };
    const file = { ...item?.data?.image, buffer: item?.data?.image?.base64 };
    if (file.buffer) {
      console.log('image available add');
      await uploadBufferFile(
        file,
        `${name}s`,
        `${getRandomFileName(`${name}-`)}_${
          name == 'document' ? `${item?.data?.image?.fileName}` : ''
        }`,
        name
      ).then(async (image) => {
        await Profile.updateOne(query, {
          $push: {
            [`${item?.section}.${item?.section}s`]: { ...all, image },
          },
        });
      });
    } else {
      console.log('image not available add');
      await Profile.updateOne(query, {
        $push: {
          [`${item?.section}.${item?.section}s`]: {
            ...all,
            image: item?.data?.image,
          },
        },
      });
    }
  });
}
/**
 * @desc   Mixin Edit Service
 * @model  {
      "section":"sectionName",
      "action":"edit",
      "data":{}
   }
 */
async function mixinEngineEditService(req, array, name) {
  array.map(async (item) => {
    const { _id, ...all } = item?.data;
    // Check if the edit has change for new image
    if (item?.data?.image?.base64) {
      // TODO: Delete Old Image File From Bucket
      console.log('image available');
      const file = { ...item?.data?.image, buffer: item?.data?.image?.base64 };
      if (item?.data.image?.key) await deleteBufferFile(item?.data?.image?.key);
      await uploadBufferFile(
        file,
        `${name}s`,
        `${getRandomFileName(`${name}-`)}_${
          name == 'document' ? `${item?.data?.image?.fileName}` : ''
        }`,
        name
      ).then(async (image) => {
        const query = {
          user: req?.query?.user ?? req?.user?.id,
          _id: req?.query?.profile,
          [`${item?.section}.${item?.section}s._id`]: item.data?._id,
        };
        await Profile.updateOne(query, {
          $set: {
            [`${item?.section}.${item?.section}s.$`]: { ...all, image },
          },
        });
      });
    } else {
      console.log('non image update');
      const query = {
        user: req?.query?.user ?? req?.user?.id,
        _id: req?.query?.profile,
        [`${item?.section}.${item?.section}s._id`]: item.data?._id,
      };
      await Profile.updateOne(query, {
        $set: { [`${item?.section}.${item?.section}s.$`]: item.data },
      });
    }
  });
}

async function mixinEngineEditCategory(req, array) {
  // Find the existing profile
  const profile = await Profile.findOne({
    user: req.query?.user ?? req.user?.id,
    _id: req.query?.profile,
  });

  if (!profile) {
    console.log('Profile not found');
    return;
  }

  // Extract existing category names for comparison
  const existingCategoryNames = profile.category?.categorys.map(
    (cat) => cat.name
  );

  // Filter array to include only new, non-duplicate categories
  const newCategoryNames = array.filter(
    (item) => !existingCategoryNames.includes(item.data?.name)
  );

  // If there are new categories to add
  if (newCategoryNames.length > 0) {
    const categoriesToAdd = newCategoryNames.map((item) => {
      const { _id, ...rest } = item?.data;
      return rest;
    });

    // Update query
    const query = {
      user: req.query?.user || req.user?.id,
      _id: req.query?.profile,
    };

    // Update operation to add new categories

    const update = {
      $push: {
        'category.categorys': { $each: categoriesToAdd },
      },
    };

    // Perform the update operation
    try {
      await Profile.updateOne(query, update);
    } catch (error) {
      console.error('Error adding new categories-->', error);
    }
  }
}

/**
 * @desc   Mixin Add Product
 * @model  {
      "section":"sectionName",
      "action":"add",
      "data":{}
   }
 */
async function mixinEngineAddProduct(req, array) {
  array.map(async (item) => {
    const { _id, ...all } = item?.data;
    const query = {
      user: req?.query?.user ?? req?.user?.id,
      _id: req?.query?.profile,
    };
    const file = { ...item?.data?.image, buffer: item?.data?.image?.base64 };
    await uploadBufferFile(
      file,
      'products',
      getRandomFileName('product-')
    ).then(async (image) => {
      await Profile.updateOne(query, {
        $push: {
          [`${item?.section}.${item?.section}s`]: { ...all, image },
        },
      });
    });
  });
}

/**
 * @desc   Mixin Edit Product
 * @model  {
      "section":"sectionName",
      "action":"add",
      "data":{}
   }
 */
async function mixinEngineEditProduct(req, array) {
  array.map(async (item) => {
    const { _id, ...all } = item?.data;
    // Check if the edit has change for new image
    if (item?.data?.image?.base64) {
      // TODO: Delete Old Image File From Bucket
      const file = { ...item?.data?.image, buffer: item?.data?.image?.base64 };
      if (item?.data.image?.key) await deleteBufferFile(item?.data?.image?.key);
      await uploadBufferFile(
        file,
        'products',
        getRandomFileName('product-')
      ).then(async (image) => {
        const query = {
          user: req?.query?.user ?? req?.user?.id,
          _id: req?.query?.profile,
          [`${item?.section}.${item?.section}s._id`]: item.data?._id,
        };
        await Profile.updateOne(query, {
          $set: {
            [`${item?.section}.${item?.section}s.$`]: { ...all, image },
          },
        });
      });
    } else {
      const query = {
        user: req?.query?.user ?? req?.user?.id,
        _id: req?.query?.profile,
        [`${item?.section}.${item?.section}s._id`]: item.data?._id,
      };
      await Profile.updateOne(query, {
        $set: { [`${item?.section}.${item?.section}s.$`]: item.data },
      });
    }
  });
}

/**
 * @desc   Mixin Delete
 * @model  {
      "section":"sectionName",
      "action":"delete",
      "data":{}
   }
 */
async function mixinEngineDelete(req, array) {
  // TODO: Delete Image Key If The Delete Section is Products
  const validImageDeletion = [
    'product',
    'service',
    'award',
    'certificate',
    'document',
  ];

  const updates = array.map((item) => {
    if (validImageDeletion.includes(item?.section)) {
      if (item?.data?.image) {
        deleteFileByUrl(item?.data?.image?.public, item?.section);
      }
    }
    const query = {
      user: req?.query?.user ?? req?.user?.id,
      _id: req?.query?.profile,
      [`${item?.section}.${item?.section}s._id`]: item.data?._id,
    };
    const update = {
      $pull: {
        [`${item?.section}.${item?.section}s`]: { _id: item.data?._id },
      },
    };
    return { query, update };
  });
  Promise.all(
    updates.map(({ query, update }) => Profile.updateOne(query, update))
  )
    .then((results) => {
      console.log(`${results.length} items deleted.`);
    })
    .catch((error) => console.error(error));
}

/**
 * @desc   Mixin Edit
 * @model  {
      "section":"sectionName",
      "action":"edit",
      "data":{}
   }
 */

function mixinEngineEdit(req, array) {
  console.log('****mixinEngineEdit*****');
  console.log('Received Array --->', array);

  const updates = array.map((item) => {
    const { _id, ...rest } = item.data;
    let update;
    let query;
    // Create Add Query For Bank and Video
    if (
      // item?.section == "video" ||
      item?.section == 'bank' ||
      item?.section == 'enquiry'
    ) {
      query = {
        user: req?.query?.user ?? req?.user?.id,
        _id: req?.query?.profile,
      };
      update =
        item?.section == 'video'
          ? {
              $set: { [`${item?.section}.link`]: item.data },
            }
          : item?.section == 'enquiry'
          ? { $set: { [`${item?.section}.email`]: rest } }
          : { $set: { [`${item?.section}.bankDetails`]: rest } };
    } else if (item?.section == 'social') {
      const getSocial = getSocialMedia(rest?.value);
      const socialmedia = {
        label: getSocial === 'Other' ? 'Social Media' : getSocial,
        type: getSocial.toLowerCase(),
      };
      query = {
        user: req?.query?.user ?? req?.user?.id,
        _id: req?.query?.profile,
        [`${item?.section}.${item?.section}s._id`]: item.data?._id,
      };
      update = {
        $set: {
          [`${item?.section}.${item?.section}s.$`]: {
            ...item.data,
            ...socialmedia,
          },
        },
      };
    } else {
      query = {
        user:
          req?.query?.admin ??
          req?.body?.admin ??
          req?.query?.user ??
          req?.user?.id,
        // _id: req?.query?.profile,
        ...(req?.query?.profile && { _id: req.query.profile }),
        [`${item?.section}.${item?.section}s._id`]: item.data?._id,
      };
      update = {
        $set: { [`${item?.section}.${item?.section}s.$`]: item.data },
      };
    }
    return { query, update };
  });
  Promise.all(
    updates.map(({ query, update }) => Profile.updateOne(query, update))
  )
    .then((results) => {
      console.log(`${results.length} items updated.`);
    })
      .catch((error) => console.error(error));
}
/**
 * @desc   Mixin Admin Edit
 * @model  {
      "section":"sectionName",
      "action":"edit",
      "data":{}
   }
 */

function mixinEngineAdminEdit(req, array) {
  console.log('********Edit Section*******');
  console.log('Received Array---->', array);
  const updates = array.map((item) => {
    const { _id, ...rest } = item.data;
    let update;
    let query;
    console.log('********Checkpoint 1*******');

    query = {
      user: req?.query?.admin,
      [`${item?.section}.${item?.section}s._id`]: item.data?._id,
    };
    console.log('********Checkpoint 2*******');

    update = {
      $set: { [`${item?.section}.${item?.section}s.$`]: item.data },
    };
    return { query, update };
  });
  console.log('********Checkpoint 3*******');

  Promise.all(
    updates.map(({ query, update }) => Profile.updateOne(query, update))
  )
    .then((results) => {
      console.log(`${results.length} items updated.`);
    })
    .catch((error) => console.error(error));
}
/**
 * @desc   Mixin Admin Edit
 * @model  {
      "section":"sectionName",
      "action":"edit",
      "data":{}
   }
 */

// function mixinEngineAdminEdit(req, array) {
//   const updates = array.map((item) => {
//     const { _id, ...rest } = item.data;
//     let update;
//     let query;
//     query = {
//       user: req?.query?.admin,
//       [`${item?.section}.${item?.section}s._id`]: item.data?._id,
//     };
//     update = {
//       $set: { [`${item?.section}.${item?.section}s.$`]: item.data },
//     };
//     return { query, update };
//   });
//   Promise.all(
//     updates.map(({ query, update }) => Profile.updateOne(query, update))
//   )
//     .then((results) => {
//       console.log(`${results.length} items updated.`);
//     })
//     .catch((error) => console.error(error));
// }

/**
 * @desc   Mixin Status
 * @model  {
      "section":"sectionName",
      "action":"status",
      "data": true or false
   }
 */
function mixinEngineStatus(req, array) {
  const updates = array.map((item) => {
    const query = {
      user: req?.query?.user ?? req?.user?.id,
      _id: req?.query?.profile,
    };
    const update = {
      [`${item?.section}.status`]: item.data,
    };
    return { query, update };
  });
  Promise.all(
    updates.map(({ query, update }) => Profile.updateOne(query, update))
  )
    .then((results) => {
      console.log(`${results.length} items status changed.`);
    })
    .catch((error) => console.error(error));
}

/**
 * @desc    Create user profile bulk
 * @route   POST /api/v1/user/createBulk
 * @access  Private/Admin
 * @schema  Private
 */
export const createUserProfileBulk = asyncHandler(async (req, res, next) => {
  try {
    const url = req.body.url;
    let workbook;
    //CHECK IF THE URL IS THERE FOR LINK UPLOAD
    if (url) {
      const domain = new URL(url).hostname;
      if (
        !ALLOWED_DOMAINS.some((allowedDomain) => domain.endsWith(allowedDomain))
      ) {
        throw new Error(`Invalid URL domain: ${domain}`);
      }
      const file = await getFileFromUrl(url);
      // Parse the spreadsheet data
      workbook = xlsx.read(file, { type: 'buffer' });
    } else {
      workbook = xlsx.readFile(req.file.path);
    }

    // Read the spreadsheet file
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const headers = [
      'phone',
      'name',
      'designation',
      'company',
      'bio',
      'email',
      'wabusiness',
      'location',
      'landmark',
      'maplink',
      'whatsapp',
      'instagram',
      'facebook',
      'linkedin',
      'spotify',
      'youtube',
      'dribble',
      'behance',
      'medium',
      'twitter',
      'websitename',
      'websitelink',
      'youtubelink',
    ];
    const profileCheckList = ['name', 'designation', 'company', 'bio'];
    const contactsCheckList = [
      'phone',
      'email',
      'social',
      'whatsapp',
      'wabusiness',
    ];
    const multiDataCheckList = ['websitename', 'websitelink', 'youtubelink'];

    headers.forEach((header) => {
      if (worksheet[`${header}1`]) {
        throw new Error(`Header '${header}' not found in '${sheetName}' sheet`);
      }
    });
    // Convert the spreadsheet data to an array of objects
    const rows = xlsx.utils.sheet_to_json(worksheet);

    rows.forEach((row, rowIndex) => {
      headers.forEach((header) => {
        if (!row[header]) {
          // throw new Error(
          //   `Missing data in '${header}' column in row ${rowIndex + 2}`
          // );
        }
      });
      if (!/^\+[0-9]+/.test(row.phone)) {
        throw new Error(`Invalid phone in row ${rowIndex + 2}`);
      }
    });

    for (const profile of rows) {
      let body;
      let update = {};
      let value;
      const { websitename, websitelink, youtubelink } = profile;
      let contacts = [];
      let socials = [];

      //MULTIDATA
      /*WEBSITE*/
      if (websitename && websitelink) {
        const name = websitename.split(',');
        const link = websitelink.split(',');
        if (name?.length == link?.length) {
          let websites = [];
          for (let i = 0; i < name?.length; i++) {
            websites.push({
              name: name[i],
              link: link[i],
            });
          }
          update['website'] = {
            status: true,
            websites: websites,
          };
        }
      }
      /*YOUTUBE VIDEO LINK*/
      if (youtubelink) {
        const link = youtubelink.split(',');
        let videos = [];
        for (let i = 0; i < link?.length; i++) {
          videos.push({
            link: link[i],
          });
        }
        update['video'] = {
          status: true,
          videos: videos,
        };
      }

      /*LOCATION*/
      if (profile?.location || profile?.landmark || profile?.maplink) {
        contacts.push({
          label: 'Location',
          value: profile?.location,
          street: profile?.landmark,
          pincode: profile?.maplink,
          type: 'location',
        });
      }

      //DELETE ALREADY DONE THINGS
      delete profile?.location;
      delete profile?.landmark;
      delete profile?.maplink;
      delete profile?.websitename;
      delete profile?.websitelink;
      delete profile?.youtubelink;

      // console.log(profile);
      // profile = profile.filter(obj => Object.keys(obj).length !== 0);
      for (const key in profile) {
        if (profile.hasOwnProperty(key)) {
          // console.log(`${key}: ${profile[key]}`);
          value = `${profile[key].trim()}`;
          let contact = {},
            social = {};
          if (multiDataCheckList.includes(key)) {
            //Multidata
          } else if (contactsCheckList.includes(key)) {
            //CONTACTS
            contact['label'] = key.charAt(0).toUpperCase() + key.slice(1);
            contact['value'] = value;
            contact['type'] = key;
          } else if (!profileCheckList.includes(key)) {
            //SOCIALS
            social['label'] = key.charAt(0).toUpperCase() + key.slice(1);
            social['value'] = value;
            social['type'] = key;
          }
          if (Object.keys(contact).length !== 0) contacts.push(contact);
          if (Object.keys(social).length !== 0) socials.push(social);
        }
      }

      update['profile'] = {
        name: profile?.name,
        designation: profile?.designation,
        companyName: profile?.company,
        bio: profile?.bio,
      };
      update['contact'] = {
        status: false,
        contacts: contacts,
      };
      update['social'] = {
        status: false,
        socials: socials,
      };
      update['product'] = {
        status: false,
        products: [],
      };
      update['service'] = {
        status: false,
        services: [],
      };
      update['document'] = {
        status: false,
        documents: [],
      };
      update['award'] = {
        status: false,
        awards: [],
      };
      update['certificate'] = {
        status: false,
        certificates: [],
      };

      body = {
        phone: profile.phone,
        update: JSON.stringify(update),
        // update: update,
        asFunction: true,
      };

      await createUserProfile(
        { body: body, query: { group: req?.query?.group } },
        res,
        next
      );

      // console.log(update.contact)
      // console.log(update.social)
      body = {};
      update = {};
      update.length = 0;
      socials.length = 0;
      contacts.length = 0;
    }
    let message = {
      success: `Uploaded ${rows.length} new profiles created.`,
    };
  } catch (error) {
    return next(new ErrorResponse(`Error uploading users ${error}`, 400));
  }
});

/**
 * @desc    Create user profile bulk from cloud
 * @route   POST /api/v1/user/createCloudBulk
 * @access  Private/Admin
 * @schema  Private
 */
export const createUserProfileCloudBulk = asyncHandler(
  async (req, res, next) => {
    const ALLOWED_DOMAINS = ['docs.google.com'];
    try {
      // Read the spreadsheet file from the URL
      const url = req.body.url;
      const domain = new URL(url).hostname;
      if (
        !ALLOWED_DOMAINS.some((allowedDomain) => domain.endsWith(allowedDomain))
      ) {
        throw new Error(`Invalid URL domain: ${domain}`);
      }
      const file = await getFileFromUrl(url);
      // Parse the spreadsheet data
      const workbook = xlsx.read(file, { type: 'buffer' });

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const headers = ['phone', 'name', 'designation', 'company', 'bio'];
      headers.forEach((header) => {
        if (worksheet[`${header}1`]) {
          throw new Error(
            `Header '${header}' not found in '${sheetName}' sheet`
          );
        }
      });
      // Convert the spreadsheet data to an array of objects
      const rows = xlsx.utils.sheet_to_json(worksheet);
      rows.forEach((row, rowIndex) => {
        headers.forEach((header) => {
          if (!row[header]) {
            throw new Error(
              `Missing data in '${header}' column in row ${rowIndex + 2}`
            );
          }
        });
        if (!/^\+[0-9]+/.test(row.phone)) {
          throw new Error(`Invalid phone in row ${rowIndex + 2}`);
        }
      });
      const users = rows.map((row) => ({
        phone: row.phone,
        profile: {
          name: row.name,
          designation: row.designation,
          companyName: row.company,
          bio: row.bio,
        },
      }));
      const existingUsers = await User.find({
        username: { $in: users.map((u) => u.phone) },
      });
      const existingPhones = existingUsers.map((u) => u.username);
      const newUsers = users.filter(
        (u) => !existingPhones.includes(u.username)
      );
      newUsers.map(async (idx, inx) => {
        const options = {
          scale: 34,
          color: {
            dark: '#BEFF6C', // dark color
            light: '#1C1C1E', // light color
          },
        };
        const cardId =
          `${profile?.name.toLowerCase().split(' ').join('')}-` +
          randomId().toLowerCase();
        const profileLink = `${process.env.HOST_URL_HTTPS}/profile/${cardId}`;
        const qrCode = await QRCode.toBuffer(profileLink, options);
        const qrFile = {
          buffer: qrCode,
          mimetype: 'image/jpeg',
        };
        const qrImageUrl = await uploadFile(
          qrFile,
          'cards',
          getRandomFileName('card-')
        );
        const { phone, profile } = idx;
        admin
          .auth()
          .createUser({
            phoneNumber: phone,
            displayName: profile?.name,
            disabled: false,
          })
          .then(async (userRecord) => {
            const user = await User.create({
              username: phone,
              uid: userRecord?.uid,
              role: 'user',
              providerData: userRecord?.providerData,
            });
            await Profile.create({
              user: user?.id,
              group: req?.query?.group,
              card: {
                cardId,
              },
              profile: {
                ...profile,
                profileLink,
                profileQR: qrImageUrl,
              },
              contact: {
                status: true,
                contacts: [
                  { label: 'Phone Number', value: phone, type: 'phone' },
                  { label: 'Email', value: '', type: 'email' },
                  { label: 'Whatsapp Business', value: '', type: 'wabusiness' },
                  {
                    label: 'Location',
                    value: '',
                    street: '',
                    pincode: '',
                    type: 'location',
                  },
                  { label: 'Whatsapp', value: '', type: 'whatsapp' },
                ],
              },
            });
            let message = {
              success: `Uploaded ${newUsers.length} new users. ${existingPhones.length} existing users were skipped.`,
            };
            return res.json({ success: true, message });
          })
          .catch(() => {
            return next(
              new Error(`${existingPhones.length} existing users were skipped.`)
            );
          });
      });
    } catch (error) {
      console.error(error);
      res.status(400).send({ message: error.message });
    }
  }
);

/**
 * @desc    Get Application Version
 * @route   GET /api/v1/user/appversion
 * @access  Oublic
 */
export const appVersion = asyncHandler(async (req, res, next) => {
  if (!req.query.app) {
    let message = { success: 'Please pass app and platform' };
    return res.status(400).json({ success: false, message });
  }
  const settings = await Setting.findById(process.env.SETTINGS_DOCUMENT_ID, {
    application: 1,
  });
  let update = settings.application[req.query.app][req.query.platform];
  res.status(200).json({
    success: true,
    data: update,
  });
});

async function streamToBase64(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
    stream.on('error', (err) => reject(err));
  });
}

async function imageFileToBase64(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
  } catch (err) {
    throw new Error(`File not readable: ${filePath}`);
  }
  const readable = fs.createReadStream(filePath);
  const base64EncodedImage = await streamToBase64(readable);
  return base64EncodedImage;
}

export const getNotifications = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.query;
    const form = await Profile.findByIdAndUpdate(
      { _id: id },
      { $set: { 'form.status': 0 } },
      { new: true }
    ).select('form');
    res.status(200).json(form);
  } catch (e) {
    console.log(e);
    res.status(500).json({ Error: e });
  }
});

export const exportEnquiry = asyncHandler (async (req, res) => {
  try {
    const { id } = req.query;
    const profile = await Profile.findByIdAndUpdate({ _id: id }).select('form');
    const sortedForms = profile?.form?.forms.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    const formData = sortedForms?.map((form) => ({
      Name: form.name,
      Phone: form.phone,
      Email: form.email,
      Message: form.message,
      CreatedAt: form.createdAt,
    }));

    // convert data to Excel worksheet
    const worksheet = xlsx.utils.json_to_sheet(formData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Enquiries');
    // Generate the Excel file
    const excelBuffer = xlsx.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });

    // Create a Nodemailer transporter

    const transporter = Nodemailer.createTransport({
      service: process.env.NODE_MAILER_PROVIDER,
      auth: {
        user: process.env.NODE_MAILER_USER,
        pass: process.env.NODE_MAILER_PASS,
      },
    });

    const user = await Profile.findOne({
      user: new Types.ObjectId(req?.user?.id),
    });
    const userEmails = user?.contact?.contacts
      ?.filter((item) => item.type === 'email')
      .map((item) => item.value);

    const userEmailList = userEmails.join(', ');

    const profileName = await Profile.findByIdAndUpdate({ _id: id });

    // Compose the email
    const mailOptions = {
      from: process.env.NODE_MAILER_USER,
      to: userEmailList,
      subject: `${profileName?.profile?.name} Exported Data`,
      text: 'Please find attached excel file.',
      attachments: [
        {
          filename: `${profileName?.profile?.name.toLowerCase()}-exported-data.xlsx`,
          content: excelBuffer,
        },
      ],
    };
    // Send the email
    const info = await transporter.sendMail(mailOptions);
    let message = { success: `Export Data sent to ${userEmailList}` };
    res.status(200).json({ message });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: 'An error occurred while downloading excel' });
  }
});
