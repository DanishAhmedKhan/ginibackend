const mongoose = require('mongoose');

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
    driverCancelled: {
        type: ObjectId,
        ref: 'Driver',
    },
    code: {
        type: String
    },
    pickupLocation: {
        address: {
            line: String,
            state: String, 
            city: String, 
            zip : String
        },
        lat: Number, 
        lng: Number
    },
    dropLocation: {
        address: {
            line: String, 
            state: String, 
            city: String, 
            zip: String
        }, 
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
    stats: {
        duration: Number,
        distance: Number,
        fare: Number, 
        incentive: Boolean,
    },
    cancel: {
        value: {
            type: Boolean
        },
        by: {
            type: String,
            enum: ['user', 'driver', 'partner']
        },
        time: {
            type: Date,
        }
    }
});

const Ride = mongoose.model('Ride', rideSchema);
module.exports = Ride;