# Публикация «Кампуса»

## Текущий адрес

**https://campus.mxd.wtf**

- HTTPS на стандартном порту 443; сертификат Let's Encrypt для `campus.mxd.wtf` действует до **20 февраля 2027** и продлевается `certbot.timer`.
- DNS A-запись ведёт на `48.102.138.148`. Это отдельный VPS, а не прежний хост с VPN на 443.
- HTTP на 80 отвечает редиректом на HTTPS; `/.well-known/acme-challenge/` остаётся доступным для продления.
- Прежняя копия **https://finland.meowxd.net:8080** оставлена как резерв. Она не является основным адресом для конкурса.

## Схема

```
браузер
  │ HTTPS :443
  ▼
nginx (TLS, статика /var/www/campus, proxy /api/)
  │ HTTP 127.0.0.1:5000
  ▼
gunicorn → Flask (backend/app.py)
  │
  ▼
MongoDB 127.0.0.1:27017, база campus_demo
```

Код и окружение: `/opt/campus`. Статика собирается Vite в `/opt/campus/frontend/dist` и копируется в `/var/www/campus`, чтобы nginx не открывал каталог приложения. Gunicorn работает от пользователя `campus`.

## Серверные файлы

| Файл | Назначение |
| --- | --- |
| `/etc/systemd/system/campus.service` | gunicorn, пользователь `campus`, 127.0.0.1:5000 |
| `/etc/nginx/sites-available/campus` | HTTP 80 (ACME + редирект), HTTPS 443, статика и proxy |
| `/etc/nginx/snippets/campus-security-headers.conf` | CSP, HSTS, `X-Frame-Options`, `nosniff` для статики |
| `/etc/letsencrypt/live/campus.mxd.wtf/` | сертификат и ключ |
| `/etc/letsencrypt/renewal-hooks/deploy/campus-reload-nginx.sh` | перезагрузка nginx после продления |
| `/opt/campus/backend/.env` | production-настройки и секреты, права 600 |

Шаблоны в репозитории: [`deploy/campus-mxd.service`](../deploy/campus-mxd.service), [`deploy/nginx-campus-mxd.conf`](../deploy/nginx-campus-mxd.conf), [`deploy/campus-security-headers.conf`](../deploy/campus-security-headers.conf), [`deploy/campus-reload-nginx.sh`](../deploy/campus-reload-nginx.sh).

## Обновление кода

С локальной машины:

```bash
cd frontend
npm ci
npm test
npm run build

cd ..
tar -czf /tmp/campus-deploy.tar.gz \
  --exclude='backend/.venv' --exclude='backend/__pycache__' --exclude='backend/.env' \
  backend frontend/dist
scp /tmp/campus-deploy.tar.gz root@48.102.138.148:/tmp/
```

На сервере:

```bash
cd /opt/campus
tar -xzf /tmp/campus-deploy.tar.gz
# не запускайте seed.py без необходимости: он удаляет личные задачи и заявки
/opt/campus/.venv/bin/pip install -q -r backend/requirements.txt
rm -rf /var/www/campus/*
cp -a frontend/dist/. /var/www/campus/
chown -R root:root /var/www/campus
chmod -R a+rX /var/www/campus
systemctl restart campus
nginx -t && systemctl reload nginx
curl -s http://127.0.0.1:5000/api/health
curl -s https://campus.mxd.wtf/api/health
```

Если менялась схема/демо-данные и нужен полный сброс, сначала сделайте дамп базы. `seed.py` удаляет коллекции `campus_demo`, включая `plan_tasks` и заявки.

## База

- `DB_NAME=campus_demo`, MongoDB слушает только `127.0.0.1`.
- Пароли демо-аккаунтов: `anna` / `kampus2026`, `maksim` / `kampus2026`.
- Данные вымышлены. Не добавляйте реальные персональные данные.
- Бэкап: `mongodump --db campus_demo --out /root/backups/campus-$(date +%F)`.

## Сертификат

Certbot использует webroot `/var/www/html`; nginx на 80 отдаёт `/.well-known/acme-challenge/`. Автопродление включено таймером `certbot.timer`, deploy-hook перезагружает nginx.

Проверка:

```bash
certbot certificates --cert-name campus.mxd.wtf
systemctl status certbot.timer --no-pager
```

Ручное продление без случайной задержки:

```bash
certbot renew --cert-name campus.mxd.wtf --no-random-sleep-on-renew
```

При обычном запуске certbot добавляет случайную задержку до ~6 минут — это нормально.

## Переменные production

```dotenv
APP_ENV=production
MONGO_URI=mongodb://127.0.0.1:27017
DB_NAME=campus_demo
JWT_SECRET=<случайная строка 48+ байт>
JWT_TTL_HOURS=12
COOKIE_NAME=campus_session
COOKIE_SECURE=1
FRONTEND_ORIGINS=https://campus.mxd.wtf
TRUSTED_HOSTS=campus.mxd.wtf,127.0.0.1:5000,localhost:5000
LOGIN_RATE_LIMIT=10
LOGIN_RATE_WINDOW=300
SOCIAL_RATE_LIMIT=30
SOCIAL_RATE_WINDOW=300
TRUST_PROXY=1
ASSISTANT_PROVIDER=auto
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_BASE_URL=https://api.deepseek.com
# DEEPSEEK_API_KEY=<ключ>
OPENROUTER_MODEL=nvidia/nemotron-3-ultra-550b-a55b:free
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_SITE_URL=https://campus.mxd.wtf
OPENROUTER_APP_NAME=Campus demo
# OPENROUTER_API_KEY=<ключ>
ASSISTANT_MODEL=openai
```

`JWT_SECRET` не хранится в репозитории. `COOKIE_SECURE=1` обязателен: без HTTPS браузер не отправит cookie и вход не сработает. `TRUSTED_HOSTS` одновременно ограничивает Host и служит запасным списком Origin; не добавляйте туда чужие домены.

## DeepSeek, OpenRouter и Pollinations

`ASSISTANT_PROVIDER=auto` выбирает DeepSeek при заданном `DEEPSEEK_API_KEY`, затем OpenRouter при заданном `OPENROUTER_API_KEY`, иначе Pollinations. Принудительный `deepseek` или `openrouter` без ключа возвращает 503 с понятным сообщением.

Основная копия использует OpenRouter с бесплатной моделью `nvidia/nemotron-3-ultra-550b-a55b:free`. Живой ответ проверен 22 ноября 2026 и вернул `provider: OpenRouter`; ключ хранится только в `/opt/campus/backend/.env`, не в Git и не во фронтенде. Запрос идёт с сервера и содержит только данные текущего вымышленного студента; личные сообщения не передаются.

Для этой reasoning-модели задан `max_tokens=4096`. При меньшем лимите JSON-ответ обрезался, `auto` уходил в резервный Pollinations. Если модель отвечает `429` или другой ошибкой, `auto` делает одну попытку Pollinations и честно возвращает `provider: Pollinations`; это видно в интерфейсе и ответе API.

Чтобы включить DeepSeek:

1. Добавьте `DEEPSEEK_API_KEY=...` в `/opt/campus/backend/.env`.
2. При желании поставьте `ASSISTANT_PROVIDER=deepseek`, чтобы отключить резерв.
3. `systemctl restart campus`.
4. Проверьте `POST /api/assistant` под сессией: поле `provider` должно быть `DeepSeek`.

Для OpenRouter ключ и модель задаются в `/opt/campus/backend/.env`:

```bash
OPENROUTER_API_KEY=<ключ>
OPENROUTER_MODEL=nvidia/nemotron-3-ultra-550b-a55b:free
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_SITE_URL=https://campus.mxd.wtf
OPENROUTER_APP_NAME=Campus demo
```

### OpenCode Zen

Бесплатные модели OpenCode Zen (`deepseek-v4.1-flash-free` и другие) не подключены к Campus. Прямой запрос к `https://opencode.ai/inference/openai/v1/chat/completions` с Chrome-отпечатком (uTLS) и без ключа вернул `429 FreeUsageLimitError` с локальной сети, с VPS и через Hysteria2-выходы в Финляндии и Нидерландах; условие бесплатного тарифа — использование внутри клиента OpenCode. Для публичного сервера это не подходит. Если появится ключ OpenCode Go или платный ключ, используйте обычный DeepSeek-адаптер с `DEEPSEEK_API_KEY` и `DEEPSEEK_BASE_URL`.

## Проверка публикации

```bash
curl -4 -sI https://campus.mxd.wtf/ | head
curl -4 -s https://campus.mxd.wtf/api/health
curl -4 -s -o /dev/null -w '%{http_code}\n' https://campus.mxd.wtf/schedule
curl -4 -s -o /dev/null -w '%{http_code}\n' https://campus.mxd.wtf/api/dashboard
```

Ожидается: HTML 200, health 200, глубокий маршрут SPA 200, API без cookie 401. В ответе входа cookie должна быть `HttpOnly; Secure; SameSite=Lax`.

Проверка входа и cookie:

```bash
curl -sS -D - -o /dev/null \
  -H 'Origin: https://campus.mxd.wtf' -H 'Content-Type: application/json' \
  -d '{"login":"anna","password":"kampus2026"}' \
  https://campus.mxd.wtf/api/auth/login | grep -i '^set-cookie:'
```

Изменяющий запрос с чужим `Origin` должен вернуть 403:

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  -H 'Origin: https://evil.example' -H 'Content-Type: application/json' \
  -d '{"login":"anna","password":"kampus2026"}' \
  https://campus.mxd.wtf/api/auth/login
```

Проверка живого помощника (после входа; cookie в `cookies.txt`):

```bash
curl -sS -b cookies.txt \
  -H 'Origin: https://campus.mxd.wtf' -H 'Content-Type: application/json' \
  -d '{"query":"Что у меня сегодня и что важно не забыть?"}' \
  https://campus.mxd.wtf/api/assistant
```

Поле `provider` должно быть `OpenRouter`; при лимите бесплатной модели допустим честный `Pollinations`.

## Старый резервный адрес

`https://finland.meowxd.net:8080` обслуживается отдельным VPS с путями `/home/meow/campus` и nginx на 8080. Сертификат действует до 20 февраля 2027. Этот адрес оставлен на время конкурса как резервная копия; обновления и проверки основного продукта выполняются на `campus.mxd.wtf`.
