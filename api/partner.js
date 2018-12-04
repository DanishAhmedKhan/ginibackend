const express = require('express');
const Joi = require('joi');
const bcrypt = require('bcrypt');
const _ = require('lodash');
const __ = require('./apiUtil');
const axios = require('axios');
const admin = require('firebase-admin');
const Partner = require('../schema/Partner');
const rideStatus = require('./rideStatus');
const Gini = require('../schema/Gini');

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
    if (error) return res.status(400).send(__.error(error.details[0].message));

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

    res.status(200).send(__.success(partners));
};

const partnerDetail = async (req, res) => {
    const partnerDetails = await Partner.find({ _id: partnerId },
        '_id name type token email address open'    
    );

    res.status(200).send(__.success(partnerDetails));
}

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
    if (error) return res.status(400).send(__.error(error.details[0].message));

    const rideId = req.body.rideId;
    const response = req.body.response;
    const ride = await Ride.findOneAndUpdate({ _id: rideId },
        { $set: { status: response } }, { new: true });

    const { dispatch } = await Gini.findOne({}, 'dispatch');

    if (response == rideStatus.PARTNER_CONFIRMED) {
        try {
            await Partner.updateOne({ _id: partnerId }, {
                $push: { currentRides: { rideId: rideId } }
            });

            if (dispatch == 'auto' || dispatch == 'semi-auto') {
                await axios.post('http://localhost:4000/api/driver/bookUserDriver', {
                    ride: ride
                });
            } 
        } catch (err) {
            return res.send(err.response.status).send(err.response.data);
        }

    } else if (response == rideStatus.PARTNER_DECLINED) {
        await Partner.updateOne({ _id: partnerId }, {
            $pull: { currentRides: { rideId: rideId } }
        });
        await User.updateOne({ _id: ride.user.id }, {
            $set: { currentRide: null }
        });

        __.sendNotification({
            date: {
                status: PARTNER_DECLINED,
            },
            token: ride.user.token
        });
    }

    res.status(200).send(__.success('Processed data'));
};

const token = async (req, res) => {
    const error = __.validate(req.body, {
        token: Joi.string().required()
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    await Partner.update({ _id: partnerId }, {
        $set: { token: req.body.token }
    });

    res.status(200).send(__.success('Token updated.'));
 }

const scanCode = async (req, res) => {
    const error = __.validate(req.body, {
        code: Joi.string().required()
    });
    if (error) return res.status(200).send(__.error(error.details[0].message));

    const code = req.body.code;
    const result = await Partner.updateOne({ _id: partnerId }, {
        $pull: { currentRides: { code: code } }
    });

    const modified = result.nModified == 1;
    if (modified) {
        await Ride.updateOne({ _id: id }, {
            $set: { status: rideStatus.SCAN_CONFIRMED }
        });
    }

    res.status(200).send(__.success(modified));
 }

router.post('/signup', signup);
router.post('/login', login);
router.get('/getAllPartners', getAllPartners);
router.post('/findNearestPartner', nearestPartner);
router.post('/partnerList', nearestPartner);
router.delete('/deleteAllPartners', deleteAllPartners);
router.post('/isPartnerOpen', isPartnerOpen);
router.post('/partner', partner);
router.post('/response', partnerResponse);
router.post('/token', token);
router.post('/partnerDetail', partnerDetail);

module.exports = router;