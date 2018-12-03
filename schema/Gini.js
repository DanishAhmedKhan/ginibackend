const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const ObjectId = mongoose.ObjectId;

// dispatch : auto - everything is automatic
// dispatch : semi-auto - when there is no driver then admin take control of the ride
// dispatch : manual - every ride is notified to admin to find a driver

const giniSystemSchema = new Schema({
    dispatch: {
        type: String, 
        enum: [ 'auto', 'manual', 'semi-auto' ],
        default: 'auto'
    }
});

const GiniSystem = mongoose.model('GiniSystem', giniSystemSchema);
module.exports = GiniSystem;