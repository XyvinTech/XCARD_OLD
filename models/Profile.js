import mongoose from "mongoose";
import User from "./User.js";
const ProfileSchema = new mongoose.Schema(
  {
    
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    visible: { type: Boolean, default: false },
    isDisabled: { type: Boolean, default: false },
    visitCount: { type: Number, default: 0 },
    group: {
      type: mongoose.Schema.ObjectId,
      ref: "Group",
    },
    card: {
      cardId: { type: String },
      cardWrited: { type: Number, default: 0 },
    },
    profile: {
      name: { type: String },
      designation: { type: String },
      companyName: { type: String },
      bio: { type: String },
      profileLink: { type: String },
      profilePicture: Object,
      profileBanner: Object,
      profileQR: Object,
    },
    contact: {
      status: { type: Boolean, default: false },
      contacts: {
        type: [
          {
            label: {
              type: String,
            },
            value: {
              type: String,
            },
            street: {
              type: String,
            },
            pincode: {
              type: String,
            },
            type: {
              type: String,
              enum: [
                "phone",
                "email",
                "social",
                "whatsapp",
                "wabusiness",
                "location",
              ],
            },
          },
        ],
        default: [
          {
            label: "Phone",
            value: "",
            type: "phone",
          },
          {
            label: "Email",
            value: "",
            type: "email",
          },
          {
            label: "Whatsapp",
            value: "",
            type: "wabusiness",
          },
          {
            label: "Address",
            street: "",
            pincode: "",
            value: "",
            type: "location",
          },
          {
            label: "Whatsapp",
            value: "",
            type: "whatsapp",
          },
        ],
      },
    },
    social: {
      status: { type: Boolean, default: false },
      socials: {
        type: [
          {
            label: String,
            value: String,
            type: {
              type: String,
              enum: [
                "instagram",
                "linkedin",
                "twitter",
                "facebook",
                "youtube",
                "spotify",
                "medium",
                "behance",
                "github",
                "other",
              ],
            },
          },
        ],
        default: [
          {
            label: "Instagram ID",
            value: "",
            type: "instagram",
          },
          {
            label: "Linkedin Profile",
            value: "",
            type: "linkedin",
          },
          {
            label: "Twitter",
            value: "",
            type: "twitter",
          },
          {
            label: "Facebook",
            value: "",
            type: "facebook",
          },
        ],
      },
    },
    website: {
      status: { type: Boolean, default: false },
      websites: { type: [{ link: String, name: String }], default: [] },
    },
    service: {
      status: { type: Boolean, default: false },
      services: {
        type: [
          {
            label: String,
            image: Object,
            value: String,
            description: String,
          }
        ],
        default: [],
      },
    },
    document: {
      status: { type: Boolean, default: false },
      documents: {
        type: [
          {
            label: String,
            image: Object,
            value: String,
          }
        ],
        default: [],
      },
    },
    video: {
      status: { type: Boolean, default: false },
      videos: { type: [{ link: String, }], default: [] },
      // link: {
      //   link: { type: String, default: "" },
      //   _id: {
      //     type: mongoose.Schema.ObjectId,
      //     default: new mongoose.Types.ObjectId(),
      //   },
      // },
    },
    product: {
      status: { type: Boolean, default: false },
      products: {
        type: [
          {
            name: String,
            link: String,
            description: String,
            image: Object,
            price: Number,
            offerPrice: Number,
          },
        ],
        default: [],
      },
    },
    // award: {
    //   status: { type: Boolean, default: false },
    //   awards: { type: [{ label: String, value: String }], default: [] },
    // },
    // certificate: {
    //   status: { type: Boolean, default: false },
    //   certificates: { type: [{ label: String, value: String }], default: [] },
    // },
    award: {
      status: { type: Boolean, default: false },
      awards: {
        type: [
          {
            label: String,
            image: Object,
            value: String,
          }
        ],
        default: [],
      },
    },

    certificate: {
      status: { type: Boolean, default: false },
      certificates: {
        type: [
          {
            label: String,
            image: Object,
            value: String,
          }
        ],
        default: [],
      },
    },
    form: {
      status: { type: Number, default: 0 },
      forms: {
        type: [
          {
            name: String,
            phone: String,
            email: String,
            message: String,
            createdAt: { type: Date, default: Date.now },
          }
        ],
        default: [],
      },
    },
    bank: {
      status: { type: Boolean, default: false },
      bankDetails: {
        type: {
          _id: {
            type: mongoose.Schema.ObjectId,
            default: new mongoose.Types.ObjectId(),
          },
          name: String,
          accnumber: String,
          bank: String,
          branch: String,
          ifsc: String,
          swift: String,
          vat: String,
        },
        default: {
          name: "",
        },
      },
    },
    enquiry: {
      status: { type: Boolean, default: false },
      email: {
        email: { type: String, default: "" },
        _id: {
          type: mongoose.Schema.ObjectId,
          default: new mongoose.Types.ObjectId(),
        },
      },
    },
  },
  { timestamps: true }
);

ProfileSchema.pre("save", async function (next) {
  const profile = this;
  const user = await profile.populate("user");
  if (user?.user?.role === "admin") {
    const fieldsToRemove = [
      "card",
      "profile.designation",
      "profile.profileLink",
      "profile.profileQR",
      "bank",
      "certificate",
      "award",
      "video",
      "service",
      "website",
      "social",
      "product",
      "visible",
      "enquiry",
    ];
    // Iterate over the array and remove each field from the document
    for (const field of fieldsToRemove) {
      this[field] = undefined;
    }
  }
  next();
});

export default mongoose.model("Profile", ProfileSchema);
