#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { createApiClient } from "./client.js";
const server = createServer(createApiClient(process.env.USCODE_ORIGIN));
await server.connect(new StdioServerTransport());
