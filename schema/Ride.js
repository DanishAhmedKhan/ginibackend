const mongoose = require('mongoose');
const config = require('config');
const jwt = require('jsonwebtoken');

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const rideSchema = new Schema({
    user: {
        id: {
            type: ObjectId,
            ref: 'User'
        },
        token: String,
        number: String
    },
    driver: {
        id: {
            type: ObjectId,
            ref: 'Driver'
        },
        token: String,
        number: String
    },
    partner: {
        id: {
            type: ObjectId, 
            ref: 'Partner'
        },
        token: String,
        number: String
    },
    customers: [{
        type: ObjectId,
        ref: 'User'
    }],
    customerCount: {
        user: Number, 
        driver: Number
    },
    code: {
        type: String
    },
    pickupLocation: {
        lat: Number, 
        lng: Number
    },
    status: {
        type: Number
    },
    timing: {
        booked: Date,
        pickup: Date,
        drop: Date,
        confirmed: Date, 
    },
    cancel: {
        value: {
            type: Boolean
        },
        by: {
            type: String,
            enum: ['user', 'driver', 'partner']
        }
    }
});

const Ride = mongoose.model('Ride', rideSchema);
module.exports = Ride;