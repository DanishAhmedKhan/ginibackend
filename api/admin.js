const express = require('express');
const Joi = require('joi');
const bcrypt = require('bcrypt');
const _ = require('lodash');
const Admin = require('../schema/Admin');

const router = express.Router();

const signup = async (req, res) => {
    const schema = Joi.object().keys({
        name: Joi.string().required().min(5).max(255),
        email: Joi.string().required().min(5).max(255).email(),
        password: Joi.string().required().min(5).max(255)
    });
    
    const { error } = Joi.validate(req.body, schema);
    if (error) return res.status(400).send(error.details[0].message);

    let admin = await Admin.findOne({ email: req.body.email });
    if (admin) return res.status(400).send('Admin already registered.');

    admin = _.pick(req.body, ['name', 'email', 'passowrd']);
    const newAdmin = new Admin(admin);
    await newAdmin.save();

    const token = newAdmin.generateAuthToken();
    res.status(200).send('Signed up.');
};

const login = async (req, res) => {
    const schema = Joi.object().keys({
        email: Joi.string().required().min(5).max(255).email(),
        password: Joi.string().required().min(5).max(255)
    });

    const { error } = Joi.validate(req.body, schema);
    if (error) return res.status(400).send(error.details[0].message);

    const admin = await Admin.findOne({ email: req.body.email });
    if (!admin) return res.status(400).send('Invalid email or password.');

    const validPassword = bcrypt.compare(req.body.password, admin.password);
    if (!validPassword) return res.status(400).send('Invalid email or password');

    const token = admin.generateAuthToken();
    res.status(200).send('Logged in.');
};

const allAdmin = async (req, res) => {
    const admins = await Admin.find({});
    res.status(200).send(admins);
};

router.post('/signup', signup);
router.post('/login' , login);
router.get('/getAllAdmin', allAdmin);

module.exports = router;