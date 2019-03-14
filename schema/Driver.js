const mongoose = require('mongoose');
const config = require('config');
const jwt = require('jsonwebtoken');

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const driverSchema = new Schema({
    name: {
        type: String
    },
    email: {
        type: String
    },
    password: {
        type: String
    },
    phoneNumber: {
        type: String
    },
    car: {
        type: ObjectId,
        ref: 'Car'
    },
    token: {
        type: String
    },
    status: {
        online: Boolean,
        passenger: Boolean,
        break: Boolean
    },
    shifts: [{
        time: Date,
        method: {
            type: String, 
            enum: ['login', 'logout', 'online', 'offline']
        }
    }],
    geolocation: {
        type: {
            type: String,
            enum: [ 'Point' ],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
        }
    },
    currentRide: {
        type: ObjectId,
        ref: 'Ride'
    },
    allRides: [{
        type: ObjectId,
        ref: 'Ride'
    }],
    stats: {
        declined: Number,
        cancled: Number,
        ride: Number,
        rating: Number,
    }
});

driverSchema.methods.generateAuthToken = function() {
    return jwt.sign({ _id: this._id }, config.get('driverAuthToken'));
}

driverSchema.index({ geolocation: '2dsphere' });

const Driver = mongoose.model('Driver', driverSchema);
module.exports = Driver;