const fs = require('fs');

const { v4: uuidv4 } = require("uuid");
const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const HttpError = require("../models/http-error");
const getCoordsFromAddress = require("../util/location");
const Place = require("../models/place");
const User = require("../models/user");

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.placeId;
  let place;
  try {
    place = await Place.findById(placeId);
  } catch {
    (err) => {
      return next(
        new HttpError("Could not find a place for the provided id.", 404)
      );
    };
  }

  if (!place) {
    return next(
      new HttpError("Could not find a place for the provided id.", 404)
    ); //if the code is synchronous you could use throw also.
  }

  res.json({ place: place.toObject({ getters: true }) }); //if the name of the variable equals the name of the property we can shorten instead of write {place: place}
};

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.userId;
  //let places;
  let userWithPlaces;
  try {
    console.log(userId);
    //places = await Place.find({ creator: userId });
    userWithPlaces = await User.findById(userId).populate('places');
  } catch (err) {
    console.log(err);
    return next(
      new HttpError("Could not find a user for the provided id.", 404)
    );
  }

  //if (!places || places.length === 0) {
    if(!userWithPlaces|| userWithPlaces.places.length === 0){
    return next(
      new HttpError("Could not find a user for the provided id. place = 0", 404)
    );
  }

  /* res.json({
    places: places.map((place) => place.toObject({ getters: true })),
  }); */
  res.json({
    places: userWithPlaces.places.map((place) => place.toObject({ getters: true })),
  });
};

const createPlace = async (req, res, next) => {
  console.log(req.file);
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors);
    return next(new HttpError("Invalid inputs passed. Check the data.", 422));
  }
  const { title, description, address } = req.body;

  //convert addres to coords
  let coordiantes;
  try {
    coordinates = await getCoordsFromAddress(address);
  } catch (err) {
    return next(err);
  }
  const createdPlace = new Place({
    title,
    description,
    address,
    location: coordinates,
    image: req.file.path,
    creator: req.userData.userId,
  });

  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (err) {
    const error = new HttpError("Error fetching user.", 500);
    return next(error);
  }

  if(!user){
    const error = new HttpError("Invalid user.", 404);
    return next(error);
  }


  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({session: sess});
    user.places.push(createdPlace);
    await user.save({session: sess});
    await sess.commitTransaction();
  } catch (err) {
    console.log(err);
    const error = new HttpError("Creating place failled.", 500);
    return next(error);
  }

  res.status(201).json({ place: createdPlace });
};

const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors);
    return next(new HttpError("Invalid inputs passed. Check the data.", 422));
  }
  const placeId = req.params.placeId;
  const { title, description } = req.body;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    return next(new HttpError("Could not find the place.", 404));
  }

  if(place.creator.toString() !== req.userData.userId){
    return next(new HttpError("You don't have the authorization to update this place.", 401));
  }

  place.title = title;
  place.description = description;

  try {
    await place.save();
  } catch (err) {
    return next(new HttpError("Failed to update the place.", 500));
  }

  res.status(200).json({ place: place.toObject({ getters: true }) });
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.placeId;
  let place;
  try {
    place = await Place.findById(placeId).populate('creator');
  } catch (err) {
    return next(new HttpError("Could not find the place.", 404));
  }

  if(!place){
    return next(new HttpError("Could not find the place.", 404));
  }

  if(place.creator.id !== req.userData.userId){
    return next(
      new HttpError(
        "You don't have the authorization to delete this place.",
        401
      )
    );
  }

  const imagePath = place.image;

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.remove({ session: sess });
    place.creator.places.pull(place);
    await place.creator.save({ session: sess }); 
    await sess.commitTransaction();
  } catch (err) {
    return next(new HttpError("Could not delete the place.", 500));
  }

  fs.unlink(imagePath, (err)=>{console.log(err)});

  res.status(200).json({ message: "Deleted place " + placeId });
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
