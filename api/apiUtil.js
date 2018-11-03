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

module.exports.validate = (schema) => {
    
};