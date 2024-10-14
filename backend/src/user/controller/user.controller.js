// Please don't change the pre-written code
// Import the necessary modules here

import { sendPasswordResetEmail } from "../../../utils/emails/passwordReset.js";
import { sendWelcomeEmail } from "../../../utils/emails/welcomeMail.js";
import { ErrorHandler } from "../../../utils/errorHandler.js";
import { sendToken } from "../../../utils/sendToken.js";
import UserModel from "../models/user.schema.js";
import bcrypt from 'bcryptjs';
import {
  createNewUserRepo,
  deleteUserRepo,
  findUserForPasswordResetRepo,
  findUserRepo,
  getAllUsersRepo,
  updateUserProfileRepo,
  updateUserRoleAndProfileRepo,
} from "../models/user.repository.js";
import crypto from "crypto";

export const createNewUser = async (req, res, next) => {
  const { name, email, password } = req.body;
  const isUserPresent=await UserModel.findOne({email});
  if(isUserPresent){
    return res.status(400).json({success:false,error:"email already registered"});
  }
  // const hashedPassword=await bcrypt.hash(password,10);
  // console.log("hashedPassword is:",hashedPassword);
  try {
    const newUser = await createNewUserRepo(req.body);
    await sendToken(newUser, res, 200);

    // Implement sendWelcomeEmail function to send welcome messag
    await sendWelcomeEmail(newUser);
  } catch (err) {
    //  handle error for duplicate email
    return next(new ErrorHandler(400, err));
  }
};

export const userLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new ErrorHandler(400, "please enter email/password"));
    }
    const user = await findUserRepo({ email }, true);
    if (!user) {
      return next(
        new ErrorHandler(401, "user not found! register yourself now!!")
      );
    }
    const passwordMatch = await user.comparePassword(password);
    if (!passwordMatch) {
      return next(new ErrorHandler(401, "Invalid email or passswor!"));
    }
    await sendToken(user, res, 200);
  } catch (error) {
    return next(new ErrorHandler(400, error));
  }
};

export const logoutUser = async (req, res, next) => {
  res
    .status(200)
    .cookie("token", null, {
      expires: new Date(Date.now()),
      httpOnly: true,
    })
    .json({ success: true, msg: "logout successful" });
};

// Forget Password Function
export const forgetPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Check if the user exists by email
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Generate reset password token
    const resetToken = user.getResetPasswordToken();

    // Save the user document to update the token and expiration fields in the DB
    await user.save({ validateBeforeSave: false });

    // Create the reset password URL
    const resetPasswordURL = `${req.protocol}://${req.get("host")}/api/storefleet/user/password/reset/${resetToken}`;

    // Send the password reset email
    await sendPasswordResetEmail(user, resetPasswordURL);

    res.status(200).json({ success: true, message: "Password reset email sent" });
  } catch (error) {
    return next(new ErrorHandler(500, "Error sending password reset email"));
  }
};

// Reset Password Function
export const resetUserPassword = async (req, res, next) => {
  try {
    // Hash the token from the URL params
    const resetPasswordToken = crypto.createHash("sha256").update(req.params.token).digest("hex");

    // Find the user by the reset token and check if the token is not expired
    const user = await UserModel.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired token" });
    }

    // Set the new password and clear the reset token and its expiration
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    // Save the updated user with the new password
    await user.save();

    res.status(200).json({ success: true, message: "Password reset successful" });
  } catch (error) {
    return next(new ErrorHandler(500, "Error resetting password"));
  }
};

export const getUserDetails = async (req, res, next) => {
  try {
    const userDetails = await findUserRepo({ _id: req.user._id });
    res.status(200).json({ success: true, userDetails });
  } catch (error) {
    return next(new ErrorHandler(500, error));
  }
};

export const updatePassword = async (req, res, next) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  try {
    if (!currentPassword) {
      return next(new ErrorHandler(401, "pls enter current password"));
    }

    const user = await findUserRepo({ _id: req.user._id }, true);
    const passwordMatch = await user.comparePassword(currentPassword);
    if (!passwordMatch) {
      return next(new ErrorHandler(401, "Incorrect current password!"));
    }

    if (!newPassword || newPassword !== confirmPassword) {
      return next(
        new ErrorHandler(401, "mismatch new password and confirm password!")
      );
    }

    user.password = newPassword;
    await user.save();
    await sendToken(user, res, 200);
  } catch (error) {
    return next(new ErrorHandler(400, error));
  }
};

export const updateUserProfile = async (req, res, next) => {
  const { name, email } = req.body;
  try {
    const updatedUserDetails = await updateUserProfileRepo(req.user._id, {
      name,
      email,
    });
    res.status(201).json({ success: true, updatedUserDetails });
  } catch (error) {
    return next(new ErrorHandler(400, error));
  }
};

// admin controllers
export const getAllUsers = async (req, res, next) => {
  try {
    const allUsers = await getAllUsersRepo();
    res.status(200).json({ success: true, allUsers });
  } catch (error) {
    return next(new ErrorHandler(500, error));
  }
};

export const getUserDetailsForAdmin = async (req, res, next) => {
  try {
    const userDetails = await findUserRepo({ _id: req.params.id });
    if (!userDetails) {
      return res
        .status(400)
        .json({ success: false, msg: "no user found with provided id" });
    }
    res.status(200).json({ success: true, userDetails });
  } catch (error) {
    return next(new ErrorHandler(500, error));
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const deletedUser = await deleteUserRepo(req.params.id);
    if (!deletedUser) {
      return res
        .status(400)
        .json({ success: false, msg: "no user found with provided id" });
    }

    res
      .status(200)
      .json({ success: true, msg: "user deleted successfully", deletedUser });
  } catch (error) {
    return next(new ErrorHandler(400, error));
  }
};

export const updateUserProfileAndRole = async (req, res, next) => {
  const {id}=req.params;
  const {name,email,role}=req.body;
  const data={name,email,role};
  try{
   const user=await updateUserRoleAndProfileRepo(id,data);
   if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });  
  }
   return res.status(201).json({ success: true, user });
   }catch(err){
      return next(new ErrorHandler(400,err));
   }
};
