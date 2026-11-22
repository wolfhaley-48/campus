import { test, expect } from "@playwright/test";

async function fits(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test.beforeEach(async ({ page, baseURL }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== new URL(baseURL).origin) {
      errors.push(`External request: ${request.url()}`);
    }
  });
  page.__errors = errors;
});

test.afterEach(async ({ page }) => {
  expect(page.__errors).toEqual([]);
});

test("login: demo selection, password visibility, error and sign-in", async ({ page, context }) => {
  await context.clearCookies();
  await page.goto("/login");
  await page.getByRole("button", { name: /Анна Смирнова/ }).click();
  await expect(page.getByLabel("Логин", { exact: true })).toHaveValue("anna");
  await page.getByRole("button", { name: "Показать пароль" }).click();
  await expect(page.locator('[name="password"]')).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Скрыть пароль" }).click();
  await fits(page);
  await page.route("**/api/auth/login", (route) => route.fulfill({
    status: 401, json: { message: "Неверный логин или пароль" },
  }));
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Неверный логин или пароль");
  await page.unroute("**/api/auth/login");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page.getByRole("heading", { name: /что в планах/ })).toBeVisible();
  const data = await (await page.request.get("/api/notifications")).json();
  if (data.unread > 0) await expect(page.locator(".header-badge")).toHaveText(data.unread > 9 ? "9+" : String(data.unread));
});

test("responsive navigation, local assets and SPA navigation on every screen", async ({ page }) => {
  // Chromium may return a Promise here. Returning it from a React effect
  // used to crash the entire cabinet on the very first tab change.
  await page.addInitScript(() => {
    const scrollTo = window.scrollTo.bind(window);
    window.scrollTo = (...args) => { scrollTo(...args); return Promise.resolve(); };
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /что в планах/ })).toBeVisible();
  await page.evaluate(() => { window.__spaMarker = "kept"; });
  const nav = page.getByRole("navigation", { name: "Основная навигация" });
  for (const [label, title] of [
    ["Расписание", "Расписание"], ["Успеваемость", "Успеваемость"],
    ["Заявки", "Заявки и справки"], ["Уведомления", "Уведомления"], ["Социалка", "Социалка"], ["Главная", /что в планах/],
  ]) {
    await nav.getByRole("link", { name: label }).click();
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(nav.locator('[aria-current="page"]')).toContainText(label);
    expect(await page.evaluate(() => window.__spaMarker)).toBe("kept");
    await fits(page);
  }
  const links = await nav.locator("a").evaluateAll(nodes => nodes.map(node => {
    const r = node.getBoundingClientRect();
    return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight;
  }));
  expect(links).toEqual([true, true, true, true, true, true]);
  await page.getByRole("link", { name: "Профиль", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Профиль", exact: true })).toBeVisible();
  await fits(page);
  await page.goto("/missing");
  await expect(page.getByRole("heading", { name: /Страница не найдена/ })).toBeVisible();
  await fits(page);
});

test("schedule: day, week, changes and week navigation", async ({ page }) => {
  await page.goto("/schedule");
  await expect(page.locator(".day-chip")).toHaveCount(7);
  const sunday = page.locator(".day-chip").last();
  await sunday.click();
  await expect(page.getByText("Занятий нет", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", {name:"Найти время для своих дел",exact:true})).toHaveAttribute("href","/plan");
  await page.getByRole("button", { name: "Вся неделя", exact: true }).click();
  await expect.poll(() => page.locator(".week-day").count()).toBeGreaterThanOrEqual(7);
  await expect(page.locator(".change-note").first()).toBeVisible();
  await fits(page);
  const currentRange = await page.locator(".week-nav-label").textContent();
  await page.getByRole("button", { name: "Следующая неделя" }).click();
  await expect(page.locator(".week-nav-label")).not.toHaveText(currentRange);
  await page.getByRole("button", { name: "Эта неделя", exact: true }).click();
  await expect(page.locator(".week-nav-label")).toHaveText(currentRange);
  await page.getByRole("button", { name: "По дням", exact: true }).click();
  await expect(page.getByRole("group", { name: "День недели" }).getByRole("button", { pressed: true })).toHaveAccessibleName(/Воскресенье/);
  await page.locator(".day-chip").nth(3).click();
  await expect(page.locator(".sched-lesson-wide").first()).toBeVisible();
});

test("grades: switching semesters and the empty register", async ({ page }) => {
  await page.goto("/grades");
  const semesters = page.getByRole("group", { name: "Семестр", exact: true });
  await semesters.getByRole("button", { name: "4 семестр" }).click();
  await expect(semesters.getByRole("button", { name: "4 семестр" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".grade-date")).toHaveCount(0);
  await expect(page.locator(".grade-chip").first()).toBeVisible();
  await semesters.getByRole("button", { name: "5 семестр" }).click();
  await expect(page.locator(".grade-date").first()).toBeVisible();
  await fits(page);
  await page.route("**/api/grades", (route) => route.fulfill({ json: { semesters: [], summary: null } }));
  await page.reload();
  await expect(page.getByText("Оценок пока нет", { exact: true })).toBeVisible();
  await fits(page);
});

test("request dialog: keyboard radios, focus trap, escape, backdrop and history", async ({ page }) => {
  await page.goto("/requests");
  const opener = page.getByRole("button", { name: "Новая заявка", exact: true });
  await opener.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeFocused();
  await expect(dialog.locator('input[name="request-type"]')).toHaveCount(6);
  const first = dialog.locator('input[name="request-type"]').first();
  await first.focus();
  await page.keyboard.press("ArrowDown");
  await expect(dialog.locator('input[name="request-type"]').nth(1)).toBeChecked();
  for (let index = 0; index < 18; index++) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => !!document.activeElement.closest('[role="dialog"]'))).toBe(true);
  }
  await expect.poll(async () => {
    const footer = await dialog.locator(".modal-foot").boundingBox();
    return footer.y + footer.height;
  }).toBeLessThanOrEqual(801);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  await opener.click();
  await expect(dialog).toBeVisible();
  await page.mouse.click(3, 3);
  await expect(dialog).toHaveCount(0);
  await page.getByRole("link", { name: "Главная", exact: true }).click();
  await page.getByRole("link", { name: "Новая заявка", exact: true }).click();
  await expect(dialog).toBeVisible();
  await page.goBack();
  await expect(dialog).toHaveCount(0);
  await fits(page);
});

test("request submission through the slider, without changing the demo database", async ({ page }) => {
  let payload;
  const created = {
    id: "000000000000000000000001", number: "ТЕСТ-2026-0001", typeLabel: "Справка для военкомата",
    status: "submitted", statusLabel: "Подана", statusStep: 0, delivery: "paper",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    comment: "Проверка интерфейса", timeline: [{ status: "submitted", label: "Заявка подана", at: new Date().toISOString() }],
  };
  await page.route("**/api/requests", (route) => {
    if (route.request().method() !== "POST") return route.continue();
    payload = route.request().postDataJSON();
    return route.fulfill({ status: 201, json: { request: created } });
  });
  await page.route(`**/api/requests/${created.id}`, (route) => route.fulfill({ json: { request: created } }));
  await page.goto("/requests?new=1");
  const dialog = page.getByRole("dialog");
  const selected = dialog.locator('input[name="request-type"]').nth(1);
  await selected.check();
  const type = await selected.inputValue();
  await dialog.getByLabel("Бумажный оригинал в деканате", { exact: true }).check();
  await dialog.getByLabel(/Комментарий/).fill(created.comment);
  const track = await dialog.locator(".ss-track").boundingBox();
  await page.mouse.move(track.x + 28, track.y + track.height / 2);
  await page.mouse.down();
  await page.mouse.move(track.x + track.width - 28, track.y + track.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect(page).toHaveURL(new RegExp(`/requests/${created.id}$`));
  await expect(page.locator(".request-comment")).toContainText(created.comment);
  expect(payload).toEqual({ type, delivery: "paper", comment: created.comment });
  await fits(page);
});

test("notifications: category filters, mark one and mark all", async ({ page }) => {
  const response = await page.request.get("/api/notifications");
  const data = await response.json();
  data.notifications.forEach((item) => { item.isRead = false; });
  await page.route("**/api/notifications**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === "POST") {
      if (path.endsWith("read-all")) data.notifications.forEach((item) => { item.isRead = true; });
      else data.notifications.find((item) => path.includes(item.id)).isRead = true;
    }
    data.unread = data.notifications.filter((item) => !item.isRead).length;
    return route.fulfill({ json: data });
  });
  await page.goto("/notifications");
  await expect(page.locator(".notification-card-target")).toHaveCount(data.notifications.length);
  await page.locator(".notification-card-target").first().click();
  await expect(page.locator('.notification-card-target[data-unread="true"]')).toHaveCount(data.notifications.length - 1);
  await page.getByRole("group", { name: "Категории уведомлений" }).getByRole("button", { name: /Деканат/ }).click();
  await expect(page.locator(".notification-card-target")).toHaveCount(data.notifications.filter((item) => item.category === "dean").length);
  await page.getByRole("button", { name: "Прочитать все" }).click();
  await expect(page.getByRole("button", { name: "Прочитать все" })).toBeDisabled();
  await expect(page.locator(".header-badge")).toHaveCount(0);
  await fits(page);
});

test("loading, request failure and retry", async ({ page }) => {
  const response = await page.request.get("/api/dashboard");
  const data = await response.json();
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let fail = true;
  await page.route("**/api/dashboard", async (route) => {
    await gate;
    return route.fulfill(fail ? { status: 500, json: { message: "Test failure" } } : { json: data });
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[aria-busy="true"]')).toBeVisible();
  await fits(page);
  release();
  await expect(page.getByRole("alert")).toContainText("Не удалось загрузить данные");
  fail = false;
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(page.getByRole("heading", { name: /что в планах/ })).toBeVisible();
  await fits(page);
});

test("navigation without View Transitions and with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    document.startViewTransition = () => { throw new Error("Transitions must not run with reduced motion"); };
  });
  await page.goto("/");
  await page.getByRole("link", { name: "Расписание", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Расписание", exact: true })).toBeVisible();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate(() => { document.startViewTransition = undefined; });
  await page.getByRole("link", { name: "Успеваемость", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Успеваемость", exact: true })).toBeVisible();
  await fits(page);
});

test("a render failure shows recovery actions rather than a blank screen", async ({ page }) => {
  await page.route("**/api/dashboard", (route) => route.fulfill({ json: {} }));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Не удалось открыть страницу" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Обновить", exact: true })).toBeVisible();
  await fits(page);
  await page.unroute("**/api/dashboard");
  await page.getByRole("link", { name: "На главную", exact: true }).click();
  await expect(page.getByRole("heading", { name: /что в планах/ })).toBeVisible();
});

test("student isolation and logout", async ({ page, browser, baseURL }) => {
  const response = await page.request.get("/api/requests");
  const anna = await response.json();
  const id = anna.requests[0].id;
  const context = await browser.newContext({ baseURL, storageState: ".playwright/maksim.json", viewport: page.viewportSize() });
  const other = await context.newPage();
  const foreign = await context.request.get(`/api/requests/${id}`);
  expect(foreign.status()).toBe(404);
  await other.goto(`/requests/${id}`);
  await expect(other.getByText("Заявка не найдена", { exact: true })).toBeVisible();
  await other.getByRole("link", { name: "Профиль", exact: true }).click();
  await expect(other.locator(".profile-page")).toContainText("Орлов Максим");
  await expect(other.locator(".profile-page")).not.toContainText("Смирнова Анна");
  await other.getByRole("button", { name: "Выйти", exact: true }).click();
  await expect(other.getByRole("heading", { name: "Вход в кабинет" })).toBeVisible();
  expect((await context.request.get("/api/dashboard")).status()).toBe(401);
  await context.close();
});
