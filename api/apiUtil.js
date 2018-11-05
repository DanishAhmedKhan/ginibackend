const Joi = require('joi');

module.exports.error = (msg) => {
    return {
        status: 'error',
        msg: msg
    };
};

module.exports.success = (msg) => {
    return {
        status: 'success',
        msg: msg
    };
};


module.exports.validate = (data, schemaObject) => {
    const schema = Joi.object().keys(schemaObject);

    const { error } = Joi.validate(data, schema);
    return error;
};