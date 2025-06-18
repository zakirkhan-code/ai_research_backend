const mongoose = require("mongoose");

const documentVersionSchema = new mongoose.Schema({
  versionNumber: {
    type: Number,
    required: true,
    default: 1,
  },
  fileName: {
    type: String,
    required: true,
  },
  filePath: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
    required: true,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  changeLog: {
    type: String,
    default: "",
  },
});

const documentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    fileName: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    fileExtension: {
      type: String,
      required: true,
    },

    // Project Association
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },

    // Upload Information
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Access Control
    permissions: {
      isPublic: {
        type: Boolean,
        default: false,
      },
      allowedUsers: [
        {
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          permission: {
            type: String,
            enum: ["view", "edit", "comment", "download"],
            default: "view",
          },
          grantedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          grantedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },

    // Version Control
    currentVersion: {
      type: Number,
      default: 1,
    },
    versions: [documentVersionSchema],

    // Document Status
    status: {
      type: String,
      enum: ["active", "archived", "deleted"],
      default: "active",
    },

    // Document Tags and Categories
    tags: [String],
    category: {
      type: String,
      enum: [
        "research_paper",
        "dataset",
        "presentation",
        "report",
        "code",
        "other",
      ],
      default: "other",
    },

    // Download and View Statistics
    downloads: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        downloadedAt: {
          type: Date,
          default: Date.now,
        },
        ipAddress: String,
      },
    ],

    viewCount: {
      type: Number,
      default: 0,
    },

    lastViewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
documentSchema.index({ project: 1, uploadedBy: 1 });
documentSchema.index({ "permissions.allowedUsers.user": 1 });
documentSchema.index({ status: 1, createdAt: -1 });
documentSchema.index({ tags: 1 });

// Virtual for file URL
documentSchema.virtual("fileUrl").get(function () {
  return `/api/documents/${this._id}/download`;
});

// Method to check if user has permission
documentSchema.methods.hasPermission = function (
  userId,
  permissionType = "view"
) {
  // Owner always has full permissions
  if (this.uploadedBy.toString() === userId.toString()) {
    return true;
  }

  // Check if public document
  if (this.permissions.isPublic && permissionType === "view") {
    return true;
  }

  // Check explicit permissions
  const userPermission = this.permissions.allowedUsers.find(
    (perm) => perm.user.toString() === userId.toString()
  );

  if (!userPermission) return false;

  // Permission hierarchy: download > edit > comment > view
  const permissionLevels = {
    view: 1,
    comment: 2,
    edit: 3,
    download: 4,
  };

  return (
    permissionLevels[userPermission.permission] >=
    permissionLevels[permissionType]
  );
};

module.exports = mongoose.model("Document", documentSchema);
