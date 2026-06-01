import serverless from "serverless-http";
import { createApp } from "../../apps/server/src/app.js";

const app = await createApp();

export const handler = serverless(app);
