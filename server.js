import { createServer } from "node:http";
import { createHash } from "node:crypto";

const EMAIL = "24f3004451@ds.study.iitm.ac.in";

const server = createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");

  if (req.url !== "/mcp" || req.method !== "POST") {
    res.writeHead(404);
    return res.end(JSON.stringify({ error: "Not found" }));
  }

  let body = "";
  req.setEncoding("utf8");
  req.on("data", chunk => body += chunk);

  req.on("end", () => {
    try {
      const request = JSON.parse(body);
      const id = request.id ?? null;

      if (request.method === "initialize") {
        res.end(JSON.stringify({
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: request.params?.protocolVersion ?? "2025-03-26",
            capabilities: { tools: {} },
            serverInfo: { name: "exam-mcp-server", version: "1.0.0" }
          }
        }));
        return;
      }

      if (request.method === "notifications/initialized") {
        res.writeHead(202);
        res.end();
        return;
      }

      if (request.method === "tools/list") {
        res.end(JSON.stringify({
          jsonrpc: "2.0",
          id,
          result: {
            tools: [{
              name: "solve_challenge",
              description: "Calculate the exam challenge response",
              inputSchema: { type: "object", properties: {}, additionalProperties: false }
            }]
          }
        }));
        return;
      }

      if (request.method === "tools/call") {
        const challenge = req.headers["x-exam-challenge"];

        if (!challenge) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: "Missing X-Exam-Challenge header" }));
          return;
        }

        const answer = createHash("sha256")
          .update(`${challenge}:${EMAIL.trim().toLowerCase()}`)
          .digest("hex")
          .slice(0, 16);

        res.end(JSON.stringify({
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: answer }]
          }
        }));
        return;
      }

      res.end(JSON.stringify({
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: "Method not found" }
      }));
    } catch {
      res.writeHead(400);
      res.end(JSON.stringify({ error: "Invalid JSON" }));
    }
  });
});

server.listen(process.env.PORT || 3000, "0.0.0.0", () => {
  console.log("MCP server listening on port", process.env.PORT || 3000);
});
