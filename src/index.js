const express = require("express")
const bodyParser = require("body-parser")
const mongoose = require("mongoose")
const route = require('./route/route');
const { Router } = require("express");
const multer = require("multer")


const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(multer().any())

app.use('/',route)

route.get("/test-me",function(req,res){
    res.send("my first api")
})

try {
    mongoose.connect("mongodb+srv://anil88:ghkHXqTEPEofBujh@cluster0.syc39.mongodb.net/group12Database?retryWrites=true&w=majority",{useNewUrlParser:true});
    console.log(`MongoDB connection successful.`);
} catch (error) {
    console.log(error);
}



const port = process.env.PORT || 3000;

app.listen(port, console.log(`Express App is running on ${port}`));
