const express = require('express');
const bcrypt = require('bcrypt');
const admin = require('firebase-admin');
const _ = require('lodash');
const __ = require('./apiUtil');
const Joi = require('joi');
const User = require('../schema/User');
const Ride = require('../schema/Ride');
const auth = require('../middlewares/auth');

const router = express.Router();

const signup = async (req, res) => {
    console.log(req.header('x-gini-agent'));
    console.log(req.header('x-user-auth-token'));


    const error = __.validate(req.body, {
        email: Joi.string().required().min(5).max(255).email(),
        password: Joi.string().required().min(5).max(255),
        phoneNumber: Joi.string().required()
    });
    if (error) return res.status(400).send(error.details[0].message);

    // const schema = Joi.object().keys({
    //     email: Joi.string().required().min(5).max(255).email(),
    //     password: Joi.string().required().min(5).max(255),
    //     phoneNumber: Joi.string().required()
    // });

    // const { error } = Joi.validate(req.body, schema);
    // if (error) return res.status(400).send(error.detacmdils[0].message);

    let user = await User.findOne({ email: req.body.email });
    console.log("User searched for email  ::  ", user);
    if (user) return res.status(400).send('User already registered');

    user = _.pick(req.body, ['email', 'password', 'phoneNumber']);

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);

    const newUser = new User(user);
    await newUser.save();
    const token = newUser.generateAuthToken();

    res.header('x-user-auth-token', token)
       .status(200)
       .send(__.success('Signed up.'));
};

const login = async (req, res) => {
    // const schema = Joi.object().keys({
    //     email: Joi.string().required().min(5).max(255).email(),
    //     password: Joi.string().required().min(5).max(255)
    // });

    // const { error } = Joi.validate(req.body, schema);
    const error = __.validate(req.body, {
        email: Joi.string().required().min(5).max(255).email(),
        password: Joi.string().required().min(5).max(255),
    });
    if (error) return res.status(400).send(error.details[0].message);

    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(400).send('Invalid email or password.');

    const validPassword = bcrypt(req.body.password, user.password);
    if (!validPassword) return res.status(400).send('Invalid email or password');

    const token = user.generateAuthToken();
    res.header('x-user-auth-token', token)
       .status(200)
       .send(__.success('Loged in.'));
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
router.post('/requestRide', auth, rideRequest);


router.post('/testNotification', async (req, res) => {
    var registrationToken = req.body.token;

    // See documentation on defining a message payload.
    var message = {
        data: {
            title: "Message",
            msg: "Hey Cristiano!"
        },
        token: registrationToken
    };

    res.status(200).send('CR7 is the best');

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