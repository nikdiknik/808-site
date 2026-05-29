import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/supabase/server";
import { deleteTracksByUserId } from "@/lib/tracks";
import { deleteUserAccountById } from "@/lib/users";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const admin = await getCurrentUser();
  if (admin?.role !== "admin") {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const { userId } = await context.params;
  if (userId === "admin") {
    return NextResponse.json({ error: "Админа нельзя удалить" }, { status: 400 });
  }

  const deletedUser = await deleteUserAccountById(userId);
  if (!deletedUser) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  const deletedTrackIds = await deleteTracksByUserId(userId);
  return NextResponse.json({ deletedUserId: deletedUser.id, deletedTrackIds });
}
