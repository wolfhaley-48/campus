# Публикация «Кампуса»

## Текущий адрес

**https://finland.meowxd.net:8080**

- HTTPS, сертификат Let's Encrypt для `finland.meowxd.net`.
- Порт 8080, потому что 443 на этом хосте занят VPN-сервисом. Порт открыт в интернет, HTTP на 80 перенаправляет на HTTPS.
- Домен резолвится в IPv4 `37.27.26.18` и IPv6 `2a01:4f9:c014:fbb4::1`. IPv4 проверен напрямую; IPv6 с части сетей недоступен, браузеры используют IPv4 через Happy Eyeballs.
- Доступность проверена через SOCKS-прокси `192.168.1.2:1080`, который использовался для проверки публичной копии. Это не гарантирует доступность из каждого региона РФ; при жалобах проверьте конкретного провайдера.

## Схема

```
браузер
  │ HTTPS :8080
  ▼
nginx (TLS, статика /var/www/campus, proxy /api/)
  │ HTTP 127.0.0.1:5000
  ▼
gunicorn → Flask (backend/app.py)
  │
  ▼
MongoDB 127.0.0.1:27017, база campus_demo
```

Код и окружение: `/home/meow/campus`. Статика собрана в `/home/meow/campus/frontend/dist` и скопирована в `/var/www/campus`, чтобы nginx мог читать её, не открывая домашний каталог.

## Серверные файлы

| Файл | Назначение |
| --- | --- |
| `/etc/systemd/system/campus.service` | gunicorn, пользователь `meow`, 127.0.0.1:5000 |
| `/etc/nginx/sites-available/campus` | HTTP 80 (ACME + редирект), HTTPS 8080, статика и proxy |
| `/etc/nginx/snippets/campus-security-headers.conf` | CSP, HSTS, `X-Frame-Options`, `nosniff` для статики |
| `/etc/letsencrypt/renewal/finland.meowxd.net.conf` | webroot `/var/www/html`, автопродление |
| `/etc/letsencrypt/renewal-hooks/deploy/campus-reload-nginx.sh` | `systemctl reload nginx` после продления |
| `/home/meow/campus/backend/.env` | production-настройки и секреты, права 600 |

Шаблоны лежат в репозитории: [`deploy/campus.service`](../deploy/campus.service), [`deploy/nginx-campus.conf`](../deploy/nginx-campus.conf), [`deploy/campus-security-headers.conf`](../deploy/campus-security-headers.conf).

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
scp -o ProxyCommand='ncat --proxy 192.168.1.2:1080 --proxy-type socks5 %h %p' \
  /tmp/campus-deploy.tar.gz meow@finland.meowxd.net:/tmp/
```

На сервере:

```bash
cd /home/meow/campus
tar -xzf /tmp/campus-deploy.tar.gz
# не запускайте seed.py без необходимости: он удаляет личные задачи и заявки
.venv/bin/pip install -q -r backend/requirements.txt
sudo cp -a frontend/dist/. /var/www/campus/
sudo chown -R root:root /var/www/campus
sudo systemctl restart campus
sudo nginx -t && sudo systemctl reload nginx
curl -s http://127.0.0.1:5000/api/health
curl -sk https://127.0.0.1:8080/api/health
```

Если менялась схема/демо-данные и нужен полный сброс, сначала сделайте дамп базы. `seed.py` удаляет коллекции `campus_demo`, включая `plan_tasks` и заявки.

## База

- `DB_NAME=campus_demo`, MongoDB слушает только `127.0.0.1`.
- Пароли демо-аккаунтов: `anna` / `kampus2026`, `maksim` / `kampus2026`.
- Данные вымышлены. Не добавляйте реальные персональные данные.
- Бэкап: `mongodump --db campus_demo --out /home/meow/backups/campus-$(date +%F)`.

## Сертификат

Certbot использует webroot `/var/www/html`; nginx на 80 отдаёт `/.well-known/acme-challenge/`. Автопродление включено таймером `certbot.timer`.

Проверка:

```bash
sudo certbot certificates --cert-name finland.meowxd.net
sudo systemctl status certbot.timer --no-pager
```

Ручное продление без случайной задержки:

```bash
sudo certbot renew --cert-name finland.meowxd.net --no-random-sleep-on-renew
```

Deploy-hook перезагрузит nginx. При обычном запуске certbot добавляет случайную задержку до ~6 минут — это нормально.

## Переменные production

```dotenv
APP_ENV=production
MONGO_URI=mongodb://127.0.0.1:27017
DB_NAME=campus_demo
JWT_SECRET=<случайная строка 48+ байт>
JWT_TTL_HOURS=12
COOKIE_NAME=campus_session
COOKIE_SECURE=1
FRONTEND_ORIGINS=https://finland.meowxd.net:8080
TRUSTED_HOSTS=finland.meowxd.net:8080,127.0.0.1:5000,127.0.0.1:8080,localhost:5000,localhost:8080
LOGIN_RATE_LIMIT=10
LOGIN_RATE_WINDOW=300
SOCIAL_RATE_LIMIT=30
SOCIAL_RATE_WINDOW=300
TRUST_PROXY=1
ASSISTANT_PROVIDER=auto
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_BASE_URL=https://api.deepseek.com
# DEEPSEEK_API_KEY=<ключ>
ASSISTANT_MODEL=openai
```

`JWT_SECRET` не хранится в репозитории. `COOKIE_SECURE=1` обязателен: без HTTPS браузер не отправит cookie и вход не сработает.

`TRUSTED_HOSTS` одновременно ограничивает Host и служит запасным списком Origin. Не добавляйте туда чужие домены: Flask отклонит запрос с неподходящим Host. Локальные адреса оставлены для health-check и отладки через SSH. Публикация и API проверяются по `https://finland.meowxd.net:8080`; `https://` без порта на этот хост не обслуживается.

## DeepSeek

Основной провайдер — DeepSeek. Публичная копия пока работает без ключа, поэтому `ASSISTANT_PROVIDER=auto` выбирает резервный Pollinations. Чтобы включить DeepSeek:

1. Добавьте `DEEPSEEK_API_KEY=...` в `/home/meow/campus/backend/.env`.
2. При желании поставьте `ASSISTANT_PROVIDER=deepseek`, чтобы отключить резерв.
3. `sudo systemctl restart campus`.
4. Проверьте ответ `POST /api/assistant` под сессией: поле `provider` должно быть `DeepSeek`.

Ключ не логируется и не попадает во фронтенд. Запрос к DeepSeek идёт с сервера, только с данными текущего вымышленного студента.

### OpenCode Zen

Бесплатные модели OpenCode Zen (`deepseek-v4.1-flash-free` и другие) не подключены к Campus. Прямой запрос к `https://opencode.ai/inference/openai/v1/chat/completions` с Chrome-отпечатком (uTLS) и без ключа вернул `429 FreeUsageLimitError` с локальной сети, с VPS и через Hysteria2-выходы в Финляндии (exit `164.5.224.113`) и Нидерландах (exit `217.60.237.121`); условие бесплатного тарифа — использование внутри клиента OpenCode. Для публичного сервера это не подходит. Если появится ключ OpenCode Go или платный ключ, используйте обычный DeepSeek-адаптер с `DEEPSEEK_API_KEY` и `DEEPSEEK_BASE_URL`.

## Проверка публикации

```bash
curl -4 -sI https://finland.meowxd.net:8080/ | head
curl -4 -s https://finland.meowxd.net:8080/api/health
curl -4 -s -o /dev/null -w '%{http_code}\n' https://finland.meowxd.net:8080/schedule
curl -4 -s -o /dev/null -w '%{http_code}\n' https://finland.meowxd.net:8080/api/dashboard
```

Ожидается: HTML 200, health 200, глубокий маршрут SPA 200, API без cookie 401. В ответе входа cookie должна быть `HttpOnly; Secure; SameSite=Lax`.

Внешняя проверка доступности: [check-host.net/check-report/59d2f125ka58](https://check-host.net/check-report/59d2f125ka58) — 10/10 узлов вернули HTTP 200 (проверка 22 ноября 2026). Дополнительно страница и API открывались через SOCKS-прокси, использованный для этой сети.

Изменяющий запрос с чужим `Origin` должен вернуть 403:

```bash
curl -4 -s -o /dev/null -w '%{http_code}\n' \
  -H 'Origin: https://evil.example' -H 'Content-Type: application/json' \
  -d '{"login":"anna","password":"kampus2026"}' \
  https://finland.meowxd.net:8080/api/auth/login
```

## Ограничения

- Порт 8080 в адресе — следствие занятого 443; для конкурса это допустимо, но выглядит менее привычно.
- Лимит входа и помощника хранится в памяти процесса: у каждого gunicorn-воркера свой счётчик. Для демо это осознанное упрощение.
- IPv6-адрес хоста недоступен с проверочной сети; IPv4 работает.
- Firefox и Safari не прогонялись в автоматических тестах; проверен Chromium.
- Внешний помощник зависит от доступности провайдера. При ошибке интерфейс сохраняет запрос и предлагает найти время вручную.
- JWT остаётся stateless: «Выйти» удаляет cookie, но украденный токен живёт до истечения `JWT_TTL_HOURS` (12 часов). Для конкурсного демо это осознанная граница; для реального вуза нужен server-side revoke.
- Rate limit логина, помощника и социальных действий хранится в памяти воркера. При нескольких gunicorn-воркерах лимит умножается на их число; для демо это допустимо.
- Публичная доступность проверена через SOCKS и 10 внешних узлов check-host.net (Европа, Израиль, Иран, Турция, Индонезия): все ответили 200. Это не гарантирует каждого российского провайдера; проверяйте конкретную сеть.
