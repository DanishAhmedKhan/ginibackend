const express = require('express');
const Joi = require('joi');
const _ = require('lodash');
const __ = require('./apiUtil');
const mongoose = require('mongoose');
const axios = require('axios');
const config = require('config');
const ip = require('ip');
const bcrypt = require('bcrypt');
const randomize = require('randomatic');
const Driver = require('../schema/Driver');
const Ride = require('../schema/Ride');
const Partner = require('../schema/Partner');
const User = require('../schema/User');
const Car = require('../schema/Car');
const rideStatus = require('./rideStatus');
const Gini = require('../schema/Gini');
const auth = require('../middlewares/auth');

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

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
    const error = __.validate(req.body, {
        email: Joi.string().required().min(5).max(255).email(),
        password: Joi.string().required().min(5).max(255),
        token: Joi.string().required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    const driver = await Driver.findOne({ email: req.body.email });
    if (!driver) return res.status(400).send('Invalid email or password');

    const validPassword = await bcrypt.compare(req.body.password, driver.password);
    if (!validPassword) return res.status(400).send('Invalid email or password');

    await Driver.updateOne({ _id: driver._id }, { 
        $set: { 
            token: req.body.token,
            'status.online': true,
            shifts: {
                time: new Date(),
                method: 'login'
            }
        } 
    });

    const token = driver.generateAuthToken();
    res.header('x-driver-auth-token', token)
       .status(200)
       .send(__.success('Logged in.'));
};

const logout = async (req, res) => {
    await Driver.updateOne({ _id: driver._id }, {
        $set: {
            'status.online': false,
            shifts: {
                time: new Date(),
                method: 'logout'
            }
        }
    });

    res.status(200).send(__.success('Logged out'));
};

const location = async (req, res) => {
    const error = __.validate(req.body, {
        lat: Joi.number().precision(8).min(-90).max(90).required(),
        lng: Joi.number().precision(8).min(-180).max(180).required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    await Driver.updateOne({ _id: req.body.driverId }, { 
        $set: { 
            'geolocation.coordinates': [ req.body.lng, req.body.lat ],
            'geolocation.type': 'Point' 
        }
    });

    res.status(200).send(__.success('Location updated.'));
};

const nearestDriver = async (req, res) => {
    const error = __.validate(req.body, {
        lat: Joi.number().precision(8).min(-90).max(90).required(),
        lng: Joi.number().precision(8).min(-180).max(180).required(),
        driverCancelled: Joi.string().required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    var id;
    if (req.body.driverCancelled == "null")
    id = "5c8b9459e6d3cf2ca4c2ce11" //Dummy object id
    id = ObjectId(id);

    const nearestDriver = await Driver.findOne({
        geolocation: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: [ req.body.lng, req.body.lat ]
                },
                $maxDistance: 10000 //in meters
            },
        },
        _id: { $nin: [id] },
        'status.online': true,
        'status.passenger': false,
        // rating: ...
    }, '_id token phoneNumber');

    res.status(200).send(__.success(nearestDriver));
};

const bookUserDriver = async (req, res) => {
    const ride = req.body.ride;

    let nearestDriver;
    try {
        var driverCancelled = ride.driverCancelled;
        if (driverCancelled == null) driverCancelled = "null";

        const nearestDriverUrl = 'http://13.233.140.191:4000/api/driver/nearestDriver';
        const apiResponse = await axios.post(nearestDriverUrl, {
            lat: ride.pickupLocation.lat,
            lng: ride.pickupLocation.lng,
            driverCancelled: driverCancelled,
        }); 
        nearestDriver = apiResponse.data.data;
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
                status: '371'
            },
            token: ride.user.token
        });
        __.sendNotification({
            data: {
                status: '371',
                rideId: ride._id
            },
            token: ride.partner.token
        });

        return res.status(404).send(__.error('Driver not found.'));
    }

    __.sendNotification({
        data: {
            status: '193',
            lat: ride.pickupLocation.lat + '',
            lng: ride.pickupLocation.lng + '',
            rideId: ride._id,
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
        rideId: Joi.string().required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));
    const response = req.body.response;

    const driver = await Driver.findOne({ _id: req.body.driverId },
         'name token phoneNumber car');
    const car = await Car.findOne({ _id: driver.car });

    const ride = await Ride.findOneAndUpdate({ _id: req.body.rideId }, {
        $set: { 
            status: response,
            'driver.number': driver.phoneNumber
        } 
    });

    if (response == rideStatus.DRIVER_CONFIRMED) {
        await Driver.updateOne({ _id: req.body.driverId }, { 
            $set: {
                'status.passenger': true,
                currentRide: req.body.rideId,
            },
            $push: { allRides: ride._id }
        });
        await Ride.updateOne({ _id: req.body.rideId }, {
            $set: {
                driver: {
                    id: req.body.driverId,
                    token: driver.driverToken,
                    number: driver.phoneNumber
                }
            }
        });
        
        __.sendNotification({
            data: {
                status: '150',
                rideId: req.body.rideId
            },
            token: ride.partner.token
        });

        __.sendNotification({
            data: {
                status: '177',
                name: driver.name + '',
                phoneNumber: driver.phoneNumber + '',
                brand: car.brand,
                pn: car.plateNumber,
            },
            token: ride.user.token
        });

        return res.status(200).send(__.success(ride));

    } else if (response == rideStatus.DRIVER_DECLINED) {
        await Driver.updateOne({ _id: req.body.driverId }, { 
            $inc: { 'stats.declined': 1 },
            $set: { 'status.online': false },
            $push: { cancelledRides: ride._id },
        });

        await Ride.updateOne({ _id: ride._id }, {
            $set: { cancelledDriver: req.body.driverId }
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

const cancelRide = async (req, res) => {
    const error = __.validate(req.body, {
        rideId: Joi.string().required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    const ride = await Ride.findOneAndUpdate({ _id: req.body.rideId }, {
        $set: {
            status: '779',
            cancel: {
                value: true,
                by: 'driver',
                time: new Date(),
            }
        }
    });

    await Driver.updateOne({ _id: req.body._id }, {
        $set: {
            'status.passenger': false, 
            currentRide: null,
        },
        $inc: { 'stats.cancelled': 1 },
        $push: { cancelledRides: req.body.rideId },
    });

    await User.updateOne({ _id: ride.user.id }, {
        $set: { currentRide: null, }
    });

    __.sendNotification({
        data: { status: '779' },
        token: ride.user.id
    });

    __.sendNotification({
        data: { status: '779' },
        token: ride.partner.id
    });

    res.status(200).send(__.success('RIde cancelles'));
};  

 const pickup = async (req, res) => {
    const error = __.validate(req.body, {
        rideId: Joi.string().required(),
        customerCount: Joi.number().integer().required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    const ride = await Ride.findOneAndUpdate({ _id: req.body.rideId }, { 
        $set: {
            customerCount: { driver: req.body.customerCount },
            status: rideStatus.DRIVER_PICKUP,
            timing: { pickup: new Date() },
        }
    });

    const code = randomize('A', 6);
    //console.log(code);
    const partnerId = ride.partner.id;
    await Partner.updateOne({ _id: partnerId, 'currentRides.rideId': req.body.rideId }, {
        $set: { 'currentRides.$.code': code }
    });
    await Ride.updateOne({ _id: req.body.rideId }, {
        $set: { code: code }
    });

    __.sendNotification({
        data: {
            status: '225',
            code: code
        },
        token: ride.user.token
    });

    res.status(200).send(__.success('Updated.'));
 };

 const drop = async (req, res) => {
    const error = __.validate(req.body, {
        rideId: Joi.string().required(),
        distance: Joi.number().min(0).required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    const ride = await Ride.findOneAndUpdate({ _id: req.body.rideId }, {
        $set: { 
            status: rideStatus.DRIVER_DROP,
            timing: { drop: new Date() },
            stats: {
                distance: req.body.distance,
            },
        }
    });

    await Driver.updateOne({ _id: ride.driver.id }, {
        $set: {
            'status.passenger': false,
            currentRide: null,
        }
    });

    await User.updateOne({ _id: ride.user.id }, {
        $set: { currentRide: null }
    });

    __.sendNotification({
        data: {
            status: '356',
            rideId: req.body.rideId,
        },
        token: ride.partner.token
    });

    __.sendNotification({
        data: {
            status: '705'
        },
        token: ride.user.token
    });

    res.status(200).send(__.success('Updated.'));
 }

 const token = async (req, res) => {
    const error = __.validate(req.body, {
        token: Joi.string().required()
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    await Driver.update({ _id: req.body.driverId }, {
        $set: { token: req.body.token }
    });

    res.status(200).send(__.success('Token updated.'));
 }

 const online = async (req, res) => {
    const error = __.validate(req.body, {
        online: Joi.boolean().required()
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    var method;
    if (req.body.online == true) method = 'online';
    else method = 'offline';

    await Driver.updateOne({ _id: req.body.driverId }, {
        $set: { 
            'status.online': req.body.online,
            shifts: {
                time: new Date(),
                method: method
            }
        }
    });

    res.status(200).send(__.success('Online updated'));
 };

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.post('/nearestDriver', nearestDriver);
router.post('/bookUserDriver', bookUserDriver);
router.post('/location', auth, location);
router.post('/response', auth, driverResponse);
router.post('/cancelRide', auth, cancelRide);
router.post('/pickup', auth, pickup);
router.post('/token', token);
router.post('/drop', auth, drop);
router.post('/online', auth, online);

router.post('/initDriver', async (req, res) => {
    var driver = new Driver({
        email: 'driver@gmail.com',
        password: '$2b$10$WzIoJsBtXGopsOBuu2kcDu4yAAJanVOFweq4ndgCIs4Ng2Es71Hi2',
        token: 'fuHC3aiXKmY:APA91bG7xwAFF3pnYtFLo1QBZvTXqK1AH3sUuCF2szC_hMSQ5mhv5GNAXOqBflFrL-VhyIHYQ54XUUZgBPODUGai58tjSfm7GhM03kdB4_YpLEqcZs6xm0dHdXOb6Fl9tmGj7Nj5osNZ',
        geolocation: {
            coordinates: [ 88.359724, 22.5520686 ],
            type: 'Point',
        },
        name: 'Inzamam',
        phoneNumber: '9831185677',
        status: {
            online: false,
        },
    });

    await driver.save();

    res.status(200).send(__.success('Driver initialized.'));
});

router.post('/initCar', async (req, res) => {
    var car1 = new Car({
        brand: 'Toyota',
        model: 'L3',
        capacity: 4,
        plateNumber: 'WB-5491',
    });

    await car1.save();

    var car2 = new Car({
        brand: 'Maruti Suzuki',
        model: 'volvo',
        capacity: 4,
        plateNumber: 'WB-8278',
    });

    await car2.save();

    res.status(200).send('Inserted cars');
});

router.post('/setcartodriver', async (req, res) => {
    const car = await Car.findOne({});

    const driver = await Driver.findOneAndUpdate({ _id: '5c13d83bcaaa672a4cbf67a4' }, {
        $set : { car : car._id }
    });

    res.status(200).send('Updated succeddfully');
});

module.exports = router;