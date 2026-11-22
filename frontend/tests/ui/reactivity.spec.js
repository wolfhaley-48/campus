import { test, expect } from "@playwright/test";

test("whole surfaces and neighbours move while hover targets stay fixed", async ({
  page,
}) => {
  await page.goto("/");
  const target = page.locator(".home-plan-target");
  await target.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(500);
  const surface = target.locator(".reactive-surface");
  const before = await target.boundingBox();
  const surfaceBefore = await surface.boundingBox();
  await page.mouse.move(before.x + 3, before.y + before.height / 2);
  await expect
    .poll(() => surface.evaluate((el) => getComputedStyle(el).transform))
    .not.toBe("none");
  await page.waitForTimeout(350);
  const after = await target.boundingBox();
  const surfaceAfter = await surface.boundingBox();
  for (const key of ["x", "y", "width", "height"])
    expect(Math.abs(after[key] - before[key])).toBeLessThan(0.1);
  expect(Math.abs(surfaceAfter.y - surfaceBefore.y)).toBeGreaterThan(1);
  expect(await target.evaluate((el) => el.matches(":hover"))).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(surface).toHaveCSS("transform", "none");
});

test("overall average sticker stays pinned when semesters change", async ({
  page,
}) => {
  await page.goto("/grades");
  const sticker = page.getByRole("complementary", {
    name: "Средний балл за всё обучение",
  });
  await expect(sticker).toBeVisible();
  const before = await sticker.innerText();
  await page
    .getByRole("group", { name: "Семестр", exact: true })
    .getByRole("button", { name: "1 семестр", exact: true })
    .click();
  await expect(sticker).toHaveText(before, { useInnerText: true });
  await page
    .getByRole("group", { name: "Семестр", exact: true })
    .getByRole("button", { name: "4 семестр", exact: true })
    .click();
  await expect(sticker).toHaveText(before, { useInnerText: true });
});

test("schedule streams in both directions without unbounded DOM growth", async ({
  page,
}) => {
  await page.goto("/schedule");
  await page.getByRole("button", { name: "Вся неделя", exact: true }).click();
  const rail = page.getByRole("region", {
    name: "Расписание на неделю",
    exact: true,
  });
  await expect
    .poll(() => rail.locator("[data-date]").count())
    .toBeGreaterThanOrEqual(14);
  const lastDate = () =>
    rail.locator("[data-date]").last().getAttribute("data-date");
  for (let i = 0; i < 5; i++) {
    const before = await lastDate();
    await rail.evaluate((el) => {
      el.scrollLeft = el.scrollWidth;
    });
    await expect.poll(async () => String(await lastDate()) > before).toBe(true);
    expect(await rail.locator("[data-date]").count()).toBeLessThanOrEqual(35);
  }
  const first = await rail
    .locator("[data-date]")
    .first()
    .getAttribute("data-date");
  await rail.evaluate((el) => {
    el.scrollLeft = 0;
  });
  await expect
    .poll(
      async () =>
        String(
          await rail.locator("[data-date]").first().getAttribute("data-date"),
        ) < first,
    )
    .toBe(true);
  const dates = await rail
    .locator("[data-date]")
    .evaluateAll((els) => els.map((el) => el.dataset.date));
  expect(new Set(dates).size).toBe(dates.length);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("schedule load failure preserves days and retries", async ({ page }) => {
  await page.route("**/api/schedule?week=-1", (route) =>
    route.fulfill({
      status: 503,
      json: { message: "Проверочная ошибка загрузки" },
    }),
  );
  await page.goto("/schedule");
  await page.getByRole("button", { name: "Вся неделя", exact: true }).click();
  await expect(page.getByText("Проверочная ошибка загрузки")).toBeVisible();
  expect(await page.locator("[data-date]").count()).toBeGreaterThanOrEqual(7);
  await page.unroute("**/api/schedule?week=-1");
  await page
    .getByRole("button", { name: "Повторить загрузку", exact: true })
    .click();
  await expect(page.getByText("Проверочная ошибка загрузки")).toHaveCount(0);
  await expect
    .poll(() => page.locator("[data-date]").count())
    .toBeGreaterThanOrEqual(14);
});

test("route chunks load when the page is opened", async ({ page }) => {
  const chunks = [];
  page.on("request", (request) => {
    if (request.resourceType() === "script") chunks.push(request.url());
  });
  await page.goto("/");
  await page.getByRole("heading", { name: /что в планах/ }).waitFor();
  const gradeChunk = (url) =>
    /\/(assets\/Grades-[^/?]+\.js|src\/pages\/Grades\.jsx)/.test(url);
  expect(chunks.some(gradeChunk)).toBe(false);
  await page.getByRole("link", { name: "Успеваемость", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Успеваемость", exact: true }),
  ).toBeVisible();
  expect(chunks.some(gradeChunk)).toBe(true);
});
