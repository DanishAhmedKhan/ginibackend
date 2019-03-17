const express = require('express');
const mongoose = require('mongoose');
const config = require('config');
const jwt = require('jsonwebtoken');

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const userSchema = new Schema({
    deviceId: {
        type: String,
        unique: true,
        required: true,
    },
    token: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        unique: true,
        required: true,
        max: 255,
        min: 5
    },
    password: {
        type: String,
        required: true, 
        max: 1024,
        min: 5
    },
    username: {
        type: String
    },
    phoneNumber: {
        type: String
    },
    meta: {},
    loggedIn: {
        type: Boolean
    },
    online: {
        type: Boolean
    },
    favouritePickupLocations: [{
        label: String, 
        address: String, 
        lat: Number, 
        lng: Number 
    }],
    currentRide: {
        type: ObjectId,
        ref: 'Ride'
    },
    allRides: [{
        type: ObjectId,
        ref: 'Ride'
    }],
    geolocation: {
        type: {
            type: String, 
            enum: ['Point'],
            default: 'Point',
        },
        coordinates: {
            type: [Number]
        }
    },
    rating: {
        driver: {
            type: Number,
        },
        partner: {
            type: Number
        }
    },
    greylist: {
        value: Boolean,
        misuseCount: Number, 
        moneyDue: Number,
        penalty: Number,
    }
});

userSchema.methods.generateAuthToken = function() {
    return jwt.sign({ _id: this._id }, config.get('userAuthToken'));
};

const User = mongoose.model('User', userSchema);
module.exports = User;