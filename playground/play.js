const express = require('express');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const router = express.Router();

const numberSchema = new Schema({
    x: {
        type: String, 
        unique: true,
    },
});

const Number = mongoose.model('Number', numberSchema);

const test = async (req, res) => {
    
    const n1 = new Number({
        x: '1'
    });

    const n2 = new Number({
        x: '2'
    });

    const n3 = new Number({
        x: '1'
    });

    const r1 = await n1.save();
    const r2 = await n2.save();
    const r3 = await n3.save();

    console.log(r1);
    console.log(r2);
    console.log(r3);

    res.status(200).send('Ok');
}

router.post('/test', test);

module.exports = router;
