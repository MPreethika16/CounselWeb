export const isStudent = (req, res, next) => {
  if (req.user.role !== "student") {
    return res.status(403).json({
      error: "Access denied. Students only."
    });
  }

  next();
};

export const isInstitution = (req, res, next) => {
  if (req.user.role !== "institution") {
    return res.status(403).json({
      error: "Access denied. Institutions only."
    });
  }

  next();
};

export const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      error: "Access denied. Admins only."
    });
  }

  next();
};