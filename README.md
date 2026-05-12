# 808 Демок MVP 3

Next.js App Router сайт для сценария "Подобрать сценарий перезапуска".

## Локальный запуск

```bash
npm install
cp .env.example .env.local
npm run dev
```

Локальный dev-сервер откроется на `http://localhost:3000`.

`OPENAI_API_KEY` нужен только для реальной генерации ответа. Без ключа сайт всё равно билдится и запускается, но `/api/restart` вернёт безопасную ошибку.

## Переменные окружения

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
METHODS_TSV_PATH=data/methods.tsv
CHECKLIST_FILE_PATH=public/checklist-808.png
ANALYTICS_PATH=data/analytics.json
USERS_PATH=data/users.json
ADMIN_LOGIN=
ADMIN_PASSWORD=
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

`NEXT_PUBLIC_SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` нужны серверу для Magic Link входа через Supabase Auth.
`NEXT_PUBLIC_SITE_URL` фиксирует публичный домен для magic link redirect в production, например `https://808-demos.up.railway.app`. Локально можно оставить пустым, тогда будет использован `http://localhost:3000`.

Для Railway с Volume:

```bash
RAILWAY_VOLUME_MOUNT_PATH=/data
```

`RAILWAY_VOLUME_MOUNT_PATH` Railway добавляет автоматически, когда Volume attached к сервису. Если эта переменная есть, сайт сам пишет аналитику в `${RAILWAY_VOLUME_MOUNT_PATH}/analytics.json`. `ANALYTICS_PATH` можно не задавать. Если обе переменные заданы, Railway Volume имеет приоритет.
Профили пользователей пишутся в `${RAILWAY_VOLUME_MOUNT_PATH}/users.json`. Локально используется `USERS_PATH` или `data/users.json`.

## Railway deploy

1. Подключить GitHub repo к Railway.
2. Добавить `OPENAI_API_KEY` в Variables.
3. Добавить `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. В Supabase Auth URL Configuration добавить callback URL: `https://<railway-domain>/auth/confirm`.
5. Подключить Volume с mount path `/data`.
6. Railway выполнит `npm run build` и запустит production-сервер.

Production-start явно слушает `0.0.0.0` и порт из `PORT`, который Railway передаёт контейнеру. Если `PORT` не задан, локальный `npm run start` использует `3000`.

## Supabase Auth

Чтобы пользователи из сетей, где `*.supabase.co` недоступен, могли войти без VPN, браузер обращается только к сайту на Railway. Форма входа отправляет email в `/api/auth/magic-link`, а письмо должно вести на `/auth/confirm`.

Для админского доступа в MVP есть локальная cookie-сессия через `/api/auth/admin-login`. Она не создаёт пользователя в Supabase и нужна только для ручной проверки закрытых разделов. Логин и пароль задаются через `ADMIN_LOGIN` и `ADMIN_PASSWORD`.

В Supabase Auth Email Template для Magic Link используй ссылку:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Войти в 808 Демок</a>
```

Не используй `{{ .ConfirmationURL }}` для основного потока: такая ссылка ведёт через Supabase-домен.

## Данные

- Методики: `data/methods.tsv`
- Чек-лист: `public/checklist-808.png`
- Профили пользователей: `data/users.json` локально или `${RAILWAY_VOLUME_MOUNT_PATH}/users.json` на Railway
- Шрифты PT Root UI: `public/fonts/`
