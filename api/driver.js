const express = require('express');
const Joi = require('joi');
const _ = require('lodash');
const __ = require('./apiUtil');
const admin = require('firebase-admin');
const axios = require('axios');
const Driver = require('../schema/Driver');

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

    await Driver.update({ _id: driverId }, { $set: {
        'geolocation.coordinates': [ req.body.lat, req.body.lng ]
    }});

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
    }, '_id token');

    res.status(200).send(__.success(nearestDriver));
};

const requestNearestDriver = async (req, res) => {
    const response = axios.post('htttp://localhost:4000/api/driver/nearestDriver', {
        lat: req.body.lat,
        lng: req.body.lng
    });
    if (response.status == 'error') 
        return res.status(412).send(__.error('Unable to precess request.'));
    const nearestDriver = response.data;

    const message = {
        data: {
            status: DRIVER_BOOK,
            lat:req.body.lat,
            lng:req.body.lng,
        },
        token: nearestDriver.token
    };

    admin.messaging().send(message)
        .then(response => {
            console.log(response);
        }).catch(error => {
            console.log(error);
        });

    res.status(200).send(__.success('Request processed'));
};

const rideResponse = async (req, res) => {
    const error = __.validate(req.body, {
        response: Joi.number().integer().required(),
        drivername: Joi.string().required(),
        driverPhoneNumber: Joi.string().required(),
        rideId: Joi.string().required(),
    });
    if (error) return res.status(400).send(__.error.details[0].message);
    const response = req.body.response;

    const ride = await rideRequest.update({ _id: req.body.rideId },
        { $set: { status: req.body.status } }, { new: true });

    if (response == DRIVER_ACCEPTED) {
        await Driver.update({ _id: driverId }, { $set: {
            passenger: true,
            currentRide: req.body.rideId,
        }});

        const message = {
            data: {
                status: BOOKING_CONFIRMED,
                name: req.body.driverName,
                phoneNumber: req.body.driverPhoneNumber,
            },
            token: ride.user.token
        };

        admin.messaging().send(message)
            .then(response => {
                console.log(response);
            }).catch(error => {
                console.log(error);
            });
    } else if (response == DRIVER_DECLINED) {
        await Driver.update({ _id: driverId }, { $inc: {
            'stats.declined': 1,
        }});

        const response = await axios.post('http://localhost:4000/api/driver/requestNearestDriver', {
            lat: ride.pickupLocation.lat,
            lng: ride.pickupLocation.lng
        });
        if (response.status == 'error')
            return res.status(412).send(response.msg);
    }

    res.status(200).send('');
 };

router.post('/signup', signup);
router.post('/login', login);
router.post('/nearestDriver', nearestDriver);
router.post('/requestNearestDriver', requestNearestDriver);

module.exports = router;