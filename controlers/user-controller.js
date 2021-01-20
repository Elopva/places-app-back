const { v4: uuidv4 } = require("uuid");
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const HttpError = require("../models/http-error");
const User = require("../models/user");

const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "-password");
  } catch (err) {
    console.log(errors);
    return next(new HttpError("Error fetching users.", 500));
  }

  res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};

const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors);
    return next(new HttpError("Invalid inputs passed. Check the data.", 422));
  }
  const { name, email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    console.log(errors);
    return next(new HttpError("Signup failed, try again later.", 500));
  }

  if (existingUser) {
    return next(new HttpError("User already exists. Please login", 422));
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    console.log(err);
    return next(new HttpError("Could not create user.", 500));
  }

  const createdUser = new User({
    name,
    email,
    image: req.file.path,
    password: hashedPassword,
    places: [],
  });
  try {
    await createdUser.save();
  } catch (err) {
    console.log(errors);
    return next(new HttpError("Signup failed, try again later.", 500));
  }

  let token;
  try{
  token = jwt.sign(
    { userId: createdUser.id, email: createdUser.email },
    process.env.JWT_KEY,
    { expiresIn: "1h" }
  );
  }catch(err){
    return next(new HttpError("Signup failed, try again later.", 500));
  }

  res.status(201).json({ userId: createdUser.id, email: createdUser.email, token: token });
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    console.log(errors);
    return next(new HttpError("Login failed, try again later.", 500));
  }

  if (!existingUser) {
    return next(new HttpError("Invalid credentials.", 403));
  }

  let isValidPssw = false;
  try {
    isValidPssw = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    return next(new HttpError("Login failed, try again later.", 500));
  }

  if (!isValidPssw) {
    return next(new HttpError("Invalid credentials.", 403));
  }

   let token;
   try {
     token = jwt.sign(
       { userId: existingUser.id, email: existingUser.email },
       process.env.JWT_KEY,
       { expiresIn: "1h" }
     );
   } catch (err) {
     return next(new HttpError("Login failed, try again later.", 500));
   }

  res.json({
   userId: existingUser.id,
   email: existingUser.email,
   token: token
  });
};

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
