const express = require('express');
const Joi = require('joi');
const _ = require('lodash');
const __ = require('./apiUtil');
const admin = require('firebase-admin');
const axios = require('axios');
const randomize = require('randomatic');
const Driver = require('../schema/Driver');
const User = require('../schema/User');
const Partner = require('../schema/Partner');
const rideStatus = require('./rideStatus');
const Gini = require('../schema/Gini');

const router = express.Router();

const signup = async (req, res) => {
    const schema = Joi.object().keys({
        name: Joi.string().required().min(5).max(255),
        email: Joi.string().required().min(5).max(255).email(),
        password: Joi.string().required().min(5).max(255),
        phoneNumber: Joi.string().required()
    });

    const { error } = Joi.validate(schema, req.body);
    if (error) return res.status(400).send(error.details[0].message);

    let driver = await Driver.findPOne({ email: req.body.email });
    if (driver) return res.status(400).send('Driver already registered');

    driver = _.pick(req.body, ['name', 'email', 'password', 'phoneNumber']);

    const salt = await bcrypt.genSalt(10);
    driver.password = await bcrypt.hash(driver.password, salt);

    const newDriver = new Driver(driver);
    await newDriver.save();
    const token = driver.generateAuthToken();

    res.header('x-gini-agent', 'driver')
       .header('x-auth-token', token)
       .status(200)
       .send('Signed up.');
};

const login = async (req, res) => {
    const schema = Joi.object().keys({
        email: Joi.string().required().min(5).max(255).email(),
        password: Jopi.string().required().min(5).max(255)
    });

    const { error } = Joi.validate(schema, req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const driver = await Driver({ email: req.body.email });
    if (driver) return res.status(400).send('Invalid email or password');

    const validPassword = await bcrypt.compare(driver.password, req.body.password);
    if (!validPassword) return res.status(400).send('Invalid email or password');

    const token = driver.generateAuthToken();
    res.header('x-gini-agent', 'driver')
       .header('x-auth-token', token)
       .status(200)
       .send('Logged in.');
};

const online = async (req, res) => {
    const error = __.validate(req.body, {
        online: Joi.boolean().required()
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    await Driver.update({ _id: req.body.driverId }, { $set: { online: req.body.online } });
    res.status(200).send(__.success('Online value set'));
};

const logout = async (req, res) => {
    
};

const location = async (req, res) => {
    const error = __.validate(req.body, {
        lat: Joi.number().precision(8).required(),
        lng: Joi.number().precision(8).required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    await Driver.update({ _id: driverId }, { 
        $set: { 'geolocation.coordinates': [ req.body.lng, req.body.lat ] }
    });

    res.status(200).send(_.seccess('Location updated.'));
};

const nearestDriver = async (req, res) => {
    const error = __.validate(req.body, {
        lat: Joi.number().precision(8).min(-90).max(90).required(),
        lng: Joi.number().precision(8).min(-180).max(180).required()
    });
    if (error) res.status(400).send(__.error(error.details[0].message));

    const nearestDriver = await Driver.findOne({
        geolocation: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: [ req.body.lng, req.body.lat ]
                }
            },
            $maxDistance: 10000 //in meters
        },
        online: true,
        passenger: false,
        // rating: ...
    }, '_id token phoneNumber');

    res.status(200).send(__.success(nearestDriver));
};

const bookUserDriver = async (req, res) => {
    const ride = req.body.ride;

    let nearestDriver;
    try {
        const apiResponse = await axios.post('htttp://localhost:4000/api/driver/nearestDriver', {
            lat: ride.pickupLocation.lat,
            lng: ride.pickupLocation.lng
        }); 
        nearestDriver = apiResponse.data;
    } catch (err) {
        return res.status(err.response.status).send(err.response.data);
    }

    const { dispatch } = await Gini.findOne({}, 'dispatch');

    if (nearestDriver == null && dispatch == 'auto') {
        await User.updateOne({ _id: ride.user.id }, {
            $set: { currentRide: null }
        });
        await Partner.updateOne({ _id: ride.partner.id }, {
            $pull: { currentRides: { rideId: ride._id } }
        });

        __.sendNotification({
            data: {
                status: NO_DRIVER_FOUND
            },
            token: ride.user.token
        });
        __.sendNotification({
            data: {
                status: NO_DRIVER_FOUND,
                rideId: rideId
            },
            token: ride.partner.token
        });

        return res.status(404).send(__.error('Driver not found.'));
    }

    __.sendNotification({
        data: {
            status: riseStatus.DRIVER_NOTIFIED,
            lat: ride.pickupLocation.lat,
            lng: ride.pickupLocation.lng,
        },
        token: nearestDriver.token
    });

    await Driver.updateOne({ _id: nearestDriver._id }, {
        $push: { allRides: ride._id }
    });

    res.status(200).send(__.success('Request processed'));
};

const driverResponse = async (req, res) => {
    const error = __.validate(req.body, {
        response: Joi.number().integer().required(),
        drivername: Joi.string().required(),
        driverToken: Joi.string().required(),
        driverPhoneNumber: Joi.string().required(),
        rideId: Joi.string().required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));
    const response = req.body.response;

    const ride = await rideRequest.findOneAndUpdate({ _id: req.body.rideId }, {
        $set: { 
            status: response,
            'driver.number': req.body.driverPhoneNumber
        } 
    });

    if (response == rideStatus.DRIVER_ACCEPTED) {
        await Driver.updateOne({ _id: driverId }, { 
            $set: {
                passenger: true,
                currentRide: req.body.rideId,
            }
        });
        await Ride.updateOne({ _id: req.body.rideId }, {
            $set: {
                driver: {
                    id: req.body.driverId,
                    token: req.body.driverToken,
                    number: req.body.driverPhoneNumber
                }
            }
        });
        
        __.sendNotification({
            data: {
                status: DRIVER_BOOKED,
                rideId: rideId
            },
            token: ride.partner.token
        });

        __.sendNotification({
            data: {
                status: BOOKING_CONFIRMED,
                name: req.body.driverName,
                phoneNumber: req.body.driverPhoneNumber,
            },
            token: ride.user.token
        });

        return res.status(200).send(__.success(ride.user.number));

    } else if (response == DRIVER_DECLINED) {
        await Driver.updateOne({ _id: driverId }, { 
            $inc: { 'stats.declined': 1 }
        });

        const { dispatch } = await Gini.findOne({}, 'dispatch');

        try {
            if (dispatch == 'auto' || dispatch == 'semi-auto') {
                await axios.post('http://localhost:4000/api/driver/bookUserDriver', {
                    ride: ride
                });
            }
        } catch (err) {
            return res.status(err.response.status).send(err.response.data);
        }
    }

    res.status(200).send(__.success('Updated.'));
 };

 const pickup = async (req, res) => {
    const error = __.validate(req.body, {
        rideId: Joi.string().required(),
        customerCount: Joi.number().integer().required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    const ride = await Ride.findOneAndUpdate({ _id: rideId }, { 
        $set: {
            customerCount: { driver: req.body.customerCount },
            status: rideStatus.DRIVER_PICKUP
        }
    });

    const code = randomize('A', 6);
    const partnerId = ride.partner.id;
    await Partner.updateOne({ _id: partnerId, 'currentRides.rideId': req.body.rideId }, {
        $push: { 'currentRides.$.code': code }
    });
    await Ride.updateOne({ _id: rideId }, {
        $set: { code: code }
    });

    const message = {
        data: {
            code: code
        },
        token: ride.user.token
    }

    admin.messaging().send(message)
        .then(response => {
            console.log(response);
        }).catch(error => {
            console.log(error);
        });

    res.status(200).send(__.success('Updated.'));
 };

 const drop = async (req, res) => {
    const error = __.validate(req.body, {
        rideId: Joi.string().required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    const ride = await Ride.findOneAndUpdate({ _id: req.body.rideId }, {
        $set: { status: rideStatus.DRIVER_DROP }
    });

    await Driver.updateOne({ _id: ride.driver.id }, {
        $set: {
            passenger: false,
            currentRide: null
        }
    });

    await User.updateOne({ _id: ride.user.id }, {
        $set: { currentRide: null }
    });

    const message = {
        data: {

        },
        token: ride.partner.token
    };

    admin.messaging().send(message)
        .then(response => {
            console.log(response);
        }).catch(error => {
            console.log(error);
        });

    res.status(200).send(__.success('Updated.'));
 }

 const token = async (req, res) => {
    const error = __.validate(req.body, {
        token: Joi.string().required()
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    await Driver.update({ _id: driverId }, {
        $set: { token: req.body.token }
    });

    res.status(200).send(__.success('Token updated.'));
 }

router.post('/signup', signup);
router.post('/login', login);
router.post('/nearestDriver', nearestDriver);
router.post('/bookUserDriver', bookUserDriver);
router.post('/location', location);
router.post('/response', driverResponse);
router.post('/pickup', pickup);
router.post('/token', token);
rouyer.post('/drop', drop);

module.exports = router;