import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { recordAnalyticsEvent } from "@/lib/analytics";
import { readMethodsText } from "@/lib/methods";
import { generateRestartScenario } from "@/lib/openai";
import { restartRequestSchema } from "@/lib/schemas";

export const runtime = "nodejs";

function errorResponse(message: string, status = 500, code = "REQUEST_FAILED") {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  let parsed;

  try {
    parsed = restartRequestSchema.parse(await request.json());
  } catch (error) {
    const message =
      error instanceof ZodError
        ? error.issues[0]?.message || "Проверь выбранные параметры"
        : "Не получилось прочитать запрос";
    return errorResponse(message, 400, "INVALID_REQUEST");
  }

  await recordAnalyticsEvent("started", {
    experience: parsed.experience,
    problem: parsed.problem,
  });

  try {
    const methodsText = await readMethodsText();
    const result = await generateRestartScenario(parsed, methodsText);
    await recordAnalyticsEvent("completed", {
      experience: parsed.experience,
      problem: parsed.problem,
    });
    return NextResponse.json(result);
  } catch (error) {
    await recordAnalyticsEvent("failed", {
      experience: parsed.experience,
      problem: parsed.problem,
    });

    if (error instanceof Error && error.message === "OPENAI_API_KEY_MISSING") {
      return errorResponse(
        "OpenAI ключ ещё не подключён. Добавь OPENAI_API_KEY в переменные окружения",
        500,
        "OPENAI_API_KEY_MISSING",
      );
    }

    if (error instanceof Error && (error.message.includes("ENOENT") || error.message === "METHODS_EMPTY")) {
      return errorResponse(
        "Не нашёл таблицу методик. Проверь METHODS_TSV_PATH и файл data/methods.tsv",
        500,
        "METHODS_NOT_FOUND",
      );
    }

    console.error("Restart generation failed", error);
    return errorResponse(
      "Не удалось подобрать перезапуск. Попробуй ещё раз через минуту",
      500,
      "OPENAI_REQUEST_FAILED",
    );
  }
}
