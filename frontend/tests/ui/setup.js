import { access, mkdir } from "node:fs/promises";
import { request } from "@playwright/test";

export default async function setup(config) {
  const baseURL = config.projects[0].use.baseURL;
  await mkdir(".playwright", { recursive: true });
  for (const login of ["anna", "maksim"]) {
    const path = `.playwright/${login}.json`;
    const exists = await access(path).then(() => true, () => false);
    const context = await request.newContext({ baseURL, storageState: exists ? path : undefined });
    if (!(await context.get("/api/auth/me")).ok()) {
      const response = await context.post("/api/auth/login", {
        data: { login, password: "kampus2026" },
      });
      if (!response.ok()) throw new Error(`Cannot sign in as ${login}: ${response.status()}`);
    }
    await context.storageState({ path: `.playwright/${login}.json` });
    await context.dispose();
  }
}
