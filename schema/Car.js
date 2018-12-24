const mongoose = require('mongoose');
const config = require('config');
const jwt = require('jsonwebtoken');

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const carSchema = new Schema({
    brand: {
        type: String
    },
    model: {
        type: String
    },
    capacity: {
        type: Number
    },
    plateNumber: {
        type: String
    }
});

carSchema.index({ geolocation: '2dsphere' });

const Car = mongoose.model('Car', carSchema);
module.exports = Car;