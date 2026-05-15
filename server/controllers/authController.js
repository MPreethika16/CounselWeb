import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const signup = async (req, res) => {
  try {
    const { name, email, password, role, collegeId } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
  name,
  email,
  password: hashedPassword,
  role: role || "student",
  collegeId: role === "institution" ? collegeId : null
});

    res.status(201).json({
      message: "User created successfully",
      user
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// LOGIN
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid email" });
    }

    // 2. Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // 3. Generate token
    const token = jwt.sign(
  {
    id: user._id,
    role: user.role,
    collegeId: user.collegeId
  },
  process.env.JWT_SECRET,
  { expiresIn: "7d" }
);

    // 4. Send response
    const userResponse = { ...user._doc };
    delete userResponse.password;

    res.json({
      message: "Login successful",
      token,
      user: userResponse
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, rank, category, gender } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name) user.name = name;
    if (rank !== undefined) user.rank = rank;
    if (category !== undefined) user.category = category;
    if (gender) user.gender = gender;

    await user.save();

    const userResponse = { ...user._doc };
    delete userResponse.password;

    res.json({ message: "Profile updated successfully", user: userResponse });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const googleAuth = async (req, res) => {
  try {
    const { credential, role, collegeId } = req.body;
    
    if (role === "institution" && !collegeId) {
      return res.status(400).json({ message: "Please select a college for institution account." });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        googleId,
        picture,
        authProvider: "google",
        role: role || "student",
        collegeId: role === "institution" ? collegeId : null
      });
    } else {
      // Link Google account if not already linked
      if (!user.googleId) {
        user.googleId = googleId;
        user.picture = picture;
        user.authProvider = "google";
        await user.save();
      }
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        collegeId: user.collegeId
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const userResponse = { ...user._doc };
    delete userResponse.password;

    res.json({
      message: "Google Login successful",
      token,
      user: userResponse
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};