import asyncHandler from "../middlewares/async.middleware.js";
import admin from "firebase-admin";
import User from "../models/User.js";
import Profile from "../models/Profile.js";
import ErrorResponse from "../utils/error.response.js";
import {
  uploadBufferFile,
  uploadBufferFiles,
  uploadFile,
  uploadFiles,
} from "../utils/file.upload.js";
import { nanoid, customAlphabet } from "nanoid";
const randomId = customAlphabet("0123456789ABCDEFGHIJKLMNOP", 8);
import QRCode from "qrcode";
import getRandomFileName from "../helpers/filename.helper.js";
import xlsx from "xlsx";
import fs from "fs";
import { Stream } from "stream";
import getFileFromUrl from "../helpers/getfilefromurl.helper.js";
import { Buffer } from "node:buffer";
import getSocialMedia from "../helpers/socialmediaregex.helper.js";
import { Types } from "mongoose";

/**
 * @desc    Create new user profile
 * @route   POST /api/v1/user/create
 * @access  Private/Admin
 * @schema  Private
 */
export const createUserProfile = asyncHandler(async (req, res, next) => {
  const { phone, update } = req?.body;
  const all = JSON.parse(update);
  const {
    profile,
    contact,
    social,
    website,
    video,
    service,
    certificate,
    award,
    bank,
    product,
    enquiry,
  } = all;
  delete bank?.bankDetails?._id;
  delete video?.link?._id;
  delete enquiry?.email?._id;
  await uploadFiles(req?.files, "profiles")
    .then(async (images) => {
      const options = {
        color: {
          dark: "#BEFF6C", // dark color
          light: "#1C1C1E", // light color
        },
      };
      const cardId = "xcard-" + randomId().toLowerCase();
      const profileLink = `${process.env.HOST_URL_HTTPS}/profile/${cardId}`;
      const qrCode = await QRCode.toBuffer(profileLink, options);
      const qrFile = {
        buffer: qrCode,
        mimetype: "image/jpeg",
      };
      admin
        .auth()
        .createUser({
          phoneNumber: phone,
          displayName: profile?.name,
          disabled: false,
        })
        .then(async (userRecord) => {
          //If new user enters create single user and profile.
          const user = await User.create({
            username: phone,
            uid: userRecord?.uid,
            role: "user",
            providerData: userRecord?.providerData,
          });
          // TODO: Create Unique Card Id, Create Unique Profile Link, Create Custom QR Image and Upload to Firebase
          const qrImageUrl = await uploadFile(
            qrFile,
            "cards",
            getRandomFileName("card-")
          );
          // Upload Product Images
          const modifiedProduct = await Promise.all(
            product?.products?.map(async (item) => {
              const { _id, ...all } = item;
              const upload = await uploadBufferFile(
                { ...all.image, buffer: item?.image?.base64 },
                "products",
                getRandomFileName("product-")
              );
              return { ...all, image: upload };
            })
          );
          await Profile.create({
            user: user?.id,
            group: req?.query?.group,
            card: {
              cardId,
            },
            profile: {
              ...profile,
              profileLink,
              profilePicture: images?.find((obj) => obj.type === "profile"),
              profileBanner: images?.find((obj) => obj.type === "banner"),
              profileQR: qrImageUrl,
            },
            contact: {
              ...contact,
              status: contact?.contacts?.length > 0 ? true : false,
              contacts: contact?.contacts.map((obj) => {
                const filteredObj = Object.fromEntries(
                  Object.entries(obj).filter(([key, value]) => value !== null)
                );
                delete filteredObj["_id"]; // remove the _id key from the filtered object
                return filteredObj;
              }),
            },
            social: {
              ...social,
              status: social?.socials?.length > 0 ? true : false,
              socials: social?.socials.map((obj) => {
                const filteredObj = Object.fromEntries(
                  Object.entries(obj).filter(([key, value]) => value !== null)
                );
                delete filteredObj["_id"];
                if (obj.type === "other") {
                  const getSocial = getSocialMedia(filteredObj?.value);
                  return {
                    label: getSocial === "Other" ? "Social Media" : getSocial,
                    type: getSocial.toLowerCase(),
                    value: filteredObj.value,
                  };
                } else {
                  return filteredObj;
                }
              }),
            },
            website: {
              ...website,
              status: website?.websites?.length > 0 ? true : false,
              websites: website?.websites.map((obj) => {
                const filteredObj = Object.fromEntries(
                  Object.entries(obj).filter(([key, value]) => value !== null)
                );
                delete filteredObj["_id"]; // remove the _id key from the filtered object
                return filteredObj;
              }),
            },
            service: {
              ...service,
              status: service?.services?.length > 0 ? true : false,
              services: service?.services.map((obj) => {
                const filteredObj = Object.fromEntries(
                  Object.entries(obj).filter(([key, value]) => value !== null)
                );
                delete filteredObj["_id"]; // remove the _id key from the filtered object
                return filteredObj;
              }),
            },
            award: {
              ...award,
              status: award?.awards?.length > 0 ? true : false,
              awards: award?.awards.map((obj) => {
                const filteredObj = Object.fromEntries(
                  Object.entries(obj).filter(([key, value]) => value !== null)
                );
                delete filteredObj["_id"]; // remove the _id key from the filtered object
                return filteredObj;
              }),
            },
            certificate: {
              ...certificate,
              status: certificate?.certificates?.length > 0 ? true : false,
              certificates: certificate?.certificates.map((obj) => {
                const filteredObj = Object.fromEntries(
                  Object.entries(obj).filter(([key, value]) => value !== null)
                );
                delete filteredObj["_id"]; // remove the _id key from the filtered object
                return filteredObj;
              }),
            },
            product: {
              ...product,
              status: modifiedProduct.length > 0 ? true : false,
              products: modifiedProduct,
            },
            bank: {
              ...bank,
              status: bank?.bankDetails?.accnumber ? true : false,
              bankDetails: bank?.bankDetails,
            },
            video: {
              ...video,
              status: video?.link?.link ? true : false,
              link: video?.link,
            },
            enquiry: {
              ...enquiry,
              status: enquiry?.email?.email ? true : false,
              email: enquiry?.email,
            },
          });

          let message = { success: "User Profile Created" };
          return res.status(201).send({ success: true, message, data: user });
        })
        .catch(async (error) => {
          //If User already exisits create second or third profile
          if (error?.errorInfo?.code === "auth/phone-number-already-exists") {
            const user = await User.findOne({ username: phone });
            const options = {
              color: {
                dark: "#BEFF6C", // dark color
                light: "#1C1C1E", // light color
              },
            };
            const cardId = "xcard-" + randomId().toLowerCase();
            const profileLink = `${process.env.HOST_URL_HTTPS}/profile/${cardId}`;
            const qrCode = await QRCode.toBuffer(profileLink, options);
            const qrFile = {
              buffer: qrCode,
              mimetype: "image/jpeg",
            };
            const qrImageUrl = await uploadFile(
              qrFile,
              "cards",
              getRandomFileName("card-")
            );
            // Upload Product Images
            const modifiedProduct = await Promise.all(
              product?.products?.map(async (item) => {
                const { _id, ...all } = item;
                const upload = await uploadBufferFile(
                  { ...all.image, buffer: item?.image?.base64 },
                  "products",
                  getRandomFileName("product-")
                );
                return { ...all, image: upload };
              })
            );
            await Profile.create({
              user: user?.id,
              group: req?.query?.group,
              card: {
                cardId,
              },
              profile: {
                ...profile,
                profileLink,
                profilePicture: images?.find((obj) => obj.type === "profile"),
                profileBanner: images?.find((obj) => obj.type === "banner"),
                profileQR: qrImageUrl,
              },
              contact: {
                ...contact,
                status: contact?.contacts?.length > 0 ? true : false,
                contacts: contact?.contacts.map((obj) => {
                  const filteredObj = Object.fromEntries(
                    Object.entries(obj).filter(([key, value]) => value !== null)
                  );
                  delete filteredObj["_id"]; // remove the _id key from the filtered object
                  return filteredObj;
                }),
              },
              social: {
                ...social,
                status: social?.socials?.length > 0 ? true : false,
                socials: social?.socials.map((obj) => {
                  const filteredObj = Object.fromEntries(
                    Object.entries(obj).filter(([key, value]) => value !== null)
                  );
                  delete filteredObj["_id"]; // remove the _id key from the filtered object
                  return filteredObj;
                }),
              },
              website: {
                ...website,
                status: website?.websites?.length > 0 ? true : false,
                websites: website?.websites.map((obj) => {
                  const filteredObj = Object.fromEntries(
                    Object.entries(obj).filter(([key, value]) => value !== null)
                  );
                  delete filteredObj["_id"]; // remove the _id key from the filtered object
                  return filteredObj;
                }),
              },
              service: {
                ...service,
                status: service?.services?.length > 0 ? true : false,
                services: service?.services.map((obj) => {
                  const filteredObj = Object.fromEntries(
                    Object.entries(obj).filter(([key, value]) => value !== null)
                  );
                  delete filteredObj["_id"]; // remove the _id key from the filtered object
                  return filteredObj;
                }),
              },
              award: {
                ...award,
                status: award?.awards?.length > 0 ? true : false,
                awards: award?.awards.map((obj) => {
                  const filteredObj = Object.fromEntries(
                    Object.entries(obj).filter(([key, value]) => value !== null)
                  );
                  delete filteredObj["_id"]; // remove the _id key from the filtered object
                  return filteredObj;
                }),
              },
              certificate: {
                ...certificate,
                status: certificate?.certificates?.length > 0 ? true : false,
                certificates: certificate?.certificates.map((obj) => {
                  const filteredObj = Object.fromEntries(
                    Object.entries(obj).filter(([key, value]) => value !== null)
                  );
                  delete filteredObj["_id"]; // remove the _id key from the filtered object
                  return filteredObj;
                }),
              },
              product: {
                ...product,
                status: modifiedProduct.length > 0 ? true : false,
                products: modifiedProduct,
              },
              bank: {
                ...bank,
                status: bank?.bankDetails?.accnumber ? true : false,
                bankDetails: bank?.bankDetails,
              },
              video: {
                ...video,
                status: video?.link?.link ? true : false,
                link: video?.link,
              },
              enquiry: {
                ...enquiry,
                status: enquiry?.email?.email ? true : false,
                email: enquiry?.email,
              },
            });
            let message = { success: "User Profile Created" };
            return res.status(201).send({ success: true, message, data: user });
          }
          return next(
            new ErrorResponse(
              `Something went wrong ${error?.errorInfo?.code ?? error}`,
              400
            )
          );
        });
    })
    .catch((err) => {
      return next(new ErrorResponse(`File upload failed ${err}`, 400));
    });
});

/**
 * @desc    Create new admin user profile
 * @route   POST /api/v1/user/createAdmin
 * @access  Public/Access
 * @schema  Public
 */
export const createAdminUserProfile = asyncHandler(async (req, res, next) => {
  const form = JSON.parse(req?.body?.form);
  await uploadFiles(req?.files, "profiles")
    .then(async (images) => {
      const { phone, profile, contact } = form;
      admin
        .auth()
        .createUser({
          phoneNumber: phone,
          displayName: profile?.name,
          disabled: false,
        })
        .then(async (userRecord) => {
          //If new user enters create single user and profile.
          const user = await User.create({
            username: phone,
            uid: userRecord?.uid,
            role: "admin",
            providerData: userRecord?.providerData,
          });
          await Profile.create({
            user: user?.id,
            profile: {
              ...profile,
              profileBanner: images[0],
              profilePicture: images[1],
            },
            contact,
          });

          let message = { success: "Admin User Profile Created" };
          return res.status(201).send({ success: true, message, data: user });
        })
        .catch(async (error) => {
          console.log(error);
          return next(
            new ErrorResponse(
              `Something went wrong ${error?.errorInfo?.code}`,
              400
            )
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
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: {
        path: "$user",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: {
        "user.role": "admin",
      },
    },
    {
      $lookup: {
        from: "groups",
        localField: "user._id",
        foreignField: "groupAdmin",
        as: "groups",
      },
    },
    {
      $lookup: {
        from: "profiles",
        let: {
          groupIdList: "$groups._id",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ["$group", "$$groupIdList"],
              },
            },
          },
        ],
        as: "profiles",
      },
    },
    {
      $addFields: {
        groupCount: {
          $size: "$groups",
        },
        profileCount: {
          $size: "$profiles",
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
  let message = { success: "All Admin Users with Counts" };
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
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: {
        path: "$user",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: {
        "user.role": "admin",
        "profile.name": { $regex: searchQuery, $options: "i" },
      },
    },
    {
      $lookup: {
        from: "groups",
        localField: "user._id",
        foreignField: "groupAdmin",
        as: "groups",
      },
    },
    {
      $lookup: {
        from: "profiles",
        let: {
          groupIdList: "$groups._id",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ["$group", "$$groupIdList"],
              },
            },
          },
        ],
        as: "profiles",
      },
    },
    {
      $addFields: {
        groupCount: {
          $size: "$groups",
        },
        profileCount: {
          $size: "$profiles",
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
  let message = { success: "Search Results" };
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
    return next(new ErrorResponse("Please provide admin id", 400));
  }
  const profiles = await Profile.aggregate([
    {
      $lookup: {
        from: "groups",
        localField: "group",
        foreignField: "_id",
        as: "group",
      },
    },
    {
      $unwind: {
        path: "$group",
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $match: {
        "group.groupAdmin": new Types.ObjectId(req?.query?.admin),
      },
    },
  ]);
  let message = { success: "All Admin Users" };
  return res.status(200).send({ success: true, message, profiles });
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
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: {
        path: "$user",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: {
        "user.role": "admin",
      },
    },
    {
      $lookup: {
        from: "groups",
        localField: "user._id",
        foreignField: "groupAdmin",
        as: "groups",
      },
    },
    {
      $lookup: {
        from: "profiles",
        let: {
          groupIdList: "$groups._id",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ["$group", "$$groupIdList"],
              },
            },
          },
        ],
        as: "profiles",
      },
    },
    {
      $addFields: {
        groupCount: {
          $size: "$groups",
        },
        profileCount: {
          $size: "$profiles",
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
  let message = { success: "All Admin Users with Counts" };
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
        role: "admin",
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
        name: "Total Admins",
      },
    },
    {
      $unionWith: {
        coll: "groups",
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
              name: "Total Groups",
            },
          },
        ],
      },
    },
    {
      $unionWith: {
        coll: "users",
        pipeline: [
          {
            $match: {
              role: "user",
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
              name: "Total Profiles",
            },
          },
        ],
      },
    },
  ]);
  let message = { success: "All User Counts" };
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
  let message = { success: "User Account Deleted" };
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
        message: "All Firebase users deleted successfully",
      });
    })
    .catch((error) => {
      return res
        .status(400)
        .send({ success: false, message: "Error deleting Firebase users" });
    });
});
/**
 * @desc    Update User Profile
 * @route   POST /api/v1/user/update
 * @access  Private/Admin Private/User
 * @schema  Private
 */
export const updateUserProfile = asyncHandler(async (req, res, next) => {
  await uploadFiles(req?.files, "profiles", getRandomFileName("profile-"))
    .then(async (images) => {
      const { name, designation, companyName, bio } = req?.body;
      //TODO: Delete old profile picture from Firebase Storage
      const updateArray = JSON?.parse(req?.body?.update) ?? [];
      const updateStatusArray = JSON?.parse(req?.body?.status) ?? [];
      if (Array?.isArray(updateArray) && updateArray?.length > 0) {
        await mixinEngine(req, updateArray);
      }
      if (Array?.isArray(updateStatusArray) && updateStatusArray?.length > 0) {
        await statusEngine(req, updateStatusArray);
      }

      const profile = await Profile.findOneAndUpdate(
        {
          user: req?.query?.user ?? req?.user?.id,
          _id: req?.query?.profile,
        },
        {
          $set: {
            "profile.name": name,
            "profile.designation": designation,
            "profile.companyName": companyName,
            "profile.bio": bio,
            "profile.profileBanner": images?.find(
              (obj) => obj.type === "banner"
            ),
            "profile.profilePicture": images?.find(
              (obj) => obj.type === "profile"
            ),
          },
        },
        { upsert: true, new: true }
      );
      let message = { success: "User Profile Updated" };
      return res.status(200).send({ success: true, message, data: profile });
    })
    .catch((err) => {
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
  await uploadFile(req?.file, "profiles", getRandomFileName("profile-"))
    .then(async (image) => {
      function isObject(value) {
        return typeof value === "object" && value !== null;
      }
      //TODO: Delete old profile picture from Firebase Storage
      const updateArray = JSON?.parse(req?.body?.update) ?? [];
      if (Array?.isArray(updateArray) && updateArray?.length > 0) {
        mixinEngine(req, updateArray);
      }
      if (image !== undefined) {
        const profile = await Profile.findOneAndUpdate(
          { user: req?.user?.id },
          {
            $set: { profile: { ...req?.body, profilePicture: image } },
          },
          { new: true }
        );
        let message = { success: "Admin User Profile Updated" };
        return res.status(200).send({ success: true, message, data: profile });
      } else {
        const profile = await Profile.findOneAndUpdate(
          { user: req?.user?.id },
          {
            $set: {
              "profile.companyName": req?.body?.companyName,
              "profile.bio": req?.body?.bio,
            },
          },
          { new: true }
        );
        let message = { success: "Admin User Profile Updated" };
        return res.status(200).send({ success: true, message, data: profile });
      }
    })
    .catch((err) => {
      return next(new ErrorResponse(`File upload failed ${err}`, 400));
    });
});

async function mixinEngine(req, array) {
  const validAddSection = [
    "social",
    "website",
    "service",
    "award",
    "certificate",
    "product",
  ];
  const validEditSection = [
    ...validAddSection,
    "contact",
    "bank",
    "video",
    "enquiry",
  ];
  const validDeleteSection = [...validAddSection];
  const add = [];
  const addProduct = [];
  const editProduct = [];
  const edit = [];
  const del = [];
  //Sort All the actions and send to different mixins
  for (let index = 0; index < array.length; index++) {
    const element = array[index];
    if (element.action === "add") {
      validAddSection.includes(element.section) && element.section === "product"
        ? addProduct.push(element)
        : add.push(element);
    }
    if (element.action === "edit") {
      validEditSection.includes(element.section) &&
      element.section === "product"
        ? editProduct.push(element)
        : edit.push(element);
    }
    if (element.action === "delete") {
      validDeleteSection.includes(element.section) && del.push(element);
    }
  }

  add.length > 0 && mixinEngineAdd(req, add);
  del.length > 0 && mixinEngineDelete(req, del);
  edit.length > 0 && mixinEngineEdit(req, edit);

  // Only for product
  addProduct.length > 0 && mixinEngineAddProduct(req, addProduct);
  editProduct.length > 0 && mixinEngineEditProduct(req, editProduct);
}

async function statusEngine(req, array) {
  const status = [];
  //Sort All the actions and send to different mixins
  for (let index = 0; index < array.length; index++) {
    const element = array[index];
    if (element.action === "status") {
      status.push(element);
    }
  }
  status.length > 0 && mixinEngineStatus(req, status);
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
    if (item?.section == "social") {
      const getSocial = getSocialMedia(rest?.value);
      const socialmedia = {
        label: getSocial === "Other" ? "Social Media" : getSocial,
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
      "products",
      getRandomFileName("product-")
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
      await uploadBufferFile(
        file,
        "products",
        getRandomFileName("product-")
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
function mixinEngineDelete(req, array) {
  // TODO: Delete Image Key If The Delete Section is Products
  const updates = array.map((item) => {
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
  const updates = array.map((item) => {
    const { _id, ...rest } = item.data;
    let update;
    let query;
    // Create Add Query For Bank and Video
    if (
      item?.section == "video" ||
      item?.section == "bank" ||
      item?.section == "enquiry"
    ) {
      query = {
        user: req?.query?.user ?? req?.user?.id,
        _id: req?.query?.profile,
      };
      update =
        item?.section == "video"
          ? {
              $set: { [`${item?.section}.link`]: item.data },
            }
          : item?.section == "enquiry"
          ? { $set: { [`${item?.section}.email`]: rest } }
          : { $set: { [`${item?.section}.bankDetails`]: rest } };
    } else if (item?.section == "social") {
      const getSocial = getSocialMedia(rest?.value);
      const socialmedia = {
        label: getSocial === "Other" ? "Social Media" : getSocial,
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
        user: req?.query?.user ?? req?.user?.id,
        _id: req?.query?.profile,
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
    // Read the spreadsheet file
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const headers = ["phone", "name", "designation", "company", "bio"];
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
          throw new Error(
            `Missing data in '${header}' column in row ${rowIndex + 2}`
          );
        }
      });
      if (!/^\+91[1-9]\d{9}$/.test(row.phone)) {
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
    const newUsers = users.filter((u) => !existingPhones.includes(u.username));
    newUsers.map(async (idx, inx) => {
      const options = {
        color: {
          dark: "#BEFF6C", // dark color
          light: "#1C1C1E", // light color
        },
      };
      const cardId = "xcard-" + randomId().toLowerCase();
      const profileLink = `${process.env.HOST_URL_HTTPS}/profile/${cardId}`;
      const qrCode = await QRCode.toBuffer(profileLink, options);
      const qrFile = {
        buffer: qrCode,
        mimetype: "image/jpeg",
      };
      const qrImageUrl = await uploadFile(
        qrFile,
        "cards",
        getRandomFileName("card-")
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
            role: "user",
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
                { label: "Phone Number", value: phone, type: "phone" },
                { label: "Email", value: "", type: "email" },
                { label: "Whatsapp Business", value: "", type: "wabusiness" },
                {
                  label: "Location",
                  value: "",
                  street: "",
                  pincode: "",
                  type: "location",
                },
                { label: "Whatsapp", value: "", type: "whatsapp" },
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
    fs.unlinkSync(req.file.path);
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
    const ALLOWED_DOMAINS = ["docs.google.com"];
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
      const workbook = xlsx.read(file, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const headers = ["phone", "name", "designation", "company", "bio"];
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
        if (!/^\+91[1-9]\d{9}$/.test(row.phone)) {
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
          color: {
            dark: "#BEFF6C", // dark color
            light: "#1C1C1E", // light color
          },
        };
        const cardId = "xcard-" + randomId().toLowerCase();
        const profileLink = `${process.env.HOST_URL_HTTPS}/profile/${cardId}`;
        const qrCode = await QRCode.toBuffer(profileLink, options);
        const qrFile = {
          buffer: qrCode,
          mimetype: "image/jpeg",
        };
        const qrImageUrl = await uploadFile(
          qrFile,
          "cards",
          getRandomFileName("card-")
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
              role: "user",
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
                  { label: "Phone Number", value: phone, type: "phone" },
                  { label: "Email", value: "", type: "email" },
                  { label: "Whatsapp Business", value: "", type: "wabusiness" },
                  {
                    label: "Location",
                    value: "",
                    street: "",
                    pincode: "",
                    type: "location",
                  },
                  { label: "Whatsapp", value: "", type: "whatsapp" },
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

async function streamToBase64(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("base64")));
    stream.on("error", (err) => reject(err));
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
