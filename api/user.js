const express = require('express');
const bcrypt = require('bcrypt');
const admin = require('firebase-admin');
const uid = require('uuid/v4');
const mongoose = require('mongoose');
const _ = require('lodash');
const __ = require('./apiUtil');
const axios = require('axios');
const Joi = require('joi');
const config = require('config');
const ip = require('ip');
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
        deviceId: Joi.string().required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    let user;
    user = await User.findOne({ email: req.body.email });
    if (user) return res.status(400).send(__.error('User already registered'));

    user = _.pick(req.body, ['email', 'password', 'phoneNumber', 'token', 'deviceId']);

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);

    const newUser = new User(user);
    await newUser.save();
    const token = newUser.generateAuthToken();

    res.header('x-user-auth-token', token)
       .status(200)
       .send(__.success('Signed up.'));
};

const checkDeviceId = async (req, res) => {
    const error = __.validate(req.body, {
        deviceId: Joi.string().required(),
    });
    if (error) res.status(400).send(__.error(error.message[0].details));

    const user = await User.findOne({ deviceId: req.body.deviceId });
    if (user) return res.status(200).send(__.success(true));
    return res.status(200).send(__.success(false));
};

const login = async (req, res) => {
    const error = __.validate(req.body, {
        email: Joi.string().required().min(5).max(255).email(),
        password: Joi.string().required().min(5).max(255),
        token: Joi.string().required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(400).send(__.error('Invalid email or password.'));

    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) return res.status(400).send(__.error('Invalid email or password'));

    await User.updateOne({ _id: user._id }, {
        $set: { token: req.body.token }
    });

    const token = user.generateAuthToken();
    //console.log("Token:", token);
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

    await User.updateOne({ _id: req.user._id }, {
        $set: { token: req.body.token }
    });

    res.status(200).send(__.success('Token Updated.'));
};

const rideRequest = async (req, res) => {
    const error = __.validate(req.body, {
        partnerId: Joi.string().required(),
        customerCount: Joi.number().integer().required(),
        address: Joi.string().required(),
        pickupLat: Joi.number().precision(8).min(-90).max(90).required(),
        pickupLng: Joi.number().precision(8).min(-180).max(180).required()
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    const user = await User.findOne({ _id: req.body.userId }, 'phoneNumber token username');
    const partner = await Partner.findOne({ _id: req.body.partnerId }, 
        'token phoneNumber address geolocation');

    // process the pickup location
    var address = req.body.address;
    var i1 = address.lastIndexOf(',');
    var i2 = address.lastIndexOf(' ', i1 - 1);
    var i3 = address.lastIndexOf(',', i2 - 1);
    var i4 = address.lastIndexOf(',', i3 - 1);

    var zip = address.substring(i2 + 1, i1);
    var state = address.substring(i3 + 2, i2);
    var city = address.substring(i4 + 2, i3);
    var line = address.substring(0, i4);

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
            address: {
                line: line,
                state: state,
                city: city,
                zip: zip
            },
            lat: req.body.pickupLat,
            lng: req.body.pickupLng
        },
        dropLocation: {
            address: partner.address,
            lat: partner.geolocation.coordinates[1],
            lng: partner.geolocation.coordinates[0]
        },
        status: rideStatus.PARTNER_NOTIFIED,
        timing: {
            booked: new Date(),
        },
    };

    const newRide = new Ride(ride);
    await newRide.save();
    await User.updateOne({ _id: req.body.userId }, {
        $set: { currentRide: rideId },
        $push: { allRides: rideId }
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

    res.status(200).send(__.success(rideId));
};

const cancelRide = async (req, res) => {
    const error = __.validate(req.body, {
        rideId: Joi.string().required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    const ride = await Ride.findOneAndUpdate({ _id: req.body.rideId }, {
        $set: {
            status: '659',
            cancel: {
                value: true,
                by: 'user',
                time: new Date(),
            },
        }
    });

    await Driver.updateOne({ _id: ride.driver.id }, {
        $set: {
            'status.passenger': false,
            currentRide: null,
        }
    });

    await User.updateOne({ _id: req.body._id }, {
        $set: { currentRide: null, },
        $inc: { 'stats.cancelled': 1 }
    });

    __.sendNotification({
        data: { status: '659' },
        token: ride.driver.id
    });

    __.sendNotification({
        data: { status: '659' },
        token: ride.partner.id
    })

    res.status(200).send(__.success('Ride cancelled.'));
};

const rideHistory = async (req, res) => {
    const error = __.validate(req.body, {
        index: Joi.number().required(),
    });
    if (error) return res.status(400).send(__.error(error.message[0].details));

    const { allRides } = await User.findOne({ _id: req.body.userId }, 'allRides');

    const size = 15;
    const start = allRides.length - 1 - req.body.index * size;

    const rides = {};
    for (var i = start; i >= start - size; i--) {
        
    }
};

const label = async (req, res) => {
    const error = __.validate(req.body, {
        label: Joi.string().required(),
        address: Joi.string().required(),
        lat: Joi.number().precesion(8).min(-90).max(90).required(),
        lng: Joi.number().reqcision(8).min(-180).max(180).required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    const label = _.pick(req.body, ['label', 'address', 'lat', 'lng']);

    await User.updateOne({ _id: req.body.userId }, {
        $push: { favouritePickupLocations: label }
    });

    res.status(200).send(__.success('Label added.'));
};

const allLabel = async (req, res) => {
    const labels = await User.findOne({ _id: req.body.userId }, 'favouritePickupLocations');
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

    res.status(200).send(__.success('Label Deleated.'));
}

const getAllUser = async (req, res) => {
    const users = User.find({});
    res.status(200).send(users);
};

const isLoggedIn = async (req, res) => {
    const error = __.validate(req.body, {
        userToken: Joi.string().required()
    });
    if (error) res.status(400).send(__.error('Token not send.'));

    const userDetail = await User.findOne({ _id: req.body.userId }, 'login token');
    const response = userDetail.login && userDetail.token != req.body.userToken;

    res.status(200).send(__.success(response));
};

const isGreyListed = async (req, res) => {
    const result = await User.findOne({ _id: req.body.userId }, 'greylist');

    res.status(200).send(__.success(result));
};

router.post('/signup', signup);
router.post('/checkDeviceId', checkDeviceId);
router.post('/login', login);
router.post('/isLoggedIn', isLoggedIn);
router.post('/logout', auth, logout);
router.post('/token', auth, token);
router.post('/requestRide', auth, rideRequest);
router.post('/cancelRide', auth, cancelRide);
router.get('/isGreyListed', auth, isGreyListed);
router.post('/label', label);
router.post('/allLabel', allLabel);
router.post('/deletelabel', deleteLabel);

router.get('/aws-get-test', async (req, res) => {
    res.status(200).send('Hello from AWS (GET request)');
});

module.exports = router;
