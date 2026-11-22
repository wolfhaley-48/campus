import { test, expect } from "@playwright/test";

test("chat preserves draft on failure and retries the same send", async ({
  page,
}) => {
  let sent = [];
  let fail = true;
  await page.route("**/api/social/threads/*/messages", (route) => {
    if (route.request().method() !== "POST") return route.continue();
    const data = route.request().postDataJSON();
    sent.push(data);
    return fail
      ? route.fulfill({
          status: 503,
          json: { message: "Проверочная ошибка отправки" },
        })
      : route.fulfill({
          status: 201,
          json: {
            item: {
              id: "ffffffffffffffffffffff01",
              body: data.body,
              createdAt: new Date().toISOString(),
              author: {
                id: "mock",
                fullName: "Анна Смирнова",
                login: "anna",
                group: "ПИ-23-1",
              },
            },
          },
        });
  });
  await page.goto("/social");
  await page
    .getByLabel("Сообщение", { exact: true })
    .fill("Пойдём после пары на настолки?");
  await page.getByRole("button", { name: "Отправить", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Проверочная ошибка отправки",
  );
  await expect(page.getByLabel("Сообщение", { exact: true })).toHaveValue(
    "Пойдём после пары на настолки?",
  );
  fail = false;
  await page.getByRole("button", { name: "Отправить", exact: true }).click();
  await expect(page.getByRole("log")).toContainText(
    "Пойдём после пары на настолки?",
  );
  await expect(page.getByLabel("Сообщение", { exact: true })).toHaveValue("");
  expect(sent).toHaveLength(2);
  expect(sent[0].clientId).toBe(sent[1].clientId);
});

test("wall pages keep unique posts and bound the rendered window", async ({
  page,
}) => {
  await page.route("**/api/social/feed*", (route) => {
    const offset = Number(
      new URL(route.request().url()).searchParams.get("before") || 0,
    );
    return route.fulfill({
      json: {
        items: Array.from({ length: 10 }, (_, i) => ({
          id: String(1000 - offset - i),
          body: `Уникальная новость ${offset + i}`,
          scope: "all",
          createdAt: new Date().toISOString(),
          author: {
            id: "demo",
            fullName: "Демо-редакция",
            login: "demo",
            group: "",
          },
        })),
        hasMore: offset < 80,
        nextCursor: String(offset + 10),
      },
    });
  });
  await page.goto("/");
  await page
    .locator(".news-wall")
    .evaluate((el) => el.scrollIntoView({ block: "start" }));
  await expect
    .poll(() => page.locator(".wall-post").count())
    .toBeGreaterThanOrEqual(10);
  for (let i = 0; i < 7; i++) {
    const last = await page
      .locator(".wall-post")
      .last()
      .getAttribute("data-post");
    await page.locator(".main-inner").evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await expect
      .poll(() => page.locator(".wall-post").last().getAttribute("data-post"))
      .not.toBe(last);
  }
  const ids = await page
    .locator(".wall-post")
    .evaluateAll((els) => els.map((el) => el.dataset.post));
  expect(ids.length).toBeLessThanOrEqual(60);
  expect(new Set(ids).size).toBe(ids.length);
});

test("content ends above the assistant and all social navigation stays visible", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("heading", { name: /что в планах/ }).waitFor();
  const main = await page.locator(".main-inner").boundingBox(),
    dock = await page.locator(".assistant-dock").boundingBox();
  const link = page
    .getByRole("navigation", { name: "Основная навигация" })
    .getByRole("link", { name: "Социалка", exact: true });
  await expect(link).toBeVisible();
  if (dock) expect(main.y + main.height).toBeLessThanOrEqual(dock.y + 1);
  else expect(main.y + main.height).toBeLessThanOrEqual((await link.boundingBox()).y + 1);
  const box = await link.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize().width);
  await link.click();
  await expect(
    page.getByRole("heading", { name: "Социалка", exact: true }),
  ).toBeVisible();
});

test("loading old history keeps messages and incoming posts wait to be read", async ({
  page,
}) => {
  await page.clock.install();
  let incoming = false;
  const reads = [];
  const make = (i) => ({
    id: i.toString(16).padStart(24, "0"),
    body: `История ${i}`,
    author: {
      id: "other",
      fullName: "Одногруппник",
      login: "other",
      group: "ПИ-23-1",
    },
    createdAt: new Date().toISOString(),
  });
  await page.route("**/api/social/threads/*/read", (route) => {
    reads.push(route.request().postDataJSON().lastId);
    return route.fulfill({ json: { ok: true } });
  });
  await page.route("**/api/social/threads/*/messages*", (route) => {
    const query = new URL(route.request().url()).searchParams;
    const after = query.get("after"),
      before = query.get("before");
    if (after)
      return route.fulfill({
        json: {
          items: incoming && parseInt(after, 16) < 131 ? [make(131)] : [],
          hasMore: false,
          nextCursor: null,
        },
      });
    const end = before ? parseInt(before, 16) - 1 : 130;
    const start = Math.max(1, end - 29);
    return route.fulfill({
      json: {
        items: Array.from({ length: end - start + 1 }, (_, i) =>
          make(start + i),
        ),
        hasMore: start > 1,
        nextCursor: start > 1 ? make(start).id : null,
      },
    });
  });
  await page.goto("/social");
  await expect(page.locator(".message")).toHaveCount(30);
  for (let i = 0; i < 4; i++) {
    const count = await page.locator(".message").count();
    await page.getByRole("button", { name: "Раньше в чате" }).click();
    await expect
      .poll(() => page.locator(".message").count())
      .toBeGreaterThan(count);
  }
  await expect(page.locator(".message")).toHaveCount(130);
  await page.locator(".messages").evaluate((el) => {
    el.scrollTop = 0;
  });
  incoming = true;
  await page.clock.fastForward(5100);
  await expect(page.locator(".message")).toHaveCount(131);
  await expect(page.locator(".messages")).toContainText("История 1");
  expect(reads).not.toContain(make(131).id);
  await page.getByRole("button", { name: "К новым сообщениям ↓" }).click();
  await expect.poll(() => reads.includes(make(131).id)).toBe(true);
});
