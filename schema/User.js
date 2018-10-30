const express = require('express');
const mongoose = require('mongoose');
const config = require('config');
const jwt = require('jsonwebtoken');

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const userSchema = new Schema({
    deviceId: {
        type: String,
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
        require: true, 
        max: 1024,
        min: 5
    },
    phoneNumber: {
        type: String
    },
    meta: {

    },
    online: {
        type: Boolean
    },
    pickuplOcations: [{
        tag: String, 
        address: String
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
            enum: ['Point']
        },
        coordinates: {
            type: [Number]
        }
    }
});

userSchema.methods.generateAuthToken = function() {
    return jwt.sign({ _id: this._id }, config.get('userAuthToken'));
};

const User = mongoose.model('User', userSchema);
module.exports = User;