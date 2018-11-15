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
    status: {
        type: Number
    },
    timing: {
        booked: {
            type: Date, default: new Date()
        },
        pickup: {
            type: Date, default: new Date()
        },
        drop:{
            type: Date, default: new Date()
        }
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