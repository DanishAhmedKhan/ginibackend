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

const autherSchema = new Schema({
    name: String,
    age: Number,
});

const Auther = mongoose.model('Auther', autherSchema);

const auther = async (req, res) => {
    const auther = {
        name: 'Danish Ahmed Khan',
        age: 21.
    };
    
    const newAuther = new Auther(auther);
    const autherData = await newAuther.save();
    console.log('Auther :; ');
    console.log(autherData);

    res.status(200).send(autherData);
}; 

const printAuther = async (req, res) => {
    const id = req.body.id;

    const auther = await Auther.findOne({ _id: id });

    console.log(auther);

    res.status(200).send(auther);
};  

async function tt() {
    
    const a = await Auther.findOne({ age: 21 });
    console.log('shdjas');
    console.log(a);
}

console.log('Cristiano!');
tt();

//router.post('/objectTest', auther);
//router.post('/printObject', printAuther);

//module.exports = router;
