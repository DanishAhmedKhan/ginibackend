const express = require('express');
const bcrypt = require('bcrypt');
const config = require('config');
const _ = require('lodash');
const Joi = require('joi');
const User = require('../schema/User');
const Ride = require('../schema/Ride');

const router = express.Router();

const signup = async (req, res) => {
    const schema = Joi.object().keys({
        email: Joi.string().required().min(5).max(255).email(),
        password: Joi.string().required().min(5).max(255),
        phoneNumber: Joi.string().required()
    });

    const { error } = Joi.validate(req.body, schema);
    if (error) return res.status(400).send(error.details[0].message);

    const user = await User.find({ email: req.body.email });
    if (user.length === 0) return res.status(400).send('User already registered');

    user = _.pick(req.body, ['email', 'password', 'phoneNumber']);

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);

    const newUser = new User(user);
    await newUser.save();
    const token = user.generateAuthToken();

    res.header('x-gini-agent', 'user')
       .header('x-user-auth-token', token)
       .status(200)
       .send({status: 'success', msg: 'Signed up.'});
};

const login = async (req, res) => {
    const schema = Joi.object().keys({
        email: Joi.string().required().min(5).max(255).email(),
        password: Joi.string().required().min(5).max(255)
    });

    const { error } = Joi.validate(req.body, schema);
    if (error) return res.status(400).send(error.details[0].message);

    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(400).send('Invalid email or password.');

    const validPassword = bcrypt(req.body.password, user.password);
    if (!validPassword) return res.status(400).send('Invalid email or password');

    const token = user.generateAuthToken();
    res.header('x-gini-agent', 'user')
       .header('x-user-auth-token', token)
       .status(200)
       .send('');
};

const logout = async (req, res) => {

};

const addProfile = async (req, res) => {

};

const rideRequest = async (req, res) => {
    const schema = Joi.object().keys({

    });

    const { error } = Joi.validate(req.body, schema);
    if (error) res.status(400).send(error.details[0].message);

    const ride = {
        bookedBy: req.body.userId,
        customers: req.body.customers,
        customerCount: req.body.customerCount,
        partner: req.body.partnerId,
        'timing.booked': new Date()
    };

    const newRide = new Ride(ride);
    await newRide.save();


    const isPartnerOpen = await axios.post('http://localhost:4000/api/partner/isPartnerOpen');
    if (isPartnerOpen) {
        
        
    } else {
        // send notification to 
    }
};

const getAllUser = async (req, res) => {
    const users = User.find({});
    res.status(200).send(users);
};

router.post('/test', async (req, res) => {
    console.log('Testign route');
    res.status(200).send('CR7');
});
router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);


router.post('/testNotification', async (req, res) => {
    var registrationToken = req.body.token;

    // See documentation on defining a message payload.
    var message = {
    data: {
        score: '850',
        time: '2:45'
    },
    token: registrationToken
    };

    // Send a message to the device corresponding to the provided
    // registration token.
    admin.messaging().send(message)
    .then((response) => {
        // Response is a message ID string.
        console.log('Successfully sent message:', response);
    })
    .catch((error) => {
        console.log('Error sending message:', error);
    });
}); 


module.exports = router;