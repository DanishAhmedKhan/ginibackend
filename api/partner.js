const express = require('express');
const Joi = require('joi');
const bcrypt = require('bcrypt');
const _ = require('lodash');
const __ = require('./apiUtil');
const axios = require('axios');
const admin = require('firebase-admin');
const Partner = require('../schema/Partner');

const router = express.Router();

const signup = async (req, res) => {
    const error = __.validate(req.body, {
        name: Joi.string().required(),
        lat: Joi.number().precision(8).min(-90).max(90).required(),
        lng: Joi.number().precision(8).min(-180).max(180).required(),
        email: Joi.string().required().min(5).max(255).email(),
        password: Joi.string().required().min(5).max(255)
    });
    if (error) return res.status(400).send(error.details[0].message);

    let partner = await Partner.findOne({ email: req.body.email });
    if (partner) return res.status(400).send('Email already registered');

    partner = _.pick(req.body, ['name', 'email', 'password', 'address']);
    partner.geolocation = {
        type: 'Point',
        coordinates: [req.body.lng, req.body.lat]
    }

    console.log(partner);

    const salt = await bcrypt.genSalt(10);
    partner.password = await bcrypt.hash(partner.password, salt);

    const newPartner = new Partner(partner);
    await newPartner.save();
    const token = newPartner.generateAuthToken();

    res.header('x-gini-agent', 'partner')
       .header('x-partner-auth-token', token)
       .status(200)
       .send('Partner signed up.');
};

const login = async (req, res) => {
    const error = __.validate(req.body, {
        email: Joi.string().required().min(5).max(255).email(),
        password: Joi.string().required().min(5).max(255),
        token: Joi.string().required()
    });
    if (error) return res.status(400).send(error.details[0].message);

    const partner = await Partner.findOne({ email: req.body.email });
    if (!partner) return res.status(400).find('Invalid email or password');

    const validPassword = await bcrypt.compare(req.body.password, partner.password);
    if (!validPassword) return res.status(400).send('Invalid email or password');

    Partner.update({ _id: req.body.pertnerId }, { $set: { token: req.body.token } });

    const token = partner.generateAuthToken();
    res.header('x-partner-auth-token', token)
       .status(200)
       .send(__.success('Loged in.'));
};

const getAllPartners = async (req, res) => {
    const partners = await Partner.find({});

    res.status(200).send(partners);
};

const deleteAllPartners = async (req, res) => {
    await Partner.remove({});

    res.status(200).send('Deleted All Partners');
};

const nearestPartner = async (req, res) => {
    const error = __.validate(req,body, {
        lat: Joi.number().precision(8).required(),
        lng: Joi.number().precision(8).required()
    });
    if (error) return res.status(400).send(error.details[0].message);

    const partners = await Partner.find({
        geolocation: {
            $nearSphere: {
                $geometry: {
                    type: 'Point',
                    coordinates: [ req.body.lng, req.body.lat ]
                },
                $maxDistance: 10000 //in meters
            }
        }
    });

    console.log('The Partners are :::::: ' + partners);

    res.status(200).send(partners);
};

const partner = async (req, res) => {
    const partner = await Partner.findOne({ _id: partnerId });
    res.status(200).send(partner);
}

const isPartnerOpen = async (req, res) => {
    const partner = findOne({
        _id: req.body.agent._id,
    }, 'open');

    res.status(200).send(__.success(partner.open));
};

const partnerResponse = async (req, res) => {
    const error = __.validate(req.body, {
        response: Joi.number().integer().required(),
        rideId: Joi.string().required(),
    });
    if (error) return res.status(40).send(__.error(error.details[0].message));

    const response = req.body.status;
    const ride = await Ride.findOneAndUpdate({ _id: rideId }, 
        { $set: { status: status } }, { new: true });
    const pickupLocation = ride.pickupLocation;

    if (response == PARTNER_CONFIRMED) {
        const response = await axios.post('http://localhost:4000/api/driver/requestNearestDriver', {
            lat: pickupLocation.lat,
            lng: pickupLocation.Lng,
        });
        if (response.status == 'error')
            return res.status(412).send(response.msg);

    } else if (response == PARTNER_DECLINED) {
        const userToken = ride.user.token;
        const message = {
            date: {
                status: PARTNER_DECLINED,
            },
            token: userToken
        }

        admin.messaging().send(message)
            .then(response => {
                console.log(response);
            }).catch(error => {
                console.log(error);
            });
    }

    res.status(200).send(__.success('processed data'));
};

router.post('/signup', signup);
router.post('/login', login);
router.get('/getAllPartners', getAllPartners);
router.post('/findNearestPartner', nearestPartner);
router.post('/partnerList', nearestPartner);
router.delete('/deleteAllPartners', deleteAllPartners);
router.post('/isPartnerOpen', isPartnerOpen);
router.post('/partner', partner);

module.exports = router;