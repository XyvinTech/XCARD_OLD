import express from "express";
import * as groupController from "../controllers/group.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import multer from "multer";

/**
 * @route  Group Route
 * @desc   Route used for all group
 * @url    api/v1/group
 */
const groupRouter = express.Router({ mergeParams: true });

// Multer initialisation
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // no larger than 5mb, you can change as needed.
  },
});

groupRouter
  .route("/")
  .get(protect, authorize("admin"), groupController.getAllGroup);

groupRouter
  .route("/create")
  .post(protect, authorize("admin"), groupController.createGroup);

groupRouter
  .route("/:id/profile")
  .get(protect, authorize("admin"), groupController.getAllProfilesInGroup);

groupRouter
  .route("/:id/profile/search")
  .get(protect, authorize("admin"), groupController.searchProfile);

groupRouter
  .route("/edit/:id")
  .put(
    protect,
    authorize("admin"),
    upload.single("file"),
    groupController.editGroup
  );

groupRouter
  .route("/search")
  .get(protect, authorize("admin"), groupController.searchGroup);

export default groupRouter;
