import { store, type GameRepository } from "./store.js";

export async function createRepository(): Promise<GameRepository> {
  if (process.env.DATA_STORE === "prisma") {
    const { PrismaStore } = await import("./prisma-store.js");
    return new PrismaStore();
  }
  return store;
}

export function repositoryMode(): "memory" | "prisma" {
  return process.env.DATA_STORE === "prisma" ? "prisma" : "memory";
}
