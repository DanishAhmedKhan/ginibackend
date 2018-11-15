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
        data: msg
    };
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