const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const mongoose = require('mongoose');
const config = require('config');
const helmet = require('helmet');
const admin = require('firebase-admin');
const cors = require('cors');

const app = express();

var serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

const env = app.get('env');
console.log(`Trying to start gini server(in ${env} mode)...`);

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
console.log(dbUrl);
mongoose.connect(dbUrl)
    .then(() => console.log('Connected to mongodb.'))
    .catch(err => console.log('Could not connect to mongodb.', err));

const port = process.env.PORT || config.get('server.port');
app.listen(port, () => {
    console.log(`Listining to port ${port}`);
});
