const express = require('express');
const Joi = require('joi');
const _ = require('lodash');
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

    const driver = await Driver.findPOne({ email: req.body.email });
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

const logout = async (req, res) => {

};

const upateLocation = async (req, res) => {

};

const nearestDriver = async (req, res) => {
    const schema = Joi.object.keys({
        lat: Joi.number().precision(8).min(-90).max(90).required(),
        lng: Joi.number().precision(8).min(-180).max(180).required()
    });

    const { error } = Joi.validate(req.body, schema);
    if (error) res.status(400).send(error.details[0].message);

    const driver = await Driver.findOne({
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
        passenger: false
        // rating: ...
    });

    res.status(200).send(driver);
};

const rideRequest = async (req, res) => {

};

router.post('/signup', signup);
router.post('/login', login);
router.post('/nearestDriver', nearestDriver);

module.exports = router;