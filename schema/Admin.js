const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const config = require('config');

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const adminSchema = new Schema({
    name: {
        type: String
    },
    email: {
        type: String,
        min: 5,
        max: 255
    },
    password: {
        type: String, 
        require: true,
        min: 5,
        max: 1024
    },
    previlages: {
        admin: {
            type: Boolean,
            default: false
        },
        user: {
            type: Boolean,
            default: true
        },
        driver: {
            type: Boolean,
            default: true
        },
        partner: {
            type: Boolean,
            default: true
        }
    }
});

adminSchema.methods.generateAuthToken = function() {
    return 1;
    // return jwt.sign({ _id: this._id }, condif.get('adminAuthToken'));
}

const Admin = mongoose.model('Admin', adminSchema);
module.exports = Admin;