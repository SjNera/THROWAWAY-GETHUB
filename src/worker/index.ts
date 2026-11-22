// Cloudflare Worker entry: the API (see app.ts). Later this Worker also serves the web UI's static files.
import { createApp } from "./app";

export default createApp();
