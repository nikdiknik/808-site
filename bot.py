import asyncio
import json
import logging
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from openai import AsyncOpenAI
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, ReplyKeyboardMarkup, ReplyKeyboardRemove, Update
from telegram.error import TelegramError, TimedOut
from telegram.constants import ChatAction
from telegram.request import HTTPXRequest
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)


_src_analytics = Path(__file__).resolve().parent / "analytics.json"
_dst_analytics = Path("/data/analytics.json")
if _src_analytics.exists() and not _dst_analytics.exists():
    _dst_analytics.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(_src_analytics, _dst_analytics)

logging.basicConfig(
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)


BASE_DIR = Path(__file__).resolve().parent
RESTART_TEXT = "🔄 Начать заново"
CHANNEL_URL = "https://t.me/demos_808"
CHANNEL_USERNAME = "@demos_808"
NEXT_STEP_CALLBACK = "next_step"
CHECK_SUBSCRIPTION_CALLBACK = "check_subscription"
CHECKLIST_CALLBACK = "get_checklist"

EXPERIENCE_OPTIONS = {
    "newbie": "🌱 Новичок (0-2 года)",
    "middle": "🎛️ Миддл (2-5 лет)",
    "advanced": "🚀 Продвинутый (5-7 лет)",
    "pro": "🏆 Профи (7-10 лет)",
}

BLOCK_OPTIONS = {
    "no_idea": "💡 Нет идеи трека",
    "no_structure": "🧩 Есть идея, но нет структуры трека",
    "no_lyrics": "✍️ Нет идей для текста",
    "arrangement": "🎚️ Не получается доделать аранжировку",
    "other": "📝 Другое",
}

SYSTEM_PROMPT = """Ты музыкальный AI-ментор.
Твоя задача:
1. На основе данных о пользователе определить, какая методика из TSV-таблицы подходит ему лучше всего.
2. Объяснить, почему именно она подходит под его ситуацию.
3. Дать конкретные дополнительные советы, которые помогут сдвинуться с места.

Отвечай по-русски.
Пиши дружелюбно, предметно и без воды.
Не выдумывай методики, которых нет в TSV-таблице.
Если подходят несколько методик, выбери одну главную и коротко упомяни 1-2 дополнительные как запасной вариант.
Важно: сервиса, который упомянут в таблице, пока нет, поэтому не предлагай им воспользоваться, лучше конкретно опиши, что нужно делать, чтобы методика сработала.
Верни результат строго в JSON без markdown и без пояснений вне JSON.
Используй такую структуру:
{
  "feedback": "короткий разбор ситуации пользователя в 2-4 предложениях",
  "best_method": "название одной лучшей методики",
  "best_method_summary": "краткое описание этой методики в 1 предложении",
  "best_method_example": "очень короткий пример применения методики в 1 предложении",
  "why_it_fits": "объяснение, почему она подходит",
  "action_steps": ["шаг 1", "шаг 2", "шаг 3"],
  "extra_tips": ["совет 1", "совет 2", "совет 3"]
}
"""


def build_restart_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup([[RESTART_TEXT]], resize_keyboard=True)


def build_experience_keyboard() -> InlineKeyboardMarkup:
    buttons = [
        [InlineKeyboardButton(label, callback_data=f"experience:{key}")]
        for key, label in EXPERIENCE_OPTIONS.items()
    ]
    return InlineKeyboardMarkup(buttons)


def build_block_keyboard() -> InlineKeyboardMarkup:
    buttons = [
        [InlineKeyboardButton(label, callback_data=f"block:{key}")]
        for key, label in BLOCK_OPTIONS.items()
    ]
    return InlineKeyboardMarkup(buttons)


def build_channel_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [[InlineKeyboardButton("📢 Подписаться на канал", url=CHANNEL_URL)]]
    )


def build_next_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [[InlineKeyboardButton("➡️ Далее", callback_data=NEXT_STEP_CALLBACK)]]
    )


def build_subscription_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [InlineKeyboardButton("📢 Подписаться на канал", url=CHANNEL_URL)],
            [InlineKeyboardButton("✅ Проверить подписку", callback_data=CHECK_SUBSCRIPTION_CALLBACK)],
        ]
    )


def build_checklist_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [[InlineKeyboardButton("🗂️ Получить чеклист", callback_data=CHECKLIST_CALLBACK)]]
    )


def resolve_project_path(raw_path: str) -> Path:
    path = Path(raw_path)
    return path if path.is_absolute() else BASE_DIR / path


def get_methods_path() -> Path:
    raw_path = os.getenv("TSV_PATH", "Креативные методики MVP - Лист1.tsv")
    if not raw_path:
        raise RuntimeError("Не задана переменная окружения TSV_PATH.")
    methods_path = resolve_project_path(raw_path)
    if not methods_path.exists():
        raise RuntimeError(f"TSV-файл не найден: {methods_path}")
    return methods_path


def get_openai_client() -> AsyncOpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("Не задана переменная окружения OPENAI_API_KEY.")
    return AsyncOpenAI(api_key=api_key)


def get_analytics_path() -> Path:
    raw_path = os.getenv("ANALYTICS_PATH")
    if raw_path:
        return resolve_project_path(raw_path)
    return BASE_DIR / "analytics.json"


def get_checklist_path() -> Path:
    return resolve_project_path(os.getenv("CHECKLIST_PATH", "Чеклист_808.png"))


def load_analytics() -> dict:
    analytics_path = get_analytics_path()
    if not analytics_path.exists():
        return {
            "total_scenario_starts": 0,
            "total_scenario_completions": 0,
            "unique_users": 0,
            "users": {},
        }

    try:
        return json.loads(analytics_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        logger.warning("Could not read analytics file, recreating it")
        return {
            "total_scenario_starts": 0,
            "total_scenario_completions": 0,
            "unique_users": 0,
            "users": {},
        }


def save_analytics(data: dict) -> None:
    analytics_path = get_analytics_path()
    analytics_path.parent.mkdir(parents=True, exist_ok=True)
    analytics_path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def update_user_analytics(user, *, started: bool = False, completed: bool = False) -> None:
    if not user:
        return

    analytics = load_analytics()
    users = analytics.setdefault("users", {})
    user_key = str(user.id)
    now = datetime.now(timezone.utc).isoformat()

    entry = users.setdefault(
        user_key,
        {
            "user_id": user.id,
            "username": user.username or "",
            "full_name": user.full_name,
            "first_seen_at": now,
            "last_seen_at": now,
            "scenario_starts": 0,
            "scenario_completions": 0,
        },
    )

    entry["username"] = user.username or ""
    entry["full_name"] = user.full_name
    entry["last_seen_at"] = now

    if started:
        entry["scenario_starts"] += 1
        analytics["total_scenario_starts"] = analytics.get("total_scenario_starts", 0) + 1

    if completed:
        entry["scenario_completions"] += 1
        analytics["total_scenario_completions"] = analytics.get("total_scenario_completions", 0) + 1

    analytics["unique_users"] = len(users)
    save_analytics(analytics)


def get_user_completion_count(user_id: int) -> int:
    analytics = load_analytics()
    user_stats = analytics.get("users", {}).get(str(user_id), {})
    return int(user_stats.get("scenario_completions", 0))


def format_stats_message() -> str:
    analytics = load_analytics()
    users = list(analytics.get("users", {}).values())
    top_users = sorted(
        users,
        key=lambda item: (
            int(item.get("scenario_starts", 0)),
            int(item.get("scenario_completions", 0)),
        ),
        reverse=True,
    )[:5]

    lines = [
        "📊 Статистика использования",
        "",
        f"👥 Уникальных пользователей: {analytics.get('unique_users', 0)}",
        f"▶️ Всего запусков сценария: {analytics.get('total_scenario_starts', 0)}",
        f"✅ Всего завершений сценария: {analytics.get('total_scenario_completions', 0)}",
    ]

    if top_users:
        lines.append("")
        lines.append("🏅 Топ пользователей по запускам:")
        for index, user in enumerate(top_users, start=1):
            name = user.get("username") or user.get("full_name") or f"id {user.get('user_id')}"
            starts = int(user.get("scenario_starts", 0))
            completions = int(user.get("scenario_completions", 0))
            lines.append(f"{index}. {name} — запусков: {starts}, завершений: {completions}")

    return "\n".join(lines)


def read_methods_text(methods_path: Path) -> str:
    for encoding in ("utf-8", "utf-8-sig", "cp1251", "windows-1251"):
        try:
            text = methods_path.read_text(encoding=encoding).strip()
            if text:
                return text.replace("\t", " | ")[:18000]
        except UnicodeDecodeError:
            continue

    raise RuntimeError("Не удалось прочитать TSV-файл с методиками.")


def extract_json_payload(raw_text: str) -> dict:
    raw_text = raw_text.strip()

    if raw_text.startswith("```"):
        parts = raw_text.split("```")
        if len(parts) >= 3:
            raw_text = parts[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
            raw_text = raw_text.strip()

    try:
        return json.loads(raw_text)
    except json.JSONDecodeError:
        start = raw_text.find("{")
        end = raw_text.rfind("}")
        if start != -1 and end != -1 and start < end:
            return json.loads(raw_text[start : end + 1])
        raise


def normalize_list(value: object) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


def format_bullet_list(items: list[str]) -> str:
    return "\n".join(f"• {item}" for item in items)


def build_result_steps(result: dict) -> list[str]:
    feedback = str(result.get("feedback", "")).strip()
    best_method = str(result.get("best_method", "")).strip()
    best_method_summary = str(result.get("best_method_summary", "")).strip()
    best_method_example = str(result.get("best_method_example", "")).strip()
    why_it_fits = str(result.get("why_it_fits", "")).strip()
    action_steps = normalize_list(result.get("action_steps"))
    extra_tips = normalize_list(result.get("extra_tips"))

    if not all([feedback, best_method, best_method_summary, best_method_example, why_it_fits, action_steps, extra_tips]):
        raise RuntimeError("OpenAI вернул неполный структурированный ответ.")

    return [
        f"🎧 Шаг 1 из 5. Разбор ситуации\n\n{feedback}",
        f"✨ Шаг 2 из 5. Лучшая методика\n\n{best_method}\n\nКратко: {best_method_summary}\n\nПример: {best_method_example}",
        f"🧠 Шаг 3 из 5. Почему она подходит\n\n{why_it_fits}",
        f"🎯 Шаг 4 из 5. Что сделать прямо сейчас\n\n{format_bullet_list(action_steps)}",
        f"🔥 Шаг 5 из 5. Дополнительные советы\n\n{format_bullet_list(extra_tips)}",
    ]


def build_user_prompt(experience: str, block: str) -> str:
    return f"""Вот данные пользователя:
- Опыт в музыке: {experience}
- Этап, где возник ступор: {block}

Используй данные из TSV-таблицы с методиками.
Важно: сервиса, который упомянут в таблице, пока нет, поэтому не предлагай им воспользоваться, лучше конкретно опиши, что нужно делать, чтобы методика сработала.
Сначала дай короткий разбор ситуации пользователя, а затем подбери одну лучшую методику.
Верни только JSON в формате из system prompt.
"""


async def is_user_subscribed(context: ContextTypes.DEFAULT_TYPE, user_id: int) -> bool:
    try:
        member = await context.bot.get_chat_member(chat_id=CHANNEL_USERNAME, user_id=user_id)
    except TelegramError as exc:
        raise RuntimeError("Не удалось проверить подписку на канал.") from exc

    if member.status in {"member", "administrator", "creator"}:
        return True

    if member.status == "restricted" and getattr(member, "is_member", False):
        return True

    return False


async def send_restart_subscription_prompt(message) -> None:
    await reply_text_safely(
        message,
        "Чтобы пройти сценарий ещё раз, сначала подпишись на канал 808 Демок, а потом нажми `Проверить подписку`.",
        reply_markup=build_subscription_keyboard(),
    )


async def answer_callback_safely(query) -> None:
    try:
        await query.answer()
    except TimedOut:
        logger.warning("Callback answer timed out, continuing without ack")
    except TelegramError as exc:
        logger.warning("Could not answer callback query: %s", exc)


async def clear_callback_markup_safely(query) -> None:
    try:
        await query.edit_message_reply_markup(reply_markup=None)
    except TimedOut:
        logger.warning("Editing callback markup timed out, continuing")
    except TelegramError as exc:
        logger.warning("Could not edit callback markup: %s", exc)


async def reply_text_safely(message, text: str, **kwargs):
    last_error = None

    for attempt in range(2):
        try:
            return await message.reply_text(text, **kwargs)
        except TimedOut as exc:
            last_error = exc
            logger.warning("reply_text timed out on attempt %s", attempt + 1)
            if attempt == 0:
                await asyncio.sleep(1)
        except TelegramError:
            raise

    raise last_error or TimedOut("Timed out while sending message")


async def send_chat_action_safely(context: ContextTypes.DEFAULT_TYPE, chat_id: int, action: ChatAction) -> None:
    try:
        await context.bot.send_chat_action(chat_id=chat_id, action=action)
    except TimedOut:
        logger.warning("send_chat_action timed out, continuing")
    except TelegramError as exc:
        logger.warning("Could not send chat action: %s", exc)


async def reply_document_safely(message, document_path: Path, **kwargs):
    last_error = None

    for attempt in range(2):
        try:
            with document_path.open("rb") as document_file:
                return await message.reply_document(document=document_file, **kwargs)
        except TimedOut as exc:
            last_error = exc
            logger.warning("reply_document timed out on attempt %s", attempt + 1)
            if attempt == 0:
                await asyncio.sleep(1)
        except TelegramError:
            raise

    raise last_error or TimedOut("Timed out while sending document")


async def begin_scenario(message, context: ContextTypes.DEFAULT_TYPE, user) -> int:
    context.user_data.clear()
    update_user_analytics(user, started=True)
    context.user_data["flow_state"] = "experience"

    await reply_text_safely(
        message,
        "Привет! 👋 Я помогу подобрать креативную методику, чтобы выйти из ступора при написании трека.\n\n"
        "Как это работает:\n"
        "1. Ты выбираешь свой уровень опыта.\n"
        "2. Выбираешь, на каком этапе застрял.\n"
        "3. Я анализирую твою ситуацию по таблице креативных методик.\n"
        "4. В ответ я отправлю подходящую методику и практические советы.\n\n"
        "🎵 Сначала выбери свой опыт в музыке:",
        reply_markup=build_experience_keyboard(),
    )
    return 0


async def ask_chatgpt(
    context: ContextTypes.DEFAULT_TYPE,
    experience: str,
    block: str,
) -> dict:
    client = get_openai_client()
    methods_path = get_methods_path()
    user_content = [
        {"type": "input_text", "text": build_user_prompt(experience, block)},
        {
            "type": "input_text",
            "text": "Ниже TSV-таблица с методиками для анализа:\n\n"
            + read_methods_text(methods_path),
        },
    ]

    response = await client.responses.create(
        model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
        input=[
            {
                "role": "system",
                "content": [{"type": "input_text", "text": SYSTEM_PROMPT}],
            },
            {
                "role": "user",
                "content": user_content,
            },
        ],
    )

    answer = getattr(response, "output_text", "").strip()
    if answer:
        return extract_json_payload(answer)

    raise RuntimeError("OpenAI вернул пустой ответ.")


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    message = update.effective_message
    user = update.effective_user
    if not message or not user:
        return ConversationHandler.END

    logger.info(
        "Start received | user_id=%s | completions=%s",
        user.id,
        get_user_completion_count(user.id),
    )

    if get_user_completion_count(user.id) > 0:
        try:
            if not await is_user_subscribed(context, user.id):
                logger.info("Restart blocked by subscription check | user_id=%s", user.id)
                context.user_data.clear()
                await send_restart_subscription_prompt(message)
                return 0
        except RuntimeError:
            logger.warning("Subscription check failed on start | user_id=%s", user.id)
            context.user_data.clear()
            await reply_text_safely(
                message,
                "⚠️ Не получилось проверить подписку на канал. Убедись, что бот добавлен в канал и имеет доступ к списку подписчиков.",
                reply_markup=build_channel_keyboard(),
            )
            return 0

    return await begin_scenario(message, context, user)


async def experience_selected(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    if not query:
        return 0

    current_state = context.user_data.get("flow_state")
    if current_state is None:
        logger.info(
            "Recovering experience step from stale button | user_id=%s | data=%s",
            update.effective_user.id if update.effective_user else None,
            query.data,
        )
        context.user_data["flow_state"] = "experience"
    elif current_state != "experience":
        logger.info(
            "Experience click ignored due to state | user_id=%s | state=%s | data=%s",
            update.effective_user.id if update.effective_user else None,
            current_state,
            query.data,
        )
        return 0

    await answer_callback_safely(query)
    experience_key = query.data.split(":", maxsplit=1)[1]
    experience = EXPERIENCE_OPTIONS.get(experience_key)
    if not experience:
        await reply_text_safely(query.message, "⚠️ Не удалось распознать вариант. Попробуй снова через /start.")
        return 0

    logger.info(
        "Experience selected | user_id=%s | experience=%s",
        update.effective_user.id if update.effective_user else None,
        experience_key,
    )
    context.user_data["experience"] = experience
    context.user_data["flow_state"] = "block"
    await reply_text_safely(
        query.message,
        f"Выбранный опыт: {experience}\n\nТеперь выбери этап, на котором случился ступор:",
        reply_markup=build_block_keyboard(),
    )
    return 0


async def block_selected(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    if not query:
        return 0

    current_state = context.user_data.get("flow_state")
    if current_state != "block":
        logger.info(
            "Block click ignored due to state | user_id=%s | state=%s | data=%s",
            update.effective_user.id if update.effective_user else None,
            current_state,
            query.data,
        )
        if current_state is None:
            await answer_callback_safely(query)
            await reply_text_safely(
                query.message,
                "⏳ Этот шаг устарел после перезапуска бота. Нажми `Начать заново` или отправь /start.",
                reply_markup=build_restart_keyboard(),
            )
        return 0

    await answer_callback_safely(query)
    block_key = query.data.split(":", maxsplit=1)[1]
    block_value = BLOCK_OPTIONS.get(block_key)
    if not block_value:
        await reply_text_safely(query.message, "⚠️ Не удалось распознать вариант. Попробуй снова через /start.")
        return 0

    logger.info(
        "Block selected | user_id=%s | block=%s",
        update.effective_user.id if update.effective_user else None,
        block_key,
    )
    if block_key == "other":
        context.user_data["flow_state"] = "other_text"
        await reply_text_safely(
            query.message,
            "📝 Опиши коротко, на каком этапе или в какой проблеме ты застрял:",
            reply_markup=ReplyKeyboardRemove(),
        )
        return 0

    context.user_data["block"] = block_value
    context.user_data["flow_state"] = "generating"
    await generate_and_send_answer(query.message, context)
    return 0


async def other_text_received(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    message = update.effective_message
    if not message or not message.text:
        return 0

    current_state = context.user_data.get("flow_state")
    if current_state != "other_text":
        logger.info(
            "Free text ignored due to state | user_id=%s | state=%s",
            update.effective_user.id if update.effective_user else None,
            current_state,
        )
        if current_state is None:
            await reply_text_safely(
                message,
                "🔄 Похоже, сценарий сбился или уже завершился. Давай начнём заново?",
                reply_markup=build_restart_keyboard(),
            )
        return 0

    logger.info(
        "Other block text received | user_id=%s | text_length=%s",
        update.effective_user.id if update.effective_user else None,
        len(message.text.strip()),
    )
    context.user_data["block"] = f"Другое: {message.text.strip()}"
    context.user_data["flow_state"] = "generating"
    await generate_and_send_answer(message, context)
    return 0


async def generate_and_send_answer(message, context: ContextTypes.DEFAULT_TYPE) -> None:
    experience = context.user_data.get("experience")
    block = context.user_data.get("block")
    if not experience or not block:
        logger.warning("Generation aborted due to missing data | chat_id=%s", message.chat_id)
        await reply_text_safely(message, "⚠️ Не хватило данных для анализа. Запусти сценарий заново через /start.")
        return

    logger.info(
        "Generating answer | chat_id=%s | experience=%s | block=%s",
        message.chat_id,
        experience,
        block[:80],
    )
    await send_chat_action_safely(context, message.chat_id, ChatAction.TYPING)
    await reply_text_safely(message, "⏳ Анализирую ситуацию и подбираю методику...")

    try:
        result = await ask_chatgpt(context, experience, block)
        steps = build_result_steps(result)
        logger.info("Generation completed | chat_id=%s | steps=%s", message.chat_id, len(steps))
    except Exception as exc:
        logger.exception("Failed to get response from OpenAI: %s", exc)
        context.user_data["flow_state"] = None
        await reply_text_safely(
            message,
            "⚠️ Не получилось получить ответ от ChatGPT. Проверь `OPENAI_API_KEY`, `TSV_PATH` и попробуй ещё раз.",
            reply_markup=build_restart_keyboard(),
        )
        return

    context.user_data["result_steps"] = steps
    context.user_data["result_step_index"] = 0
    context.user_data["flow_state"] = "results"

    await reply_text_safely(message, steps[0], reply_markup=build_next_keyboard())


async def show_next_step(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    if not query or not query.message:
        return

    await answer_callback_safely(query)

    if context.user_data.get("flow_state") != "results":
        logger.info(
            "Next step ignored due to state | user_id=%s | state=%s",
            update.effective_user.id if update.effective_user else None,
            context.user_data.get("flow_state"),
        )
        return

    steps = context.user_data.get("result_steps")
    step_index = context.user_data.get("result_step_index", 0)
    if not steps or not isinstance(steps, list):
        logger.warning(
            "Next step requested without results | user_id=%s",
            update.effective_user.id if update.effective_user else None,
        )
        await reply_text_safely(
            query.message,
            "ℹ️ Нет активного результата. Нажми `Начать заново` или отправь /start.",
            reply_markup=build_restart_keyboard(),
        )
        return

    await clear_callback_markup_safely(query)

    next_index = step_index + 1
    context.user_data["result_step_index"] = next_index
    logger.info(
        "Next step requested | user_id=%s | from=%s | to=%s | total=%s",
        update.effective_user.id if update.effective_user else None,
        step_index,
        next_index,
        len(steps),
    )

    if next_index < len(steps):
        reply_markup = build_next_keyboard() if next_index < len(steps) - 1 else None
        await reply_text_safely(query.message, steps[next_index], reply_markup=reply_markup)

    if next_index >= len(steps) - 1:
        logger.info(
            "Scenario completed | user_id=%s",
            update.effective_user.id if update.effective_user else None,
        )
        update_user_analytics(update.effective_user, completed=True)
        await reply_text_safely(
            query.message,
            "🎁 Лови бонус — чеклист прогресса. Поможет довести трек до конца и ничего не упустить",
            reply_markup=build_checklist_keyboard(),
        )
        try:
            subscribed = bool(update.effective_user) and await is_user_subscribed(context, update.effective_user.id)
        except RuntimeError:
            logger.warning(
                "Subscription check failed after completion | user_id=%s",
                update.effective_user.id if update.effective_user else None,
            )
            subscribed = False

        if subscribed:
            await reply_text_safely(
                query.message,
                "Подписка на канал подтверждена. Если хочешь пройти сценарий ещё раз, нажми кнопку ниже или отправь /start.",
                reply_markup=build_restart_keyboard(),
            )
        else:
            await reply_text_safely(
                query.message,
                "📢 Если хочешь пройти сценарий ещё раз, нужна подписка на канал 808 Демок.",
                reply_markup=build_subscription_keyboard(),
            )
        context.user_data.pop("result_steps", None)
        context.user_data.pop("result_step_index", None)
        context.user_data["flow_state"] = None


async def check_subscription(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    user = update.effective_user
    if not query or not query.message or not user:
        return

    await answer_callback_safely(query)
    logger.info("Subscription recheck requested | user_id=%s", user.id)

    try:
        subscribed = await is_user_subscribed(context, user.id)
    except RuntimeError:
        logger.warning("Subscription recheck failed | user_id=%s", user.id)
        await reply_text_safely(
            query.message,
            "⚠️ Не получилось проверить подписку. Проверь, что бот добавлен в канал как администратор, и попробуй ещё раз.",
            reply_markup=build_subscription_keyboard(),
        )
        return

    if not subscribed:
        logger.info("Subscription recheck negative | user_id=%s", user.id)
        await reply_text_safely(
            query.message,
            "📭 Подписка пока не найдена. Подпишись на канал и снова нажми `Проверить подписку`.",
            reply_markup=build_subscription_keyboard(),
        )
        return

    await clear_callback_markup_safely(query)
    logger.info("Subscription confirmed | user_id=%s", user.id)
    await reply_text_safely(
        query.message,
        "✅ Подписка подтверждена. Теперь можно запускать сценарий заново.",
        reply_markup=build_restart_keyboard(),
    )


async def send_checklist(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    if not query or not query.message:
        return

    await answer_callback_safely(query)
    logger.info(
        "Checklist requested | user_id=%s",
        update.effective_user.id if update.effective_user else None,
    )

    checklist_path = get_checklist_path()
    if not checklist_path.exists():
        logger.warning("Checklist file not found | path=%s", checklist_path)
        await reply_text_safely(
            query.message,
            "⚠️ Не получилось найти файл чеклиста. Проверь, что `Чеклист_808.png` лежит в папке проекта.",
        )
        return

    await clear_callback_markup_safely(query)
    await reply_document_safely(
        query.message,
        checklist_path,
        filename=checklist_path.name,
    )
    await reply_text_safely(
        query.message,
        "✨ Продуктивного творчества! Если захочешь разобрать другую ситуацию, можно начать заново.",
        reply_markup=build_restart_keyboard(),
    )


async def stats(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    message = update.effective_message
    if not message:
        return

    logger.info("Stats requested | user_id=%s", update.effective_user.id if update.effective_user else None)
    await reply_text_safely(message, format_stats_message())


async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    context.user_data.clear()
    message = update.effective_message
    logger.info("Cancel requested | user_id=%s", update.effective_user.id if update.effective_user else None)
    if message:
        await reply_text_safely(
            message,
            "⏹️ Сценарий остановлен. Чтобы начать заново, отправь /start.",
            reply_markup=ReplyKeyboardRemove(),
        )
    return 0


async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    logger.exception("Unhandled error while processing update", exc_info=context.error)


def main() -> None:
    load_dotenv()

    telegram_token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not telegram_token:
        raise RuntimeError("Не задана переменная окружения TELEGRAM_BOT_TOKEN.")

    request = HTTPXRequest(
        connect_timeout=30.0,
        read_timeout=30.0,
        write_timeout=30.0,
        pool_timeout=30.0,
    )
    application = Application.builder().token(telegram_token).request(request).build()

    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("stats", stats))
    application.add_handler(CommandHandler("cancel", cancel))
    application.add_handler(MessageHandler(filters.Regex(f"^{RESTART_TEXT}$"), start))
    application.add_handler(CallbackQueryHandler(experience_selected, pattern=r"^experience:"))
    application.add_handler(CallbackQueryHandler(block_selected, pattern=r"^block:"))
    application.add_handler(CallbackQueryHandler(show_next_step, pattern=f"^{NEXT_STEP_CALLBACK}$"))
    application.add_handler(
        CallbackQueryHandler(check_subscription, pattern=f"^{CHECK_SUBSCRIPTION_CALLBACK}$")
    )
    application.add_handler(CallbackQueryHandler(send_checklist, pattern=f"^{CHECKLIST_CALLBACK}$"))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, other_text_received))
    application.add_error_handler(error_handler)

    logger.info("Bot is running")
    application.run_polling()


if __name__ == "__main__":
    main()
