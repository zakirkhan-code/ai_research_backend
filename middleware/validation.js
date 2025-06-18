const validateRegistration = (req, res, next) => {
  const { username, email, password, affiliation } = req.body;
  const errors = [];

  if (!username || username.trim().length < 3) {
    errors.push("Username must be at least 3 characters long");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    errors.push("Please provide a valid email address");
  }

  if (!password || password.length < 6) {
    errors.push("Password must be at least 6 characters long");
  }

  if (!affiliation || affiliation.trim().length < 2) {
    errors.push("Affiliation is required");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }

  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email) {
    errors.push("Email is required");
  }

  if (!password) {
    errors.push("Password is required");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }

  next();
};

// NEW: Forgot password validation
const validateForgotPassword = (req, res, next) => {
  const { email } = req.body;
  const errors = [];

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    errors.push("Please provide a valid email address");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }

  next();
};

// NEW: Reset password validation
const validateResetPassword = (req, res, next) => {
  const { newPassword } = req.body;
  const errors = [];

  if (!newPassword || newPassword.length < 6) {
    errors.push("New password must be at least 6 characters long");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }

  next();
};

const validateCreateProject = (req, res, next) => {

  const { title, description, goals, objectives, timeline } = req.body;
  const errors = [];

  // Title validation
  console.log("Validating title:", title, typeof title);
  if (!title || typeof title !== "string" || title.trim().length < 3) {
    errors.push("Project title must be at least 3 characters long");
    console.log("Title validation failed");
  } else {
    console.log("Title validation passed");
  }

  // Description validation
  console.log("Validating description:", description, typeof description);
  if (
    !description ||
    typeof description !== "string" ||
    description.trim().length < 10
  ) {
    errors.push("Project description must be at least 10 characters long");
    console.log("Description validation failed");
  } else {
    console.log("Description validation passed");
  }

  // Goals validation
  console.log("Validating goals:", goals, Array.isArray(goals), goals?.length);
  if (!goals || !Array.isArray(goals) || goals.length === 0) {
    errors.push("At least one goal is required");
  } else {
    // Check if any goal has content
    const validGoals = goals.filter(
      (goal) => goal && typeof goal === "string" && goal.trim().length > 0
    );
    if (validGoals.length === 0) {
      errors.push("At least one valid goal is required");
    } else {
      console.log("✅ Goals validation passed");
    }
  }

  // Objectives validation
  console.log(
    "Validating objectives:",
    objectives,
    Array.isArray(objectives),
    objectives?.length
  );
  if (!objectives || !Array.isArray(objectives) || objectives.length === 0) {
    errors.push("At least one objective is required");
  } else {
    // Check if any objective has content
    const validObjectives = objectives.filter(
      (obj) => obj && typeof obj === "string" && obj.trim().length > 0
    );
    if (validObjectives.length === 0) {
      errors.push("At least one valid objective is required");
    } else {
      console.log("✅ Objectives validation passed");
    }
  }

  // Timeline validation
  console.log("Validating timeline:", timeline, typeof timeline);
  if (!timeline || typeof timeline !== "object") {
    errors.push("Timeline is required");
  } else if (!timeline.startDate || !timeline.endDate) {
    errors.push("Timeline with start and end dates is required");
  } else {

    const startDate = new Date(timeline.startDate);
    const endDate = new Date(timeline.endDate);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      errors.push("Invalid date format in timeline");
    } else if (startDate >= endDate) {
      errors.push("End date must be after start date");
    } else {
      console.log("✅ Timeline validation passed");
    }
  }
  if (errors.length > 0) {
    console.log("Validation errors:", errors);
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
      receivedData: {
        title: title || "MISSING",
        description: description || "MISSING",
        goals: goals || "MISSING",
        objectives: objectives || "MISSING",
        timeline: timeline || "MISSING",
      },
    });
  }
  next();
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
   validateCreateProject,
};
