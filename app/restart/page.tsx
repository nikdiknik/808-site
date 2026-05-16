import { RestartFlow } from "@/components/restart-flow";
import { getCurrentUser } from "@/lib/supabase/server";
import { getUserTracks } from "@/lib/tracks";
import { ensureUserProfile } from "@/lib/users";

export default async function RestartPage() {
  const user = await getCurrentUser();

  if (!user) {
    return <RestartFlow />;
  }

  const [profile, tracks] = await Promise.all([ensureUserProfile(user), getUserTracks(user)]);

  return (
    <RestartFlow
      initialExperience={profile.experience || null}
      tracks={tracks.map((track) => ({
        id: track.id,
        title: track.title,
        subtitle: track.subtitle,
        notes: track.notes,
        coverId: track.coverId,
        progressPercent: track.progressPercent,
      }))}
    />
  );
}
