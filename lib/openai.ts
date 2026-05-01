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
Пиши живо, просто, дружелюбно и без официальности.
Не выдумывай методики, которых нет в TSV-таблице.
Если подходят несколько методик, выбери одну главную.
Не предлагай воспользоваться сервисом, которого ещё нет. Описывай, что пользователь может сделать сам прямо сейчас.
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

  return response.output_parsed;
}
