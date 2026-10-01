const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const env = require("./config/env");
const { attachUser } = require("./middleware/auth");
const { notFound, errorHandler } = require("./middleware/error");

const authRoutes = require("./routes/authRoutes");
const donorRoutes = require("./routes/donorRoutes");
const recipientRoutes = require("./routes/recipientRoutes");
const requestRoutes = require("./routes/requestRoutes");
const donorRequestRoutes = require("./routes/donorRequestRoutes");
const donationRoutes = require("./routes/donationRoutes");
const bloodBankRoutes = require("./routes/bloodBankRoutes");
const adminRoutes = require("./routes/adminRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const systemRoutes = require("./routes/systemRoutes");

const app = express();

app.set("trust proxy", 1);
app.use(cors({ origin: env.corsOrigins.includes("*") ? true : env.corsOrigins, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use(attachUser);

// Every route is mounted under /api so the FastAPI proxy can forward /api/*
const api = express.Router();
api.get("/", (_req, res) =>
  res.json({
    success: true,
    app: "Blood Bank and Donor Locator API",
    version: "1.0.0",
    status: "online",
    stack: "Node.js + Express + MySQL",
  })
);
api.use("/auth", authRoutes);
api.use("/donors", donorRoutes);
api.use("/recipients", recipientRoutes);
api.use("/requests", requestRoutes);
api.use("/donor-requests", donorRequestRoutes);
api.use("/donations", donationRoutes);
api.use("/blood-banks", bloodBankRoutes);
api.use("/admin", adminRoutes);
api.use("/notifications", notificationRoutes);
api.use("/system", systemRoutes);

app.use("/api", api);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
