import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import { experienceLabels, problemLabels } from "@/lib/options";
import { restartResultSchema, type RestartRequest, type RestartResult } from "@/lib/schemas";

const systemPrompt = `Ты музыкальный AI-ментор для сервиса 808 Демок.
Твоя задача:
1. На основе данных пользователя определить, какая методика из TSV-таблицы подходит лучше всего.
2. Объяснить, почему именно она подходит под ситуацию.
3. Дать конкретные шаги, которые помогут сдвинуть демку с места.

Отвечай по-русски.
Пиши живо, просто и дружелюбно, но без воды.
Текст должен звучать как интерфейсные тексты внутри приложения, а не как сообщение в чате.
Не используй приветствия, обращения вроде "понимаю", "классно, что..." и фразы, которые имитируют переписку.
Не используй инфоцыганский тон, чрезмерную мотивацию, общие обещания и пустые подбадривания.
Каждое предложение должно давать наблюдение, причину или действие.
Не ставь точку в конце текста, если поле состоит из одного абзаца или это последний абзац.
Не допускай висячих предлогов: после слов длиной 1-2 буквы ставь неразрывный пробел.
Держи вайб молодого музыкального продукта: спокойно, предметно, без официоза.
Не выдумывай методики, которых нет в TSV-таблице.
Если подходят несколько методик, выбери одну главную.
Не предлагай воспользоваться сервисом, которого ещё нет. Описывай, что пользователь может сделать сам прямо сейчас.
feedback: 2-3 коротких предложения по ситуации, без приветствий и без эмпатийных вступлений.
why_it_fits: конкретная связь между проблемой пользователя и выбранной методикой.
Поле action_steps должно содержать 3-5 коротких шагов.
Поле extra_tips должно содержать 2-4 коротких совета.
`;

function formatAppText(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b([A-Za-zА-Яа-яЁё]{1,2})\s+/g, "$1\u00A0")
    .replace(/(?:\.|…)+$/u, "");
}

function buildUserPrompt(request: RestartRequest, methodsText: string): string {
  const experience = experienceLabels[request.experience];
  const problem =
    request.problem === "other"
      ? `Другое: ${request.otherText || ""}`
      : problemLabels[request.problem];

  return `Данные пользователя:
- Опыт в музыке: ${experience}
- Где возник ступор: ${problem}

Ниже TSV-таблица с методиками:

${methodsText}

Подбери одну лучшую методику и верни структурированный результат.`;
}

export async function generateRestartScenario(
  request: RestartRequest,
  methodsText: string,
): Promise<RestartResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY_MISSING");
  }

  const client = new OpenAI({ apiKey });
  const response = await client.responses.parse({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: buildUserPrompt(request, methodsText) },
    ],
    text: {
      format: zodTextFormat(restartResultSchema, "restart_result"),
    },
  });

  if (!response.output_parsed) {
    throw new Error("OPENAI_EMPTY_RESPONSE");
  }

  return {
    ...response.output_parsed,
    feedback: formatAppText(response.output_parsed.feedback),
    best_method: formatAppText(response.output_parsed.best_method),
    best_method_summary: formatAppText(response.output_parsed.best_method_summary),
    best_method_example: formatAppText(response.output_parsed.best_method_example),
    why_it_fits: formatAppText(response.output_parsed.why_it_fits),
    action_steps: response.output_parsed.action_steps.map(formatAppText).filter(Boolean).slice(0, 5),
    extra_tips: response.output_parsed.extra_tips.map(formatAppText).filter(Boolean).slice(0, 4),
  };
}
