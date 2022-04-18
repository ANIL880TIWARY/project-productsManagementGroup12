const bcrypt = require("bcrypt");

const userModel = require("../model/userModel");
const validator = require("../util/validator");
const jwt = require("jsonwebtoken")
const aws = require('../util/aws')

const createUSer = async (req, res) => {
  try {
    //let files = req.files
    let requestBody = req.body
    let profileImage = req.files

    if (!validator.isValidRequestBody(requestBody))
      return res.status(400).json({
        status: false, msg: "Invalid request parameters ,please provide the user details",
      });

    let { fname, lname, email, phone, password, address } = requestBody;

    if (!validator.isValid(fname))
      return res.status(400).json({ status: false, msg: "please provide the first name" });

    if (!validator.isValid(lname))
      return res.status(400).json({ status: false, msg: "please provide the last name" });

    if (!validator.isValid(email))
      return res.status(400).json({ status: false, msg: "please provide the email" });

    let isEmailUsed = await userModel.findOne({ email });

    if (isEmailUsed)
      return res.status(400).json({ status: false, msg: `${email} is already exists` });

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ status: false, msg: "please provide a valid email address" });


    if (!(profileImage && profileImage.length > 0)) {
      return res.status(400).send({ status: false, msg: "Invalid request parameters. Provide profileImage." });
    }

    profileImage = await aws.uploadFile(profileImage[0])
    console.log(profileImage)


    if (!validator.isValid(phone))
      return res.status(400).json({ status: false, msg: "please provide the  phone number" });

    if (!/^[6789]\d{9}$/.test(phone))
      return res.status(400).json({
        status: true, msg: "please enter a valid 10 digit phone number",
      });

    let isPhoneUsed = await userModel.findOne({ phone });

    if (isPhoneUsed)
      return res.status(400).json({ status: false, msg: `${phone} is already exists` });

    //The Phone Numbers will be of 10 digits, and it will start from 6,7,8 and 9 and remaing 9 digits

    if (!validator.isValid(password))
      return res.status(400).json({ status: false, msg: "please provide the password" });

    if (!(password.length > 8 && password.length < 15))
      return res.status(400).json({
        status: false, msg: "please ensure password length is 8-15??",
      });
    let saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds)
    console.log(salt)
    let hash = await bcrypt.hash(req.body.password, salt)
    console.log(hash)

    // let hasedPassword = await bcrypt.hash(password, saltRounds);

    if (!validator.isValid(address))
      return res.status(400).json({ status: false, msg: "address is required" });

    if (!validator.isValidRequestBody(req.body.address.shipping))
      return res.status(400).json({ status: false, msg: "please provide shipping details" });

    if (address.shipping) {
      if (!validator.isValid(address.shipping.street))
        return res.status(400).json({ status: false, msg: "please provide shipping street details" });

      if (!validator.isValid(address.shipping.city))
        return res.status(400).json({ status: false, msg: "please provide shipping city details" });

      if (!validator.isValid(address.shipping.pincode))
        return res.status(400).json({ status: false, msg: "please provide shipping pincode details" });

      if (isNaN(address.shipping.pincode))
        return res.status(400).json({ status: false, msg: "pincode should be Number" })


        if(!/(^[0-9]{6}(?:\s*,\s*[0-9]{6})*$)/.test(address.shipping.pincode)){
          return res.status(400).send({status:false, msg:`pincode six digit number`})
         }
    }
    if (!validator.isValidRequestBody(req.body.address.billing))
      return res.status(400).json({ status: false, msg: "please provide address billing details" });

    if (address.billing) {
      if (!validator.isValid(address.billing.street))
        return res.status(400).json({ status: false, msg: "please provide address billing street details" });

      if (!validator.isValid(address.billing.city))
        return res.status(400).json({ status: false, msg: "please provide address billing city details" });

      if (!validator.isValid(address.billing.pincode))
        return res.status(400).json({ status: false, msg: "please provide address billing pincode details" });

      if (isNaN(address.billing.pincode))
        return res.status(400).json({ status: false, msg: "pincode should be Number" })

        if(!/(^[0-9]{6}(?:\s*,\s*[0-9]{6})*$)/.test(address.billing.pincode)){
          return res.status(400).send({status:false, msg:`pincode six digit number`})
         }
      // if (address.shipping.pincode.length != 6)
      //   return res.status(400).send({ status: false, message: "pincode should be 6 digit" })
    }


    const updatedBody = { fname, lname, email, phone, password: hash, address, profileImage }
    let user = await userModel.create(updatedBody)
    res.status(201).send({ status: true, message: 'User created successfully', data: user })



  } catch (err) {
    res.status(500).json({ status: false, msg: err.message });
  }
};

module.exports.createUSer = createUSer

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
const login = async (req, res) => {
  try {
    if (!validator.isValidRequestBody(req.body))
      return res.status(400).json({ status: false, msg: "invalid paramaters please provide email-password", });

    let { email, password } = req.body;

    if (!validator.isValid(email))
      return res.status(400).json({ status: false, msg: "email is required" });

    const findUser = await userModel.findOne({ email });

    if (!findUser) {
      return res.status(401).send({ status: false, message: `Login failed! email is incorrect.` });
    }

    if (!validator.isValid(password))
      return res.status(400).json({ status: false, msg: "password is required" });

    let encryptedPassword = findUser.password;

    const findUserr = await bcrypt.compare(password, encryptedPassword);

    if (!findUserr) {
      return res.status(401).send({ status: false, message: `Login failed! password is incorrect.` });
    }

    let userId = findUser._id;

    let token = await jwt.sign(
      {
        userId: userId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600 * 24 * 7,
      },
      "Group-38"
    );

    res.status(200).json({ status: true, msg: "loggedin successfully", data: { userId, token }, });
  } catch (err) {
    res.status(500).json({ status: false, msg: err.message });
  }
};
module.exports.login = login



///////////////////////////////////////////////////////////////////////////////////////////////////////
const getUserProfile = async function (req, res) {
  try {
    let userId = req.params.userId

    // if (!validator.isValid(userId)) {
    //     return res.status(400).send({ status: false, msg: "userId required" })

    // }
    if (!validator.isValidObjectId(userId)) {
      return res.status(400).send({ status: false, msg: "userId invalid" })
    }
    let userprofile = await userModel.findById(userId)
    if (!userprofile) {
      return res.status(404).send({ status: false, msg: "not found " })
    }
    let result = {
      address: userprofile.address,
      _id: userprofile._id,
      fname: userprofile.fname,
      lname: userprofile.lname,
      email: userprofile.email,
      phone: userprofile.phone,
      password: userprofile.password,
      profileImage: userprofile.profileImage,
      createdAt: userprofile.createdAt,
      updatedAt: userprofile.updatedAt
    }
    return res.status(200).send({ status: true, data: result })
  }
  catch (err) {
    return res.status(500).send({ status: false, msg: err.message })
  }
};


module.exports.getUserProfile = getUserProfile





///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////


// const updateProfile = async (req, res) => {
//   try {
//     let saltRounds = 10
//     let files = req.files
//     let userId = req.params.userId
//     // let profileImage = req.files
//     // let data = req.body

//     if (!validator.isValidRequestBody(req.body)) {
//       return res.status(400).send({ status: false, message: "Invalid request parameters. Please provide user's details to update." })
//     }

//     const UserProfile = await userModel.findOne({ _id: userId })
//     if (!UserProfile) {
//       return res.status(400).send({ status: false, message: `${userId}  doesn't exists` })
//     }

//     let { fname, lname, email, phone, password, address, profileImage } = req.body;


//     // if (!validator.validString(fname)) {
//     //   return res.status(400).send({ status: false, message: 'fname is Required' })
//     // }

//     // if (!validator.validString(lname)) {
//     //   return res.status(400).send({ status: false, message: 'lname is Required' })
//     // }

//   //  if (!validator.validString(email)) { return res.status(400).send({ status: false, message: 'email is Required' }) }

//     if (!/^\w+([\.-]?\w+)@\w+([\.-]?\w+)(\.\w{2,3})+$/.test(email)) {
//       return res.status(400).send({ status: false, message: `Email should be a valid email address` });
//     }
//     let isEmailAlredyPresent = await userModel.findOne({ email: email })
//     if (isEmailAlredyPresent) {
//       return res.status(400).send({ status: false, message: `${email} is already registered.` });
//     }

//     // if (!validator.validString(phone)) {
//     //   return res.status(400).send({ status: false, message: 'phone number is Required' })
//     // }
//     if (!/^(?:(?:\+|0{0,2})91(\s*[\-]\s*)?|[0]?)?[6789]\d{9}$/.test(phone)) {
//       return res.status(400).send({ status: false, message: `Please enter a valid Indian phone number.` });
//     }
//     let isPhoneAlredyPresent = await userModel.findOne({ phone: phone })
//     if (isPhoneAlredyPresent) {
//       return res.status(400).send({ status: false, message: `${phone} is already registered.` });
//     }

//     // if (!validator.validString(password)) {
//     //   return res.status(400).send({ status: false, message: 'password is Required' })
//     // }
//     if (!(password.length >= 8 && password.length <= 15)) {
//       return res.status(400).send({ status: false, message: "Password should be Valid min 8 and max 15 " })
//     }
//     var encryptedPassword = await bcrypt.hash(password, saltRounds)


//     if (address) {

//       if (address.shipping) {

//         if (!validator.isValid(address.shipping.street))
//           return res.status(400).send({ status: false, Message: "street name is required" })



//         if (!validator.isValid(address.shipping.city))
//           return res.status(400).send({ status: false, Message: "city name is required" })



//         if (!validator.isValid(address.shipping.pincode))
//           return res.status(400).send({ status: false, Message: "pincode is required" })

//         if (isNaN(address.shipping.pincode))
//           return res.status(400).json({ status: false, msg: "pincode should be Number" })
        

//         if (address.shipping.pincode.length != 6)
//           return res.status(400).send({ status: false, message: "pincode should be 6 digit" })
//       }
      

//       var shippingStreet = address.shipping.street
//       var shippingCity = address.shipping.city
//       var shippingPincode = address.shipping.pincode

//       //  } else {
//       //       return res.status(400).send({ status: false, message: " Invalid request parameters. Shipping address cannot be empty" });
//       //     }

//       if (address.billing) {
//         if (!validator.isValid(address.billing.street))
//           return res.status(400).send({ status: false, Message: "Please provide street name in billing address" })


//         if (!validator.isValid(address.billing.city))
//           return res.status(400).send({ status: false, Message: "Please provide city name in billing address" })



//         if (!validator.isValid(address.billing.pincode))
//           return res.status(400).send({ status: false, Message: "Please provide pincode in billing address" })

//         if (isNaN(address.billing.pincode))
//           return res.status(400).json({ status: false, msg: "pincode should be Number" })


//         if (address.billing.pincode.length != 6)
//           return res.status(400).send({ status: false, message: "pincode should be 6 digit" })
//       }
//     //   console.log(address.shipping.pincode.length)
//     // }
//     // 

//     var billingStreet = address.billing.street
//     var billingCity = address.billing.city
//     var billingPincode = address.billing.pincode

//     // }  else {
//     //     return res.status(400).send({ status: false, message: " Invalid request parameters. Billing address cannot be empty" });
//     //   }


//     //validating user's profile image.
//     if (files) {
//       if (validator.isValidRequestBody(files)) {
//         if (!(files && files.length > 0)) {
//           return res.status(400).send({ status: false, message: "Invalid request parameter, please provide profile image" })
//         }
//         var updatedProfileImage = await aws.uploadFile(files[0])
//       }

//     }


//     let changeProfileDetails = await userModel.findOneAndUpdate({ _id: userId }, {
//       $set: {
//         fname: fname,
//         lname: lname,
//         email: email,
//         profileImage: updatedProfileImage,
//         phone: phone,
//         password: encryptedPassword,
//         'address.shipping.street': shippingStreet,
//         'address.shipping.city': shippingCity,
//         'address.shipping.pincode': shippingPincode,
//         'address.billing.street': billingStreet,
//         'address.billing.city': billingCity,
//         'address.billing.pincode': billingPincode
//       }
//     }, { new: true })
//     return res.status(200).send({ status: true, data: changeProfileDetails })

//  }} catch (err) {
//     return res.status(500).json({ status: false, msg: err.message })
// }
// }
// module.exports.updateProfile = updateProfile
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const updateProfile = async function (req, res) {
  try {
      const userId = req.params.userId
      if (!validator.isValid(userId)) {
          return res.status(400).send({ status: false, msg: "userId is required" })
      }
      if (!validator.isValidObjectId(userId)) {
          return res.status(400).send({ status: false, msg: "userId is invalid" })
      }
      let { fname, lname, email, phone, password, address } = req.body
      const dataObject = {};
      if (Object.keys(req.body) == 0) {
          return res.status(400).send({ status: false, msg: "enter data to update" })
      }
      if (validator.isValid(fname)) {
          dataObject['fname'] = fname.trim()
      }
      if (validator.isValid(lname)) {
          dataObject['lname'] = lname.trim()
      }
      if (validator.isValid(email)) {
          let findMail = await userModel.findOne({ email: email })
          if (findMail) {
              return res.status(400).send({ status: false, msg: "this email is already register" })
          }
          dataObject['email'] = email.trim()
      }
      if (validator.isValid(phone)) {
          let findPhone = await userModel.findOne({ phone: phone })
          if (findPhone) {
              return res.status(400).send({ status: false, msg: "this mobile number is already register" })
          }
          dataObject['phone'] = phone.trim()
      }
      if (validator.isValid(password)) {
          if (!password.length >= 8 && password.length <= 15) {
              return res.status(400).send({ status: false, msg: "password length should be 8 to 15" })
          }
          let saltRound = 10
          const hash = await bcrypt.hash(password, saltRound)
          dataObject['password'] = hash
      }
      let file = req.files
      if (file.length > 0) {
          let uploadFileUrl = await aws.uploadFile(file[0])
          dataObject['profileImage'] = uploadFileUrl
      }

      if (address) {
          address = JSON.parse(address)
          if (address.shipping) {
              if (address.shipping.street) {

                  dataObject['address.shipping.street'] = address.shipping.street
              }
              if (address.shipping.city) {

                  dataObject['address.shipping.city'] = address.shipping.city
              }
              if (address.shipping.pincode) {
                  if (typeof address.shipping.pincode !== 'number') {
                    
                      return res.status(400).send({ status: false, message: 'please enter pinCode in digit' })
                  }
                  if(!/(^[0-9]{6}(?:\s*,\s*[0-9]{6})*$)/.test(address.shipping.pincode)){
                   return res.status(400).send({status:false, msg:`pincode six digit number`})
                  }
                 // console.log(Object.keys(address.shipping.pincode).join(" "))
                  dataObject['address.shipping.pincode'] = address.shipping.pincode
                  
              }
              
          }

          if (address.billing) {
              if (address.billing.street) {

                  dataObject['address.billing.street'] = address.billing.street
              }
              if (address.billing.city) {

                  dataObject['address.billing.city'] = address.billing.city
              }
              if (address.billing.pincode) {
                  if (typeof address.billing.pincode !== 'number') {
                      return res.status(400).send({ status: false, message: ' Please provide pincode in number' })
                  }
                  if(!/(^[0-9]{6}(?:\s*,\s*[0-9]{6})*$)/.test(address.billing.pincode)){
                    return res.status(400).send({status:false, msg:`pincode six digit number`})
                   }
                  dataObject['address.billing.pincode'] = address.billing.pincode
              }
          }
      }
      const updateProfile = await userModel.findOneAndUpdate({ userId }, dataObject , { new: true })
      if (!updateProfile) {
          return res.status(404).send({ status: false, msg: "user profile not found" })
      }
      return res.status(200).send({ status: true, msg: "User Profile updated", data: updateProfile })

  }
  catch (err) {
      return res.status(500).send({ status: false, msg: err.message })
  }
}

module.exports.updateProfile = updateProfile

