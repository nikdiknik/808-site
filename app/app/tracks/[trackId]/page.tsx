import { notFound, redirect } from "next/navigation";

import { TrackDetailsClient } from "@/components/tracks/track-details-client";
import { getCurrentUser } from "@/lib/supabase/server";
import { getUserTrack } from "@/lib/tracks";

export const dynamic = "force-dynamic";

type TrackPageProps = {
  params: Promise<{
    trackId: string;
  }>;
};

export default async function TrackPage({ params }: TrackPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/sign-in");
  }

  const { trackId } = await params;
  const track = await getUserTrack(user, trackId);
  if (!track) {
    notFound();
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="noise-layer pointer-events-none absolute inset-0 opacity-50" />
      <div className="relative mx-auto mt-10 max-w-[920px]">
        <TrackDetailsClient track={track} />
      </div>
    </main>
  );
}
