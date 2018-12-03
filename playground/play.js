// const Joi = require('joi');
// const _ = require('../api/apiUtil');


// const schema = Joi.object().keys({
//     x: Joi.number().required()
// });

// const obj = { y: 1 };

// const { error } = Joi.validate(obj, schema);
// const msg = error.details[0].message;
// if (msg) console.log("Error", msg);
// else console.log('No error!');



// const getUser = () => {
//     return { name: 'Danish', age: 21 };
// }

// const user = getUser();
// const { name } = getUser();
// const { age } = getUser();

// console.log('User', user);
// console.log('Name', name);
// console.log('Age', age);

const express = require('express');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const router = express.Router();

const numberSchema = new Schema({
    x: [{
        _id: false,
        a: String, 
        b: String
    }]
});

const Number = mongoose.model('Number', numberSchema);

const test = async (req, res) => {
    const num = new Number({});
    const result = await num.save();
    const id = result._id;
    console.log(id);

    const obj = {
        a: '1'
    };

    await Number.updateOne({ _id: id }, {
        $push: { x: { a: '1' } }
    });
    await Number.updateOne({ _id: id }, {
        $push: { x: { a: '2' } }
    });
    await Number.updateOne({ _id: id }, {
        $push: { x: { a: '3' } }
    });

    const l = await Number.findOne({ _id: id });
    console.log(l);

    await Number.updateOne({ _id: id, 'x.a': '1' }, {
        $push: { 'x.$.b': 'Danish' }
    });
    await Number.updateOne({ _id: id, 'x.a': '2' }, {
        $push: { 'x.$.b': 'Tanvir' }
    });
    await Number.updateOne({ _id: id, 'x.a': '3' }, {
        $push: { 'x.$.b': 'Saif' }
    });

    const n = await Number.findOne({ _id: id });
    console.log(n);

    await Number.updateOne({ _id: id, 'x.b': 'Danish' }, {
        $pull: { x: { b: 'Danish' } }
    });
    await Number.updateOne({ _id: id, 'x.b': 'Tanvir' }, {
        $pull: { 'x.$.b': 'Tanvir' }
    });

    const o = await Number.findOne({ _id: id });
    console.log(o);

    res.status(200).send(o);
};

router.post('/test', test);

module.exports = router;
