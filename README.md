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
```

Для Railway с Volume:

```bash
ANALYTICS_PATH=/data/analytics.json
```

## Railway deploy

1. Подключить GitHub repo к Railway.
2. Добавить `OPENAI_API_KEY` в Variables.
3. Добавить `ANALYTICS_PATH=/data/analytics.json`.
4. Подключить Volume с mount path `/data`.
5. Railway выполнит `npm run build` и запустит `npm run start`.

`npm run start` явно слушает `0.0.0.0` и порт из `PORT`, который Railway передаёт контейнеру. Если `PORT` не задан, локальный production-start использует `3000`.

## Данные

- Методики: `data/methods.tsv`
- Чек-лист: `public/checklist-808.png`
- Шрифты PT Root UI: `public/fonts/`
