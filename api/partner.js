const express = require('express');
const Joi = require('joi');
const bcrypt = require('bcrypt');
const _ = require('lodash');
const Partner = require('../schema/Partner');

const router = express.Router();

const signup = async (req, res) => {
    const schema = Joi.object().keys({
        name: Joi.string().required(),
        lat: Joi.number().precision(8).min(-90).max(90).required(),
        lng: Joi.number().precision(8).min(-180).max(180).required(),
        email: Joi.string().required().min(5).max(255).email(),
        password: Joi.string().required().min(5).max(255)
    });

    const { error } = Joi.validate(req.body, schema);
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
    const schema = Joi.object().keys({
        email: Joi.string().required().min(5).max(255).email(),
        password: Joi.string().required().min(5).max(255)
    });

    const { error } = Joi.validate(req.body, schema);
    if (error) return res.status(400).send(error.details[0].message);

    const partner = await Partner.findOne({ email: req.body.email });
    if (!partner) return res.status(400).find('Invalid email or password');

    const validPassword = await bcrypt.compare(req.body.password, partner.password);
    if (!validPassword) return res.status(400).send('Invalid email or password');

    const token = partner.generateAuthToken();
    res.header('x-gini-agent', 'partner')
       .header('x-auth-token', token)
       .status(200)
       .send('Logged in.');
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
    const schema = Joi.object().keys({
        lat: Joi.number().precision(8).required(),
        lng: Joi.number().precision(8).required()
    });

    const { error } = Joi.validate(req.body, schema);
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

const isPartnerOpen = async (req, res) => {
    const partner = findOne({
        _id: req.body.partnerId,
    }, 'open');

    res.status(200).send(partner.open);
};

router.post('/signup', signup);
router.post('/login', login);
router.get('/getAllPartners', getAllPartners);
router.post('/findNearestPartner', nearestPartner);
router.delete('/deleteAllPartners', deleteAllPartners);
router.post('/isPartnerOpen', isPartnerOpen);

module.exports = router;