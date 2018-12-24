const express = require('express');
const Joi = require('joi');
const config = require('config');
const __ = require('./apiUtil');
const GiniSystem = require('../schema/Gini');

const router = express.Router();
const GINI_SYSTEM_ID = config.get('giniSystemId');

const initialize = async (req, res) => {
    const giniSystem = new GiniSystem({
        _id: GINI_SYSTEM_ID
    });
    await giniSystem.save();

    res.status(200).send('Gini System initialized.');
}

const setDispatch = async (req, res) => {
    const error = __.validate(req.body, {
        dispatch: Joi.string().required()
    });
    if (error) return res.status(__.error(error.details[0].message));

    await GiniSystem.update({}, {
        $set: { dispatch: req.body.dispatch }
    });

    res.status(200).send('Dispatched updated.');
}

router.post('/initialize', initialize);
router.post('/dispatch', setDispatch);

module.exports = router;