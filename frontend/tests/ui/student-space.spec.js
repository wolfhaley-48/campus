import { test, expect } from '@playwright/test';

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
  const before=await dock.boundingBox();
  if (!before) {
    await page.getByRole('button',{name:'Открыть панель помощника'}).click();
    await expect(dock).toHaveClass(/is-expanded/);
    await expect.poll(async()=>(await dock.boundingBox()).height).toBeGreaterThan(120);
    await page.getByRole('button',{name:'Свернуть помощника',exact:true}).click();
    await expect(dock).not.toHaveClass(/is-expanded/);
    return;
  }
  await page.getByLabel('Что решаем?').focus();
  await expect(dock).toHaveClass(/is-expanded/);
  await expect.poll(async()=>(await dock.boundingBox()).height).toBeGreaterThan(before.height+50);
  await page.getByRole('button',{name:'Свернуть помощника',exact:true}).click();
  await expect.poll(async()=>(await dock.boundingBox()).height).toBeLessThan(before.height+4);
});
