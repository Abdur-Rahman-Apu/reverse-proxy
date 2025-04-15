require("dotenv").config();
const { Domain } = require("domain");
const http = require("http");
const httpProxy = require("http-proxy");
const mongoose = require("mongoose");

// Get environment variables
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI;

// Setup proxy server
const proxy = httpProxy.createProxyServer({});

// Handle CORS headers
proxy.on("proxyRes", (proxyRes, req, res) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
});

// Handle OPTIONS (preflight) requests
proxy.on("proxyReq", (proxyReq, req, res, options) => {
  if (req.method === "OPTIONS") {
    res.writeHead(200);
    return res.end();
  }
});

// Connect to MongoDB with retry
function connectWithRetry() {
  console.log("⏳ Connecting to MongoDB...");
  mongoose
    .connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
      console.log("✅ MongoDB connected");
    })
    .catch((err) => {
      console.error("❌ MongoDB connection failed:", err.message);
      console.log("🔁 Retrying in 5 seconds...");
      setTimeout(connectWithRetry, 5000);
    });
}

connectWithRetry();

// Create HTTP Server for reverse proxy
const server = http.createServer(async (req, res) => {
  const host = req.headers.host?.toLowerCase();
  console.log(host, "host");

  try {
    const domainEntry = await Domain.findOne({ name: host });

    console.log(domainEntry, "domain entry");

    // if (!domainEntry) {
    //   res.writeHead(404, { "Content-Type": "text/plain" });
    //   return res.end(`❌ Domain not found: ${host}`);
    // }

    const target =
      domainEntry?.target ??
      "https://staging.identity.dreamemirates.com/website/preview/170588";

    console.log(`🌐 ${host} → ${target}`);

    // Proxy the request to the target
    proxy.web(req, res, {
      target,
      changeOrigin: true,
    });
  } catch (err) {
    console.log(err, "err");
    console.error("❌ Internal error:", err.message);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal Server Error");
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Reverse proxy running on port ${PORT}`);
});
