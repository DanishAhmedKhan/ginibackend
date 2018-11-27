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
    age: String,
    books: [ String ]
});

const Auther = mongoose.model('Auther', autherSchema);

const auther = async (req, res) => {
    const auther = {
        name: 'Danish Ahmed Khan',
        age: 21
    };

    const newAuther = new Auther(auther);
    let auth = await newAuther.save();
    console.log(auth);

    const id = auth._id;
    auth = await Auther.update({ _id: id }, {
        $push: { books: { $each: [ 'Don', 'Bon', 'Gon', 'Ron' ] } }
    });
    console.log(auth);

    auth = await Auther.update({ _id: id }, {
        $pull: { books: 'Bon' }
    }); 
    console.log(auth);

    auth = await Auther.update({ _id: id }, {
        $pull: { books: 'Kon' }
    });
    console.log(auth);

    res.status(200).send('Success!');
}; 

const printAuther = async (req, res) => {
    
};

router.post('/auther', auther);
router.post('/printObject', printAuther);

module.exports = router;
