require("dotenv").config();

const http = require("http");
const httpProxy = require("http-proxy");
const mongoose = require("mongoose");
const Domain = require("./schema/domain");

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

    // const target =
    //   domainEntry?.target ??
    //   "https://staging.identity.dreamemirates.com/website/preview/170588";

    // const baseTarget = "https://staging.identity.dreamemirates.com";
    // const fullPageTarget = `${baseTarget}/website/preview/170588`;

    // // 👇 Forward only the base request to the full page
    // if (req.url === "/" || req.url === "/website/preview/170588") {
    //   proxy.web(req, res, {
    //     target: fullPageTarget,
    //     changeOrigin: true,
    //     ignorePath: true,
    //   });
    // }

    // // 👇 Everything else like _next/static, images, CSS, etc.
    // else {
    //   proxy.web(req, res, {
    //     target: baseTarget,
    //     changeOrigin: true,
    //   });
    // }

    const pathname = url.parse(req.url || "").pathname || "";

    // ✅ Allow homepage to proxy the preview page
    if (pathname === "/") {
      req.url = fullPreviewPath;
      proxy.web(req, res, { target: baseTarget });
      return;
    }

    // ✅ Allow static assets needed by Next.js
    if (
      pathname.startsWith("/_next/") ||
      pathname.startsWith("/favicon") ||
      pathname.startsWith("/fonts") ||
      pathname.startsWith("/images") ||
      pathname.startsWith("/api/auth") // if your preview uses Next.js auth
    ) {
      proxy.web(req, res, { target: baseTarget });
      return;
    }

    // ❌ Block everything else
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("403 Forbidden — Access denied.");
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
