import express from "express";
import * as userController from "../controllers/user.controller.js";
import * as authController from "../controllers/auth.controller.js";
import { authorize, protect } from "../middlewares/auth.middleware.js";
import multer from "multer";

/**
 * @route  User Route
 * @desc   Route used for user operations
 * @url    api/v1/user
 */
const userRouter = express.Router({ mergeParams: true });

// Multer initialisation
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // no larger than 5mb, you can change as needed.
  },
});

// Multer initialisation for excel
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const excel = multer({ storage });

userRouter
  .route("/create")
  .post(
    protect,
    authorize("admin"),
    upload.array("file"),
    userController.createUserProfile
  );

userRouter
  .route("/createAdmin")
  .post(upload.array("file"), userController.createAdminUserProfile);

userRouter
  .route("/update")
  .post(
    protect,
    authorize("admin", "user"),
    upload.array("file"),
    userController.updateUserProfile
  );

userRouter
  .route("/delete")
  .delete(protect, authorize("admin", "user"), userController.deleteUser);

userRouter
  .route("/updateAdmin")
  .post(
    protect,
    authorize("admin"),
    upload.single("file"),
    userController.updateAdminUserProfile
  );

userRouter
  .route("/createBulk")
  .post(
    protect,
    authorize("admin"),
    excel.single("file"),
    userController.createUserProfileBulk
  );

userRouter
  .route("/createCloudBulk")
  .post(protect, authorize("admin"), userController.createUserProfileCloudBulk);

// Special Routes on demand

// userRouter
//   .route("/deleteFirebaseUsers")
//   .delete(userController.deleteFirebaseUser);

export default userRouter;
