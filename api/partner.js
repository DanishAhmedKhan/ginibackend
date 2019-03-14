const express = require('express');
const Joi = require('joi');
const bcrypt = require('bcrypt');
const _ = require('lodash');
const ip = require('ip');
const __ = require('./apiUtil');
const axios = require('axios');
const admin = require('firebase-admin');
const Partner = require('../schema/Partner');
const Ride = require('../schema/Ride');
const Driver = require('../schema/Driver');
const User = require('../schema/User');
const rideStatus = require('./rideStatus');
const Gini = require('../schema/Gini');
const auth = require('../middlewares/auth');

const router = express.Router();

const signup = async (req, res) => {
    const error = __.validate(req.body, {
        name: Joi.string().required(),
        lat: Joi.number().precision(8).min(-90).max(90).required(),
        lng: Joi.number().precision(8).min(-180).max(180).required(),
        email: Joi.string().required().min(5).max(255).email(),
        password: Joi.string().required().min(5).max(255)
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    let partner = await Partner.findOne({ email: req.body.email });
    if (partner) return res.status(400).send(__.error('Email already registered'));

    partner = _.pick(req.body, ['name', 'email', 'password', 'address']);
    partner.geolocation = {
        type: 'Point',
        coordinates: [req.body.lng, req.body.lat]
    }

    const salt = await bcrypt.genSalt(10);
    partner.password = await bcrypt.hash(partner.password, salt);

    const newPartner = new Partner(partner);
    await newPartner.save();
    const token = newPartner.generateAuthToken();

    res.header('x-gini-agent', 'partner')
       .header('x-partner-auth-token', token)
       .status(200)
       .send(__.success('Partner signed up.'));
};

const login = async (req, res) => {
    const error = __.validate(req.body, {
        email: Joi.string().required().min(5).max(255).email(),
        password: Joi.string().required().min(5).max(255),
        token: Joi.string().required()
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    const partner = await Partner.findOne({ email: req.body.email });
    if (!partner) return res.status(400).send(__.error('Invalid email or password'));

    const validPassword = await bcrypt.compare(req.body.password, partner.password);
    if (!validPassword) return res.status(400).send(__.error('Invalid email or password'));

    await Partner.updateOne({ _id: partner._id }, {
        $set: { 
            token: req.body.token,
            shifts: {
                time: new Date(),
                method: 'login',
            },
            online: true,
            open: true,
        } 
    });

    const token = partner.generateAuthToken();
    res.header('x-partner-auth-token', token)
       .status(200)
       .send(__.success('Loged in.'));
};

const logout = async (req, res) => {
    await Partner.updateOne({ _id: req.body.partnerId }, {
        $set: {
            online: false,
            open: false,
            shifts: {
                time: new Date(),
                method: 'logout',
            }
        }
    });

    res.status(200).send(__.success('Logged out'));

    greyList(req.body.partnerId);
}

const getAllPartners = async (req, res) => {
    const partners = await Partner.find({});
    //console.log(partners);
    res.status(200).send(__.success(partners));
};

const deleteAllPartners = async (req, res) => {
    await Partner.remove({});

    res.status(200).send('Deleted All Partners');
};

const nearestPartner = async (req, res) => {
    //console.log("(" + req.body.lat + ", " + req.body.lng + ")");
    const error = __.validate(req.body, {
        lat: Joi.number().precision(8).min(-90).max(90).required(),
        lng: Joi.number().precision(8).min(-180).max(180).required()
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    const maxDistance = config.get('partnerSearchMaxDistance');

    const partners = await Partner.find({
        geolocation: {
            $nearSphere: {
                $geometry: {
                    type: 'Point',
                    coordinates: [ req.body.lng, req.body.lat ]
                },
                $maxDistance: maxDistance //in meters
            }
        }
    }, '_id name address rating');

    res.status(200).send(__.success(partners));
};

const partnerDetail = async (req, res) => {
    const error = __.validate(req.body, {
        partnerId: Joi.string().required()
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    const partnerDetails = await Partner.findOne({ _id: req.body.partnerId },
        '_id name type token email address open phoneNumber rating url'    
    );

    res.status(200).send(__.success(partnerDetails));
};

const partner = async (req, res) => {
    const partner = await Partner.findOne({ _id: req.body.partnerId });
    res.status(200).send(__.success(partner));
};

const isPartnerOpen = async (req, res) => {
    const { open } = findOne({_id: req.body.partnerId,}, 'open');
    res.status(200).send(__.success(open));
};

const partnerResponse = async (req, res) => {
    const error = __.validate(req.body, {
        response: Joi.number().integer().required(),
        rideId: Joi.string().required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    const rideId = req.body.rideId;
    const response = req.body.response;
    const ride = await Ride.findOneAndUpdate({ _id: rideId }, { 
        $set: { status: response } 
    });

    const  { dispatch }  = await Gini.findOne({}, 'dispatch');

    if (response == rideStatus.PARTNER_CONFIRMED) {
        try {
            await Partner.updateOne({ _id: req.body.partnerId }, {
                $push: { currentRides: { rideId: rideId } }
            });

            if (dispatch == 'auto' || dispatch == 'semi-auto') {
                const bookUserDriverUrl = 'http://' + '13.233.140.191' + ':4000/api/driver/bookUserDriver';
                await axios.post(bookUserDriverUrl, {
                    ride: ride
                });
            } 
        } catch (err) {
            console.log(err);
            return res.status(err.response.status).send(err.response.data);
        }

    } else if (response == rideStatus.PARTNER_DECLINED) {
        await Partner.updateOne({ _id: req.body.partnerId }, {
            $pull: { currentRides: { rideId: rideId } }
        });
        await User.updateOne({ _id: ride.user.id }, {
            $set: { currentRide: null }
        });

        __.sendNotification({
            data: {
                status: '123',
            },
            token: ride.user.token
        });
    }

    res.status(200).send(__.success('Processed data'));
};

const online = async (req, res) => {
    const error = __.validate(req.body, {
        online: Joi.boolean().required()
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    var method;
    if (req.body.online == true) method = 'online';
    else method = 'offline';

    await Partner.updateOne({ _id: req.body.partnerId }, {
        $set: {
            onlien: req.body.online,
            shifts: {
                time: new Date(),
                method: method,
            }
        }
    });
    
    res.status(200).send(__.success('Online updated'));
};

const token = async (req, res) => {
    const error = __.validate(req.body, {
        token: Joi.string().required()
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    await Partner.updateOne({ _id: req.body.partnerId }, {
        $set: { token: req.body.token }
    });

    res.status(200).send(__.success('Token updated.'));
};

const scanCode = async (req, res) => {
    const error = __.validate(req.body, {
        code: Joi.string().required()
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    const code = req.body.code;

    const partner = await Partner.findOneAndUpdate({ _id: req.body.partnerId }, {
        $pull: { currentRides: { code: code } }
    });

    var array = partner.currentRides;
    var currentRide = array.filter(x => x.code == req.body.code);
    //console.log(currentRide);
    
    if (currentRide.length != 0) {
        var rideId = currentRide[0].rideId;
        //console.log('RIDE ID  = ', rideId);

        await Ride.updateOne({ _id: rideId }, {
            $set: { 
                status: rideStatus.SCAN_CONFIRMED,
                timing: { confirmed: new Date() },
            }
        });

        const ride = await Ride.findOne({ _id: rideId });

        __.sendNotification({
            data: {
                status: '829'
            }, 
            token: ride.user.token
        });

        res.status(200).send(__.success(rideId));
    } else {
        res.status(200).send(__.success(''));
    }
};

// function
const greyList = async (partnerId) => {
    const { currentRides } = await Partner.findOne({ _id: partnerId }, 'currentRides');
    console.log("CURRENT RIDES = ", currentRides);

    if (currentRides == null || currentRides == []) return;

    for (var i = 0; i < currentRides.length; i++) {
        const { user } = await Ride.findOne({ _id: currentRides[i].rideId }, 'user');

        await User.updateOne({ _id: user.id }, {
            $inc: { 'greylist.misuseCount': 1 },
        });

        __.sendNotification({
            data: {
                status: '997'
            },
            token: user.token
        });
    }
};

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', auth, logout);
router.post('/getAllPartners', getAllPartners);
router.post('/findNearestPartner', auth, nearestPartner);
router.post('/partnerList', nearestPartner);
router.delete('/deleteAllPartners', deleteAllPartners);
router.post('/isPartnerOpen', isPartnerOpen);
router.post('/partner', partner);
router.post('/response', auth, partnerResponse);
router.post('/token', token);
router.post('/online', auth, online);
router.post('/partnerDetail', auth, partnerDetail);
router.post('/scanCode', auth, scanCode);
//router.post('/greyList', greyList);

router.post('/initPartnerData', async (req, res) => {

    var partner1 = new Partner({
        geolocation: {
            coordinates: [ 88.3457046, 22.55886 ],
            type: 'Point'
        },
        name: 'Dominos',
        email: 'dominos@gmail.com',
        password: '$2b$10$Bb2RNPtizVmT6/9tl4mVjOLpUo8FevAc0bFDRNnt3ZqLsc0rS387O',
        token: '',
        address: {
            line: 'New Market, Janbazar , Taltala',
            state: 'West Bengal',
            city: 'Kolkata',
            zip: '700018'
        },
        rating: {
            gini: 4.5,
        },
        phoneNumber: '',
        url: {
            menu: 'www.dominos.in/menu',
            website: 'www.dominos.com',
        },
        open: false,
    });
    await partner1.save();

    var partner2 = new Partner({
        geolocation: {
            coordinates: [ 88.35857, 22.558925 ],
            type: 'Point'
        },
        name: 'Pizza Hut',
        email: 'pizzahut@gmail.com',
        password: '$2b$10$5EeWo3XLjvC4pMaQITqYYOVu3K5W50imOpRftOHlSsWbLQTZU/YVe',
        token: '',
        address: {
            line: 'Salt Lake',
            state: 'West Bengal',
            city: 'Kolkata',
            zip: '700016'
        },
        rating: {
            gini: 4.3,
        },
        phoneNumber: '',
        url: {
            menu: 'www.pizzahut.in/menu',
            website: 'www.pizzahut.com',
        },
        open: false,
    });
    await partner2.save();

    res.status(200).send(__.success('Added the partner data to databse.'));
});

module.exports = router;