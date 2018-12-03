const Joi = require('joi');
const admin = require('firebase-admin');

module.exports.error = (msg) => {
    return {
        status: 'error',
        msg: msg
    };
};

module.exports.success = (data) => {
    return {
        status: 'success',
        data: data
    };
};

module.exports.sendNotification = async (message) => {
    await admin.messaging().send(message)
        .then(response => {
            console.log(response);
        }).catch(error => {
            console.log(error);
        });
};

module.exports.validate = (data, schemaObject) => {
    const schema = Joi.object().keys(schemaObject);

    const { error } = Joi.validate(data, schema, {
        abortEarly: true, 
        convert: true,
        allowUnknown: true
    });
    
    return error;
};