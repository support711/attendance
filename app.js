const express = require("express");
const app = express();

const PORT = process.env.PORT || 80;

// ZKTeco sends form-urlencoded
app.use(express.urlencoded({ extended: false }));

// Store attendance logs in memory
const attendanceLogs = [];

app.use((req, res, next) => {
  console.log("====== INCOMING REQUEST ======");
  console.log("TIME:", new Date().toISOString());
  console.log("IP:", req.headers["x-forwarded-for"] || req.socket.remoteAddress);
  console.log("METHOD:", req.method);
  console.log("URL:", req.originalUrl);
  console.log("HEADERS:", req.headers);
  console.log("QUERY:", req.query);
  console.log("BODY:", req.body);
  console.log("==============================");
  next();
});

/**
 * Device sends logs here:
 * GET or POST /iclock/cdata?SN=XXXX&table=ATTLOG&Stamp=12345
 *
 * Then POST body contains lines like:
 *  PIN=12\tDateTime=2026-02-07 10:20:33\tStatus=0\tVerify=1\tWorkCode=0
 */
app.all("/iclock/cdata", (req, res) => {
  const sn = req.query.SN || "UNKNOWN";
  const table = req.query.table || "UNKNOWN";

  // If device is only checking server, it might not send body
  const bodyRaw = req.body;

  // Store the request
  attendanceLogs.push({
    ts: new Date().toISOString(),
    sn,
    table,
    query: req.query,
    body: bodyRaw,
  });

  console.log("📥 /iclock/cdata", { sn, table, query: req.query, body: bodyRaw });

  // ZKTeco expects "OK"
  res.status(200).send("OK");
});

/**
 * Device polls this endpoint asking:
 * "do you have commands for me?"
 *
 * If you return nothing, respond OK.
 */
app.all("/iclock/getrequest", (req, res) => {
  console.log("📡 /iclock/getrequest", req.query);
  res.status(200).send("OK");
});

/**
 * API: read stored logs
 */
app.get("/api/attlogs", (req, res) => {
  res.json({
    total: attendanceLogs.length,
    data: attendanceLogs.slice(-200),
  });
});

app.all(/.*/, (req, res) => {
  console.log("UNKNOWN:", req.method, req.originalUrl);
  res.status(200).send("OK");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ ZKTeco iClock server running on port ${PORT}`);
});
