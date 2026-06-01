import "dotenv/config";
import cors from "cors";
import express from "express";
import { z } from "zod";
import { ContentService } from "./content-service.js";
import { createRepository, repositoryMode } from "./repository.js";
import { RunService } from "./run-service.js";
import type { ContentKind } from "./types.js";

const app = express();
const port = Number(process.env.PORT ?? 5174);
const repo = await createRepository();
const runService = new RunService(repo);
const contentService = new ContentService(repo);

app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(",") ?? true }));
app.use(express.json({ limit: "2mb" }));

const userIdFrom = (req: express.Request) => String(req.header("x-user-id") || req.query.user_id || req.body?.user_id || "demo-user");
const asyncHandler = (handler: express.RequestHandler): express.RequestHandler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

app.get("/health", (_req, res) => res.json({ ok: true, service: "rebirth-server", store: repositoryMode() }));

app.get("/v1/home", asyncHandler(async (req, res) => res.json(await runService.home(userIdFrom(req)))));

app.post("/v1/run/new", asyncHandler(async (req, res) => {
  const body = z.object({ talent_ids: z.array(z.string()).default([]), world_id: z.string().default("real_common_life") }).parse(req.body ?? {});
  res.json(await runService.newRun(userIdFrom(req), body.talent_ids, body.world_id));
}));

app.post("/v1/run/continue", asyncHandler(async (req, res) => res.json(await runService.continueRun(userIdFrom(req)))));

app.post(
  "/v1/run/turn",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        run_id: z.string(),
        input_type: z.enum(["quick", "free"]),
        option_id: z.string().optional(),
        free_text: z.string().max(120).optional()
      })
      .parse(req.body);
    res.json(await runService.turn(userIdFrom(req), body));
  })
);

app.post("/v1/run/settle", asyncHandler(async (req, res) => {
  const body = z.object({ run_id: z.string() }).parse(req.body);
  res.json(await runService.settle(userIdFrom(req), body.run_id));
}));

app.get("/v1/talents/candidates", asyncHandler(async (req, res) => res.json(await runService.talentCandidates(userIdFrom(req)))));

app.post("/v1/talents/select", asyncHandler(async (req, res) => {
  const body = z.object({ talent_ids: z.array(z.string()).max(3) }).parse(req.body);
  res.json(await runService.selectTalents(userIdFrom(req), body.talent_ids));
}));

app.get("/v1/atlas", asyncHandler(async (req, res) => res.json(await runService.atlas(userIdFrom(req)))));
app.get("/v1/achievements", asyncHandler(async (req, res) => res.json(await runService.achievements(userIdFrom(req)))));

app.post("/v1/share/text", asyncHandler(async (req, res) => {
  const body = z.object({ run_id: z.string() }).parse(req.body);
  res.json(await runService.shareText(userIdFrom(req), body.run_id));
}));

const kinds: ContentKind[] = ["world_packs", "event_cards", "death_cards", "talents", "achievements"];
const paramString = (value: string | string[] | undefined): string => Array.isArray(value) ? value[0] : String(value ?? "");
const parseKind = (value: string): ContentKind => {
  if (!kinds.includes(value as ContentKind)) throw new Error("unknown content kind");
  return value as ContentKind;
};

app.get("/admin/content/:kind", asyncHandler(async (req, res) => res.json(await contentService.list(parseKind(paramString(req.params.kind))))));
app.post("/admin/content/:kind/import", asyncHandler(async (req, res) => {
  const body = z.object({ items: z.array(z.unknown()) }).parse(req.body);
  const result = await contentService.import(parseKind(paramString(req.params.kind)), body.items);
  res.status(result.ok ? 200 : 422).json(result);
}));
app.put("/admin/content/:kind", asyncHandler(async (req, res) => res.json(await contentService.upsert(parseKind(paramString(req.params.kind)), req.body as never))));
app.delete("/admin/content/:kind/:id", asyncHandler(async (req, res) => {
  await contentService.delete(parseKind(paramString(req.params.kind)), paramString(req.params.id));
  res.json({ ok: true });
}));
app.get("/admin/content/:kind/export", asyncHandler(async (req, res) => res.json({ items: await contentService.list(parseKind(paramString(req.params.kind))) })));

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : "unknown error";
  res.status(message.includes("not found") ? 404 : 400).json({ error: message });
});

app.listen(port, () => {
  console.log(`rebirth server listening on http://localhost:${port}`);
});
