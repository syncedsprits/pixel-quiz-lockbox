import { callRemote, remoteBackendOrigin } from "@/lib/backend/remote-backend";
import * as fns from "./profile.functions";
import type { Profile } from "./profile-schemas";

/** Browser entry points; on a copy hosted elsewhere they go to the Lovable-hosted backend. */
export function getMyProfile(): Promise<Profile> {
  const origin = remoteBackendOrigin();
  return origin ? callRemote<Profile>(origin, "get-profile", {}) : fns.getMyProfile();
}

export function updateMyProfile({ data }: { data: { displayName: string } }): Promise<Profile> {
  const origin = remoteBackendOrigin();
  return origin ? callRemote<Profile>(origin, "update-profile", data) : fns.updateMyProfile({ data });
}
