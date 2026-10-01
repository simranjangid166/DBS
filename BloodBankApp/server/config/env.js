const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "..", ".env") });

module.exports = {
  port: parseInt(process.env.PORT || "8002", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  mysql: {
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: parseInt(process.env.MYSQL_PORT || "3306", 10),
    user: process.env.MYSQL_USER || "bloodbank",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "bloodbank",
  },
  jwt: {
    secret: process.env.JWT_SECRET || "dev_secret_change_me",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || "10", 10),
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "",
  fcm: {
    enabled: (process.env.FCM_ENABLED || "false").toLowerCase() === "true",
    serverKey: process.env.FCM_SERVER_KEY || "",
  },
  corsOrigins: (process.env.CORS_ORIGINS || "*").split(","),
};
