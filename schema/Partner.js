const mongoose = require('mongoose');
const config = require('config');
const jwt = require('jsonwebtoken');

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const partnerSchema = new Schema({
    name: {
        type: String
    },
    type: {
        type: String, 
        enum: ['restaurant'],
        lowercase: true
    },
    token: {
        type: String,
        default: null
    },
    email: {
        type: String, 
        unique: true
    },
    password: {
        type: String
    },
    phoneNumber: {
        type: String,
    },
    address: {
        line: String, 
        state: String, 
        city: String, 
        zip: String
    },
    rating: {
        gini: Number,
        google: Number,
        zomato: Number,
    },
    url: {
        menu: String, 
        website: String
    },
    notification: [{
        id: String,
        code: Number, 
        msg: {
            user: String, 
            userCount: Number
        }
    }],
    reviews: [{
        by: {
            type: ObjectId
        },
        text: String,
        rating: Number
    }],
    currentRides: [{
        _id: false,
        rideId: {
            type: ObjectId,
            ref: 'Ride'
        },
        code: String
    }],
    geolocation: {
        type: {
            type: String, 
            enum: ['Point']
        },
        coordinates: {
            type: [Number]
        }
    },
    open: {
        type: Boolean
    },
    online: {
        type: Boolean
    },
    allRides: [{
        type: ObjectId,
        ref: 'Ride'
    }],
    online: {
        type: Boolean,
        default: false
    }
});

partnerSchema.methods.generateAuthToken = function() {
    return jwt.sign({ _id: this._id }, config.get('partnerAuthToken'));
}; 

partnerSchema.index({ geolocation: '2dsphere' });

const Partner = mongoose.model('Partner', partnerSchema);
module.exports = Partner;