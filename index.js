const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const mongoose = require('mongoose');
const config = require('config');
const admin = require('firebase-admin');
const cors = require('cors');

const app = express();

// if (!config.get('userWebToken')) {
    // console.log('FATAL ERROR!');
    // process.exit(1);
// }


// Firebase Admin initialization
var serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

//middlewares

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

if (app.get('env') == 'development') {
    app.use(morgan('tiny'));
}

if (app.get('env') == 'production') {
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

const dbName = config.get('db.name');
console.log(dbName);
mongoose.connect('mongodb://localhost/' + dbName)
    .then(() => console.log('Connected to mongodb.'))
    .catch(err => console.log('Could not connect to mongodb.', err));

const port = config.get('server.port');
app.listen(port, () => {
    console.log(`Listining to port ${port}`);
});
