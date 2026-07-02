const express = require('express');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const cors = require('cors');
const passport = require('passport');
const httpStatus = require('http-status');
const config = require('./config/config');
const morgan = require('./config/morgan');
const { jwtStrategy } = require('./config/passport');
const { authLimiter } = require('./middlewares/rateLimiter');
const routes = require('./routes/v1');
const { errorConverter, errorHandler } = require('./middlewares/error');
const ApiError = require('./utils/ApiError');

const app = express();

if (config.env !== 'test') {
  app.use(morgan.successHandler);
  app.use(morgan.errorHandler);
}

// set security HTTP headers
app.use(helmet());

// parse json request body
app.use(express.json());

// parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// sanitize request data
app.use(xss());
app.use(mongoSanitize());

// gzip compression
app.use(compression());

// enable cors
const allowedOrigins = [
  'http://localhost:5173',
  'http://159.223.169.35:5173',
  'http://159.223.169.35',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];
app.use(
  cors({
    origin: (origin, callback) => {
      console.log(`[CORS Log] Request Origin: ${origin}`);
      console.log(`[CORS Log] Allowed Origins:`, allowedOrigins);
      if (!origin) {
        console.log(`[CORS Log] Access allowed (no origin)`);
        return callback(null, true);
      }
      const isAllowed = allowedOrigins.includes(origin) || origin.includes('vercel.app');
      if (isAllowed) {
        console.log(`[CORS Log] Access allowed for origin: ${origin}`);
        return callback(null, true);
      }
      console.warn(`[CORS Log] Access BLOCKED for origin: ${origin}`);
      return callback(null, false);
    },
    credentials: true,
  })
);
app.options('*', cors());

// jwt authentication
app.use(passport.initialize());
passport.use('jwt', jwtStrategy);

// limit repeated failed requests to auth endpoints
if (config.env === 'production') {
  app.use('/v1/auth', authLimiter);
}

// v1 api routes
app.use('/api/v1', routes);

// Health check endpoint for Docker/load balancers (outside /api prefix)
app.use('/health', require('./routes/v1/health.route'));

// send back a 404 error for any unknown api request
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

// convert error to ApiError, if needed
app.use(errorConverter);

// handle error
app.use(errorHandler);

module.exports = app;
