const jwt = require('jsonwebtoken');
const config = require('config');

const auth = function (req, res, next) {
    const agent = req.header('x-ginj-agent');
    const token = req.header('x-' + agent + '-auth-token');
    if (!token) res.status(401).send('Access denied. No token provided.');

    try {
        const privateKey = config.get(agent + 'AuthToken');
        const decoded = jwt.verify(token, privateKey);
        req[agent] = decoded;
        next();
    } catch (e) {
        res.status(400).send('Invalid token.');
    } 

};

module.exports = auth;