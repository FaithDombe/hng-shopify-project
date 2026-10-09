"use client";

import { useContext, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { DataContext } from "~/store/GlobalState";

export default function WebhookHistoryRedirect() {
  const params = useParams();
  const router = useRouter();
  const { state } = useContext(DataContext);
  const channelId = params.channelId as string;

  useEffect(() => {
    const orgSlug = state.orgSlug || localStorage.getItem("orgSlug") || "";
    if (!orgSlug || !channelId) return;
    router.replace(`/${orgSlug}/home/channels/${channelId}/settings/history`);
  }, [state.orgSlug, channelId, router]);

  return null;
}
