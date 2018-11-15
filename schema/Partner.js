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
        type: String
    },
    email: {
        type: String, 
        unique: true
    },
    password: {
        type: String
    },
    address: {
        line1: String, 
        line2: String, 
        state: String, 
        city: String, 
        zip: String
    },
    notification: [{
        id: String,
        code: Number, 
        msg: {
            user: String, 
            userCount: Number
        }
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
    currentRides: [{
        type: ObjectId,
        ref: 'Ride'
    }],
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