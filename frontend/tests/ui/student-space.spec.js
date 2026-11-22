import { test, expect } from '@playwright/test';

test('assistant keyboard focus follows opening and dismissal without losing the draft', async ({page}) => {
  await page.goto('/');
  const dock = page.locator('.assistant-dock');
  const input = page.getByLabel('Что решаем?');
  const opener = page.getByRole('button',{name:'Открыть панель помощника',exact:true});
  await expect(opener).toBeVisible();
  await expect(dock).not.toBeVisible();
  const launcherBox = await opener.boundingBox();
  expect(launcherBox.width).toBeLessThanOrEqual(56);
  expect(launcherBox.height).toBeLessThanOrEqual(56);
  const cube = opener.locator('.brand-cube');
  const image = await cube.evaluate(el => el.toDataURL());
  await page.waitForTimeout(150);
  expect(await cube.evaluate(el => el.toDataURL())).toBe(image);
  await opener.focus();
  await page.keyboard.press('Enter');
  await expect(input).toBeFocused();
  await input.fill('Сохранённый черновик');
  await page.getByRole('button', {name:'Свернуть помощника',exact:true}).focus();
  await page.keyboard.press('Enter');
  await expect(opener).toBeFocused();
  await expect(opener).toHaveAttribute('aria-expanded','false');
  await page.keyboard.press('Space');
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('Сохранённый черновик');
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();
  await expect(opener).toHaveAttribute('aria-expanded','false');
  await page.keyboard.press('Enter');
  // Escape also dismisses when focus is on a suggestion, not just the textarea.
  await page.getByRole('button', {name:'Что с моей учёбой?',exact:true}).focus();
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();
  await expect(dock).not.toHaveClass(/is-expanded/);
  await page.keyboard.press('Enter');
  let release;
  const gate = new Promise(resolve => {release = resolve;});
  await page.route('**/api/assistant', async route => {
    await gate;
    await route.fulfill({json:{answer:'Ответ для проверки фокуса.',actions:[],provider:'test'}});
  });
  await page.getByRole('button',{name:'Составить план с ИИ'}).click();
  const close = page.getByRole('button',{name:'Свернуть помощника',exact:true});
  await close.focus();
  release();
  await expect(page.getByRole('heading',{name:'От запроса — к действию'})).toBeVisible();
  await expect(close).toBeFocused();
  await expect(input).toHaveValue('Сохранённый черновик');
});

test('assistant keeps the query on failure and offers only returned actions', async ({page}) => {
  await page.route('**/api/assistant', route => route.fulfill({status:503,json:{message:'Помощник временно недоступен'}}));
  await page.goto('/');
  await page.getByRole('button',{name:'Открыть панель помощника'}).click();
  await page.getByRole('button',{name:'Найди 45 минут на подготовку',exact:true}).click();
  await page.getByRole('button',{name:'Составить план с ИИ'}).click();
  await expect(page.getByRole('alert')).toContainText('Помощник временно недоступен');
  await expect(page.getByLabel('Что решаем?')).toHaveValue('Найди 45 минут на подготовку');
  await page.unroute('**/api/assistant');
  await page.route('**/api/assistant', route => route.fulfill({json:{answer:'В расписании есть свободное время. Выбери подходящее окно.',provider:'Pollinations',actions:[{label:'Выбрать время',href:'/plan'}]}}));
  await page.getByRole('button',{name:'Составить план с ИИ'}).click();
  await expect(page.getByRole('heading',{name:'От запроса — к действию'})).toBeVisible();
  await page.getByRole('link',{name:'Выбрать время',exact:true}).click();
  await expect(page).toHaveURL(/\/plan$/);
});

test('personal plan persists and requires confirmation', async ({page}) => {
  const title = `__ui_plan_${Date.now()}`;
  try {
    await page.goto('/plan');
    await page.getByLabel('Что хочешь успеть?').fill(title);
    const slot = page.locator('.plan-slot').first();
    await slot.click();
    await expect(page.locator('.plan-task').filter({hasText:title})).toHaveCount(0);
    await page.getByRole('button',{name:'Добавить в план',exact:true}).click();
    await expect(page.locator('.plan-task').filter({hasText:title})).toBeVisible();
    await page.reload();
    await expect(page.locator('.plan-task').filter({hasText:title})).toBeVisible();
    await page.getByRole('button',{name:`Удалить задачу ${title}`,exact:true}).click();
    await expect(page.locator('.plan-task').filter({hasText:title})).toHaveCount(0);
  } finally {
    const result = await page.request.get('/api/plan');
    for(const task of (await result.json()).tasks || []) if(task.title === title) await page.request.delete(`/api/plan/${task.id}`);
  }
});

test('dock expands reactively and semester history is complete', async ({page}) => {
  await page.goto('/grades');
  const semesters=page.getByRole('group',{name:'Семестр',exact:true});
  await expect(semesters.getByRole('button')).toHaveCount(5);
  await semesters.getByRole('button',{name:'1 семестр',exact:true}).click();
  await expect(semesters.getByRole('button',{name:'1 семестр',exact:true})).toHaveAttribute('aria-pressed','true');
  const dock=page.locator('.assistant-dock');
  await expect(dock).not.toBeVisible();
  const launcher = page.getByRole('button',{name:'Открыть панель помощника',exact:true});
  await launcher.click();
  await expect(dock).toHaveClass(/is-expanded/);
  await expect.poll(async()=>(await dock.boundingBox()).height).toBeGreaterThan(120);
  await expect(page.getByLabel('Что решаем?')).toBeFocused();
  await page.getByRole('button',{name:'Свернуть помощника',exact:true}).click();
  await expect(dock).not.toBeVisible();
  await expect(launcher).toBeFocused();
});
