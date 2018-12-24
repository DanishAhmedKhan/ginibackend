const express = require('express');
const bcrypt = require('bcrypt');
const admin = require('firebase-admin');
const uid = require('uuid/v4');
const mongoose = require('mongoose');
const _ = require('lodash');
const __ = require('./apiUtil');
const axios = require('axios');
const Joi = require('joi');
const User = require('../schema/User');
const Ride = require('../schema/Ride');
const Partner = require('../schema/Partner');
const auth = require('../middlewares/auth');
const rideStatus = require('./rideStatus');

const router = express.Router();

const signup = async (req, res) => {
    const error = __.validate(req.body, {
        email: Joi.string().required().min(5).max(255).email(),
        password: Joi.string().required().min(5).max(255),
        phoneNumber: Joi.string().required(),
        token: Joi.string().required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    let user = await User.findOne({ email: req.body.email });
    if (user) return res.status(400).send('User already registered');

    user = _.pick(req.body, ['email', 'password', 'phoneNumber', 'token']);

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);

    const newUser = new User(user);
    await newUser.save();
    const token = newUser.generateAuthToken();
    console.log("Token = " + token);

    res.header('x-user-auth-token', token)
       .status(200)
       .send(__.success('Signed up.'));
};

const login = async (req, res) => {
    const error = __.validate(req.body, {
        email: Joi.string().required().min(5).max(255).email(),
        password: Joi.string().required().min(5).max(255),
        token: Joi.string().required(),
    });
    if (error) return res.status(400).send(error.details[0].message);

    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(400).send(__.error('Invalid email or password.'));

    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) return res.status(400).send(__.error('Invalid email or password'));

    await User.updateOne({ _id: user._id }, {
        $set: { token: req.body.token }
    });

    const token = user.generateAuthToken();
    res.header('x-user-auth-token', token)
       .status(200)
       .send(__.success('Loged in.'));
};

const logout = async (req, res) => {

};

const addProfile = async (req, res) => {

};

const token = async (req, res) => {
    const error = __.validate(req.body, {
        token: Joi.string().required()
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    await User.update({ _id: req.user._id }, {
        $set: { token: req.body.token }
    });

    res.status(200).send(__.success('Token Updated.'));
};

const rideRequest = async (req, res) => {
    const error = __.validate(req.body, {
        partnerId: Joi.string().required(),
        //partnerNumber: Joi.string().required(),
        //partnerToken: Joi.string().required(),    
        //username: Joi.string().required(),
        //userNumber: Joi.string().required(),
        //userToken: Joi.string().required(),
        customerCount: Joi.number().integer().required(),
        address: Joi.string().required(),
        pickupLat: Joi.number().precision(8).required(),
        pickupLng: Joi.number().precision(8).required()
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    //return res.status(200).send(__.success("WORKING!"));

    //const { currentRide } = await User.findOne({ _id: req.body.userId }, 'currentRide');
    //if (currentRide != null) 
        //return res.status(200).send(__.success('Already in a ride'));

    const user = await User.findOne({ _id: req.body.userId }, 'phoneNumber token username');
    const partner = await Partner.findOne({ _id: req.body.partnerId }, 'token phoneNumber');

    const rideId = mongoose.Types.ObjectId();
    const ride = {
        _id: rideId,
        user: {
            id: req.body.userId,
            token: user.token,
            number: user.phoneNumber,
        },
        partner: {
            id: req.body.partnerId,
            token: partner.token,
            number: partner.phoneNumber,
        },
        customerCount: {
            user: req.body.customerCount
        },
        pickupLocation: {
            address: req.body.address,
            lat: req.body.pickupLat,
            lng: req.body.pickupLng
        },
        status: rideStatus.PARTNER_NOTIFIED,
    };

    const newRide = new Ride(ride);
    await newRide.save();
    await User.updateOne({ _id: req.body.userId }, {
        $set: { currentRide: rideId }
    });
    await Partner.updateOne({ _id: req.body.partnerId }, {
        $push: { allRides: rideId  }
    });

    __.sendNotification({
        data: {
            status: '101',
            username: user.username + '',
            userCount: req.body.customerCount + '',
            rideId: rideId + ''
        },
        token: partner.token
    });

    res.status(200).send(__.success('Notification send to partner. Wait for the response.'));
};

const label = async (req, res) => {
    const error = __.validate(req.body, {
        label: Joi.string().required(),
        address: Joi.string().required(),
        lat: Joi.numner().required(),
        lng: Joi.number().required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    const label = _.pick(req.body, ['label', 'address', 'lat', 'lng']);

    await User.updateOne({ _id: userId }, {
        $push: { favouritePickupLocations: label }
    });

    res.status(200).send(__.success('Label added.'));
};

const allLabel = async (req, res) => {
    const labels = await User.findOne({ _id: userId }, 'favouritePickupLocations');

    res.status(200).send(__.success(labels));
}

const deleteLabel = async (req, res) => {
    const error = __.validate(req.body, {
        label: Joi.string().required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    await User.updateOne({ _id: userId }, {
        $pull: { favouritePickupLocations: { label: req.body.label } }
    });

    res.status(200).send(__.success('Deleted label.'));
}

const getAllUser = async (req, res) => {
    const users = User.find({});
    res.status(200).send(users);
};

const isLoggedIn = async (req, res) => {
    const error = __.validate(req.body, {
        userToken: Joi.string().required()
    });
    if (error) res.status(400).send('Token not send.');

    const result = await User.findOne({ _id: req.body.userId }, 'login token');
    const response = result.login && result.token != req.body.token;

    res.status(200).send(__.success(response));
};

const isGreyListed = async (req, res) => {
    const result = await User.findOne({ _id: req.body.userId }, 'greylist');

    res.status(200).send(__.success(result));
};

router.post('/test', async (req, res) => {
    console.log('Testign route');
    res.status(200).send('CR7');
});

router.post('/signup', signup);
router.post('/login', login);
router.post('/isLoggedIn', isLoggedIn);
router.post('/logout', auth, logout);
router.post('/token', auth, token);
router.post('/requestRide', auth, rideRequest);
router.get('/isGreyListed', auth, isGreyListed);
router.post('/label', label);
router.post('/allLabel', allLabel);
router.post('/deletelabel', deleteLabel);


router.post('/testNotification', async (req, res) => {
    console.log('Testing....');
    var registrationToken = 'eJmpvpSwDA0:APA91bFUMxPVO8nbusLLRmxoTOKTz2aOdOZgQiz3GEI7QAPucStlTOwBJy50e73j8ehNEEah6CfGczdxz6MdWR4VwftAP5Gmc9S5QDQO54ksn1yocYnmGSLt96u7xatDsL4C8wSPsh51';

    res.status(200).send('CR7 is the best');

    __.sendNotification({
        data: {
            s: '101',
            u: 'Danish',
            c: '4',
        },
        token: registrationToken
    });
}); 

router.post('/updateLocation', async (req, res) => {
    console.log('Lat', req.body.lat);
    console.log("count ======= ", req.body.count);

    res.status(200).send('Success CR7!');
});

router.post('/sample', async (req, res) => {
    console.log('Sample route requested!');

    const x = 13;
    if (x == 123) return res.status(400).send(__.error('some error00'));

    res.status(200).send('cristiano ronaldo');
});

router.post('/axiosTest', async (req, res) => {
    try {
        const apiResponse = await axios.post('http://localhost:4000/api/user/sample', {
            x: 123
        });
        console.log(apiResponse.data);

        
    } catch (err) {
        console.log('ERROR');
        console.log(err.response);
        //console.log(err);
        console.log(err.response.data);
        console.log(err.response.status);
    }

    res.status(200).send('sadjaskjdaskjdsajksa');
});


module.exports = router;
