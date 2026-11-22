import { test, expect } from "@playwright/test";

const twoFrames = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const height = (locator) => locator.evaluate((node) => node.getBoundingClientRect().height);

test.beforeEach(async ({ page }) => {
  page.__errors = [];
  page.on("pageerror", (error) => page.__errors.push(error.message));
});

test.afterEach(async ({ page }) => {
  expect(page.__errors).toEqual([]);
});

test("rapid tab changes cancel stale transitions without replacing the header", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /что в планах/ })).toBeVisible();
  await page.evaluate(() => {
    window.__header = document.querySelector(".app-header");
    for (const path of ["/schedule", "/grades", "/requests", "/notifications", "/grades"]) {
      document.querySelector(`.header-tab[href="${path}"]`).click();
    }
  });
  await expect(page).toHaveURL(/\/grades$/);
  await expect(page.getByRole("heading", { name: "Успеваемость", exact: true })).toBeVisible();
  await page.evaluate(async () => { await Promise.allSettled(document.getAnimations().filter((animation) => animation.effect.getTiming().iterations !== Infinity).map((animation) => animation.finished)); });
  expect(await page.evaluate(() => document.querySelector(".app-header") === window.__header)).toBe(true);
  await expect(page.locator('.header-tab[aria-current="page"]')).toHaveAttribute("href", "/grades");
  await page.goBack();
  await expect(page.getByRole("heading", { name: /что в планах/ })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole("heading", { name: "Успеваемость", exact: true })).toBeVisible();
});

test("selection moves continuously and keeps the clicked control focused", async ({ page }) => {
  await page.goto("/grades");
  const group = page.getByRole("group", { name: "Семестр", exact: true });
  const target = group.getByRole("button", { name: "4 семестр" });
  const difference = () => group.evaluate((node) => Math.abs(node.querySelector(".choice-indicator").getBoundingClientRect().left - node.querySelector('[data-active="true"]').getBoundingClientRect().left));
  await target.click();
  await twoFrames(page);
  expect(await difference()).toBeGreaterThan(0.1);
  await expect(target).toBeFocused();
  await expect.poll(difference).toBeLessThan(0.05);
  await group.getByRole("button", { name: "5 семестр" }).click();
  await target.click();
  await group.getByRole("button", { name: "5 семестр" }).click();
  await expect.poll(difference).toBeLessThan(0.05);
  await expect(group.getByRole("button", { name: "5 семестр" })).toHaveAttribute("aria-pressed", "true");
});

test("inbox indicator stays inside its group across mobile and desktop layouts", async ({ page }) => {
  await page.goto("/notifications");
  const group = page.getByRole("group", { name: "Категории уведомлений" });
  await group.getByRole("button", { name: /Дедлайны/ }).click();
  const error = () => group.evaluate((node) => {
    const indicator = node.querySelector(".choice-indicator").getBoundingClientRect();
    const selected = node.querySelector('[data-active="true"]').getBoundingClientRect();
    return Math.max(Math.abs(indicator.x - selected.x), Math.abs(indicator.y - selected.y));
  });
  await expect.poll(error).toBeLessThan(0.05);
  await page.setViewportSize({ width: page.viewportSize().width <= 720 ? 1280 : 360, height: 800 });
  await expect.poll(error).toBeLessThan(0.05);
});

test("filtered content changes height without a collapse or final snap", async ({ page }) => {
  const data = await (await page.request.get("/api/requests")).json();
  await page.goto("/requests");
  const swap = page.locator(".content-swap").first();
  await expect(page.locator(".request-card-target")).toHaveCount(data.requests.length);
  const before = await height(swap);
  await page.getByRole("group", { name: "Фильтр заявок" }).getByRole("button", { name: /Готовые/ }).click();
  await twoFrames(page);
  const middle = await height(swap);
  expect(middle).toBeGreaterThan(0);
  expect(middle).toBeLessThan(before);
  await expect(page.locator(".request-card-target")).toHaveCount(data.requests.filter((item) => item.status === "ready").length);
  await expect.poll(async () => Math.abs(await height(swap) - await height(swap.locator(".swap-panel")))).toBeLessThan(0.05);
  const resting = await height(swap);
  await twoFrames(page);
  expect(Math.abs(await height(swap) - resting)).toBeLessThan(0.05);
});

test("disclosures animate both directions and retain keyboard focus", async ({ page }) => {
  await page.goto("/profile");
  const trigger = page.getByRole("button", { name: "Как защищены данные" });
  const body = page.locator(".security-details .disclosure-body");
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect.poll(() => height(body)).toBeGreaterThan(50);
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  expect(await height(body)).toBeGreaterThan(0);
  await expect.poll(() => height(body)).toBeLessThan(0.05);
  await expect(trigger).toBeFocused();
});

test("sheet gestures return or dismiss; isolation lasts through exit", async ({ page }) => {
  await page.goto("/requests");
  await page.getByRole("button", { name: "Новая заявка", exact: true }).click();
  const dialog = page.locator(".modal");
  await expect.poll(async () => Math.abs((await dialog.boundingBox()).y + (await dialog.boundingBox()).height - (page.viewportSize().width <= 720 ? page.viewportSize().height : (page.viewportSize().height + (await dialog.boundingBox()).height) / 2))).toBeLessThan(0.1);
  if (page.viewportSize().width <= 720) {
    const handle = await page.locator(".modal-drag-zone").boundingBox();
    const start = (await dialog.boundingBox()).y;
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
    await page.mouse.down();
    await page.mouse.move(handle.x + handle.width / 2, handle.y + 120, { steps: 12 });
    expect((await dialog.boundingBox()).y).toBeGreaterThan(start + 40);
    await page.mouse.move(handle.x + handle.width / 2, handle.y + 30, { steps: 12 });
    await page.mouse.up();
    await expect.poll(async () => Math.abs((await dialog.boundingBox()).y - start)).toBeLessThan(0.1);
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
    await page.mouse.down();
    await page.mouse.move(handle.x + handle.width / 2, handle.y + 430, { steps: 12 });
    await page.mouse.up();
  } else {
    await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  }
  expect(await page.locator("#root").evaluate((node) => node.inert)).toBe(true);
  await expect(dialog).toHaveCount(0);
  expect(await page.locator("#root").evaluate((node) => node.inert)).toBe(false);
  await expect(page.getByRole("button", { name: "Новая заявка", exact: true })).toBeFocused();
});

test("sending and retry do not claim success or discard form values", async ({ page }) => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let calls = 0;
  await page.route("**/api/requests", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    calls += 1;
    await gate;
    return route.fulfill({ status: 500, json: { message: "Тестовая ошибка отправки" } });
  });
  await page.goto("/requests");
  await page.getByRole("button", { name: "Новая заявка", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('[name="request-type"]').nth(1).check();
  await dialog.getByLabel(/Комментарий/).fill("Не терять при ошибке");
  const submit = dialog.locator(".ss-grip");
  await submit.focus();
  await page.keyboard.press("Enter");
  await expect(dialog.locator(".ss")).toHaveAttribute("aria-busy", "true");
  await expect(dialog.locator(".ss-done .spinner")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Закрыть", exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");
  expect(calls).toBe(1);
  release();
  await expect(submit).toBeEnabled();
  await expect(dialog.getByLabel(/Комментарий/)).toHaveValue("Не терять при ошибке");
  await expect(dialog.locator('[name="request-type"]').nth(1)).toBeChecked();
  await expect(page.getByText("Тестовая ошибка отправки", { exact: true })).toBeVisible();
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => !!document.activeElement.closest('[role="dialog"]'))).toBe(true);
});

test("failed logout restores the button and keeps the cabinet session", async ({ page }) => {
  await page.route("**/api/auth/logout", (route) => route.fulfill({ status: 503, json: { message: "Сервер временно недоступен" } }));
  await page.goto("/profile");
  const button = page.getByRole("button", { name: "Выйти", exact: true });
  await button.click();
  await expect(page.getByText("Не удалось выйти", { exact: true })).toBeVisible();
  await expect(button).toBeEnabled();
  await expect(page).toHaveURL(/\/profile$/);
  expect((await page.request.get("/api/auth/me")).ok()).toBe(true);
});

test("reduced motion also disables local selection and disclosure movement", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/profile");
  await page.getByRole("button", { name: "Как защищены данные" }).click();
  await twoFrames(page);
  const body = page.locator(".security-details .disclosure-body");
  expect(await height(body)).toBeGreaterThan(100);
  const first = await height(body);
  await twoFrames(page);
  expect(await height(body)).toBe(first);
});


test("solid cube rotates behind one fixed initial, pauses and respects reduced motion", async ({ page }) => {
  await page.goto("/");
  const cube = page.locator(".brand-cube");
  const initial = page.locator(".brand-initial");
  await expect(cube).toBeVisible();
  await expect(initial).toHaveCount(1);
  const image = () => cube.evaluate(el => el.toDataURL());
  const resolution = await cube.evaluate(el => el.width / el.getBoundingClientRect().width);
  expect(resolution).toBeGreaterThanOrEqual(3);
  const start = await image();
  await expect.poll(image).not.toBe(start);
  await expect(initial).toHaveCSS("transform", "none");
  const stop = page.getByRole("button", { name: "Остановить вращение логотипа", exact: true });
  await stop.focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Включить вращение логотипа", exact: true })).toBeFocused();
  await twoFrames(page);
  const paused = await image(); await page.waitForTimeout(150);
  expect(await image()).toBe(paused);
  await page.keyboard.press("Enter"); await expect.poll(image).not.toBe(paused);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("button", {name:"Логотип Кампуса, движение отключено",exact:true})).toBeDisabled();
  await twoFrames(page);
  const reduced = await image(); await page.waitForTimeout(150);
  expect(await image()).toBe(reduced);
});
