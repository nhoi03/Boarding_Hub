import type { BoardingHubApi } from "./contract";
import { httpApi } from "./http";
import { mockApi } from "./mock";

export const API_MODE: "mock" | "http" = import.meta.env.VITE_API_MODE === "http" ? "http" : "mock";

export const api: BoardingHubApi = API_MODE === "http" ? httpApi : mockApi;

export * from "./types";
export type * from "./contract";
