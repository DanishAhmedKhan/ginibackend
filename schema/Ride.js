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
        token: String
    },
    driver: {
        id: {
            type: ObjectId,
            ref: 'Driver'
        },
        token: String
    },
    partner: {
        id: {
            type: ObjectId, 
            ref: 'Partner'
        },
        token: String
    },
    customers: [{
        type: ObjectId,
        ref: 'User'
    }],
    customerCount: {
        type: Number
    },
    pickupLocation: {
        lat: Number, 
        lng: Number
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