const jwt = require('jsonwebtoken');
const config = require('config');

const auth = function (req, res, next) {
    const agent = req.header('x-gini-agent');
    const token = req.header('x-' + agent + '-auth-token');
    if (!token)  {
        console.log('Access denied. No token provided.');
        return res.status(401).send('Access denied. No token provided.');
    }

    try {
        const privateKey = config.get(agent + 'AuthToken');
        const decoded = jwt.verify(token, privateKey);
        if ('_id' in decoded) req.body[agent + 'Id'] = decoded._id;
        req[agent] = decoded;
        next();
    } catch (e) {
        res.status(400).send('Invalid token.');
    } 

};

module.exports = auth;