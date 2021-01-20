const fs = require('fs');
const path = require('path');

const express = require("express");
const bodyParser = require("body-parser");
const HttpError = require("./models/http-error");
const mongoose = require("mongoose");

const placesRoutes = require("./routes/places-route");
const userRoutes = require("./routes/users-routes");

const app = express();

//parse body
app.use(bodyParser.json());

app.use('/uploads/images/', express.static(path.join('uploads','images')));

app.use((req,res,next)=>{
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE')
    next();
})

app.use("/api/places", placesRoutes);
app.use("/api/users", userRoutes);

//only run if no other middleware snet a response
app.use((req, res, next) => {
  next(new HttpError("Invalid route", 404));
});
//Error middleware
app.use((error, req, res, next) => {
  //rollback file if exists
  if(req.file){
    fs.unlink(req.file.path, (err) => {
      console.log(err);
    });
  }
  if (res.headerSent) {
    return next(error);
  }
  console.log(error);
  res.status(error.code || 500);
  res.json({ message: error.message || "An unknown error occurred!" });
});

mongoose
  .connect(`mongodb+srv://${process.env.BD_USER}:${process.env.BD_PASSWORD}@rest-api.jyuoq.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`)
  .then(() => {
    app.listen(process.env.PORT || 5000);
  })
  .catch((err) => {
    console.log(err);
  });
