const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const mongoose = require('mongoose');
const config = require('config');
const helmet = require('helmet');
const admin = require('firebase-admin');
const cors = require('cors');
const ip = require('ip');

const app = express();

var serviceAccount = require("./serviceAccountKey.json");


const userAuthToken = config.get('userAuthToken');
const driverAuthToken = config.get('driverAuthToken');
const partnerAuthToken = config.get('partnerAuthToken');
const giniSystemId = config.get('giniSystemId');

if (userAuthToken == null || driverAuthToken == null || 
    partnerAuthToken == null || giniSystemId == null) {
    console.log('FATAL ERROR: one or more auth token not set.');
    process.exit(1); // 1 is the error code
}


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

const env = app.get('env');
const ipAddress = ip.address();
console.log(`Trying to start gini server at ${ipAddress} (in ${env} mode)...`);

if (app.get('env') == 'development') {
    app.use(morgan('tiny'));
}

if (app.get('env') == 'production') {
    app.use(morgan('tiny'));
    app.use(helmet());
}

const userApi = require('./api/user');
const driverApi = require('./api/driver');
const partnerApi = require('./api/partner');
const adminApi = require('./api/admin');
const giniSystem = require('./api/giniSystem');
const playground = require('./playground/play');
  
app.use('/api/user', userApi);
app.use('/api/driver', driverApi);
app.use('/api/partner', partnerApi);
app.use('/api/admin', adminApi);
app.use('/system', giniSystem);
app.use('/playground', playground);

const dbUrl = config.get('db');
console.log(`Trying to connect to mongodb ${dbUrl}`);

const mongoDbConfig = {
    useNewUrlParser: true,
    useCreateIndex: true,
};

mongoose.connect(dbUrl,  mongoDbConfig)
    .then(() => console.log('Connected to mongodb.'))
    .catch(err => console.log('Could not connect to mongodb.', err));

const port = process.env.PORT || config.get('server.port');
app.listen(port, () => {
    console.log(`Listining to port ${port}`);
});
