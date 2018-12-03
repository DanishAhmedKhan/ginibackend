const express = require('express');
const Joi = require('joi');
const bcrypt = require('bcrypt');
const _ = require('lodash');
const __ = require('./apiUtil');
const Admin = require('../schema/Admin');

const router = express.Router();

const signup = async (req, res) => {
    const error = __.validate(req.body, {
        name: Joi.string().required().min(5).max(255),
        email: Joi.string().required().min(5).max(255).email(),
        password: Joi.string().required().min(5).max(255)
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    let admin = await Admin.findOne({ email: req.body.email });
    if (admin) return res.status(400).send('Admin already registered.');

    admin = _.pick(req.body, ['name', 'email', 'passowrd']);
    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(admin.password, salt);

    const newAdmin = new Admin(admin);
    await newAdmin.save();

    const token = newAdmin.generateAuthToken();
    res.header('x-admin-auth-token', token).status(200)
        .send(__.success('Signed up.'));
};

const login = async (req, res) => {
    const error = __.validate(req.body, {
        email: Joi.string().required().min(5).max(255).email(),
        password: Joi.string().required().min(5).max(255)
    });
    if (error) return res.status(400).send(__.success(error.details[0].message));

    const admin = await Admin.findOne({ email: req.body.email });
    if (!admin) return res.status(400).send(__.error('Invalid email or password.'));

    const validPassword = bcrypt.compare(req.body.password, admin.password);
    if (!validPassword) return res.status(400).send(__.error('Invalid email or password'));

    const token = admin.generateAuthToken();
    res.header('x-admin-auth-token', token).status(200)
        .send(__.success('Logged in.'));
};

const token = async (req, res) => {
    const error = __.validate(req.body, {
        token: Joi.string().required()
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    await Admin.updateOne({ _id: adminId }, {
        $set: { token: req.body.token }
    });

    res.sttaus(200).send(__.success('Updated'));
}

const allAdmin = async (req, res) => {
    const admins = await Admin.find({});
    res.status(200).send(admins);
};

router.post('/signup', signup);
router.post('/login' , login);
router.get('/allAdmin', allAdmin);
router.post('/token', token);

module.exports = router;