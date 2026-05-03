import { z } from "zod";

export const restartRequestSchema = z
  .object({
    experience: z.enum(["newbie", "middle", "advanced", "pro"]),
    problem: z.enum(["no_idea", "no_structure", "no_lyrics", "arrangement", "other"]),
    otherText: z.string().trim().max(800).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.problem === "other" && !value.otherText) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["otherText"],
        message: "Опиши проблему, если выбрал вариант Другое",
      });
    }
  });

export const restartResultSchema = z.object({
  feedback: z.string(),
  best_method: z.string(),
  best_method_summary: z.string(),
  best_method_example: z.string(),
  why_it_fits: z.string(),
  action_steps: z.array(z.string()),
  extra_tips: z.array(z.string()),
});

export type RestartRequest = z.infer<typeof restartRequestSchema>;
export type RestartResult = z.infer<typeof restartResultSchema>;
