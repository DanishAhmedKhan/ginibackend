const mongoose = require('mongoose');
const config = require('config');
const jwt = require('jsonwebtoken');

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const rideSchema = new Schema({
    bookedBy: {
        type: ObjectId,
        ref: 'User'
    },
    customers: [{
        type: ObjectId,
        ref: 'User'
    }],
    customerCount: {
        type: Number
    },
    driver: {
        type: ObjectId,
        ref: 'Driver'
    },
    partner: {
        type: ObjectId,
        ref: 'Partner'
    },
    timing: {
        booked: Date, 
        pickup: Date,
        drop: Date,
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