import express from 'express';
import cors from 'cors';
import logger from 'morgan';
import dotenv from 'dotenv';
import http from 'http';
import https from 'https';
import connectDB from './configs/db.js';
import routes from './routes/index.js';
import admin from 'firebase-admin';
import bodyParser from 'body-parser';
import errorMiddleware from './middlewares/error.middleware.js';
import { serviceAccount } from './configs/dev-xcard-firebase.js';
import * as fs from 'fs';
import winLogger from './middlewares/winston_logger.js';

// Controller

// Initialize Firebase
const firebaseapp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.BUCKET_URL,
});
// Load env vars
dotenv.config({
  path: process.env.NODE_ENV === 'production' ? '.env' : '.env',
});

// Connect to databases
connectDB();

// Express initialisation
const app = express();

if (process.env.NODE_ENV === 'production') {
  app.use(
    cors({
      credentials: true,
    })
  );

  app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, OPTIONS, PUT, PATCH, DELETE'
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-Requested-With,Content-Type'
    );
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
  });
}

// Body parser
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(logger('dev'));

// Route Files

// Mount routerss
routes(app);

// Middlewaress
app.use(errorMiddleware);
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use('/profile/public', express.static('public'));


const PORT = process.env.PORT;
const SECUREPORT = process.env.SECUREPORT;

// HTTP Servers
const httpServer = http.createServer(app);
const server = httpServer.listen(
  PORT,
  console.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
);

// if (process.env.NODE_ENV === 'production') {
//   // if(true){
//   const credentials = {
//     cert: fs.readFileSync('./ssl/app_visitingcard_store.crt'),
//     ca: fs.readFileSync('./ssl/app_visitingcard_store.ca-bundle'),
//     key: fs.readFileSync('./ssl/app_visitingcard_store.key'),
//   };
//   const httpsServer = https.createServer(credentials, app);
//   const secureServer = httpsServer.listen(
//     SECUREPORT,
//     console.info(
//       `Secure Server running in ${process.env.NODE_ENV} mode on port ${SECUREPORT}`
//     )
//   );

//   app.use((req, res, next) => {
//     if (req.protocol === 'http') {
//       res.redirect(301, `https://${req.headers.host}${req.url}`);
//     }
//     next();
//   });

//   winLogger.warn('This is a warning log');
//   winLogger.info('This is an info log');
//   winLogger.error('This is an error log');
// }

function exitHandler(options, exitCode) {
  if (options.cleanup) if (exitCode || exitCode === 0) console.log(exitCode);
  if (options.exit) process.exit();
}

//do something when app is closing
process.on('exit', exitHandler.bind(null, { cleanup: true }));
//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { exit: true }));
// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
});
