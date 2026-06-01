import serverless from "serverless-http";
import { createApp } from "../../apps/server/src/app.js";

let cachedHandler: ReturnType<typeof serverless> | undefined;

export const handler = async (event: unknown, context: unknown) => {
  if (!cachedHandler) {
    const app = await createApp();
    cachedHandler = serverless(app);
  }
  return cachedHandler(event, context);
};
