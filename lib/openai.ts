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
Держи вайб молодого музыкального продукта: спокойно, предметно, без официоза.
Не выдумывай методики, которых нет в TSV-таблице.
Если подходят несколько методик, выбери одну главную.
Не предлагай воспользоваться сервисом, которого ещё нет. Описывай, что пользователь может сделать сам прямо сейчас.
feedback: 2-3 коротких предложения по ситуации, без приветствий и без эмпатийных вступлений.
why_it_fits: конкретная связь между проблемой пользователя и выбранной методикой.
Поле action_steps должно содержать 3-5 коротких шагов.
Поле extra_tips должно содержать 2-4 коротких совета.
`;

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
    feedback: response.output_parsed.feedback.trim(),
    best_method: response.output_parsed.best_method.trim(),
    best_method_summary: response.output_parsed.best_method_summary.trim(),
    best_method_example: response.output_parsed.best_method_example.trim(),
    why_it_fits: response.output_parsed.why_it_fits.trim(),
    action_steps: response.output_parsed.action_steps.map((item) => item.trim()).filter(Boolean).slice(0, 5),
    extra_tips: response.output_parsed.extra_tips.map((item) => item.trim()).filter(Boolean).slice(0, 4),
  };
}
