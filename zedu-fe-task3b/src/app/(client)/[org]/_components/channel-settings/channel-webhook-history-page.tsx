"use client";

import { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Hash, RefreshCw } from "lucide-react";
import { DataContext } from "~/store/GlobalState";
import { GetRequest } from "~/utils/new-request";
import { useRBAC } from "~/hooks/useRBAC";
import { useChannelWebhook } from "~/hooks/useChannelWebhook";
import { useWebhookHistory } from "~/hooks/useWebhookHistory";
import WebhookHistoryTable from "~/app/(client)/[org]/_components/webhooks/webhook-history-table";
import Loading from "~/components/ui/loading";
import { Button } from "~/components/ui/button";

export default function ChannelWebhookHistoryPage() {
  const params = useParams();
  const channelId = params.id as string;
  const { state } = useContext(DataContext);
  const { orgSlug, channelDetails } = state;
  const { hasPermission, status: rbacStatus } = useRBAC();
  const canManageWebhooks = hasPermission("create:webhooks");
  const [channelName, setChannelName] = useState(
    String(channelDetails?.channels_id || "") === String(channelId)
      ? channelDetails?.name || ""
      : ""
  );

  useEffect(() => {
    if (channelName || !channelId) return;

    const load = async () => {
      const res = await GetRequest(`/channels/${channelId}`);
      if (res?.status === 200 || res?.status === 201) {
        setChannelName(res?.data?.data?.name || "");
      }
    };

    void load();
  }, [channelId, channelName]);

  const { webhook, loading: webhookLoading } = useChannelWebhook(channelId);
  const {
    history,
    loading: historyLoading,
    fetchHistory,
  } = useWebhookHistory(channelId, webhook?.id);

  const settingsHref = `/${orgSlug}/home/channels/${channelId}/settings?tab=webhooks`;

  if (rbacStatus === "loading" || webhookLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loading color="#5757CD" height="36px" width="36px" />
      </div>
    );
  }

  if (!canManageWebhooks) {
    return (
      <div className="h-[calc(100dvh-70px)] overflow-y-auto bg-[#F8F9FB] px-4 py-8 lg:px-8">
        <p className="text-sm text-[#667085]">
          You don&apos;t have access to webhook history.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-70px)] overflow-y-auto bg-[#F8F9FB] dark:bg-[#1A1D21]">
      <div className="w-full px-4 py-6 lg:px-8 lg:py-8">
        <Link
          href={settingsHref}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#5757CD] hover:text-[#4545B0] mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to channel settings
        </Link>

        <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#EEF4FF] px-3 py-1 text-xs font-semibold text-[#3538CD] mb-2">
              <Hash className="h-3.5 w-3.5" />
              {channelName || "channel"}
            </div>
            <h1 className="text-xl font-bold text-[#101828] dark:text-zinc-100">
              Delivery history
            </h1>
            <p className="text-sm text-[#667085] dark:text-zinc-400 mt-1">
              {webhook?.webhook_name
                ? `Attempts for ${webhook.webhook_name}`
                : "Webhook delivery attempts for this channel"}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => fetchHistory()}
            disabled={historyLoading || !webhook?.id}
            className="border-[#D0D5DD] text-[#344054] shrink-0"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${historyLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {!webhook ? (
          <div className="rounded-2xl border border-[#E6EAEF] bg-white p-10 text-center">
            <p className="text-sm text-[#667085]">
              No webhook configured for this channel yet.
            </p>
            <Link
              href={settingsHref}
              className="inline-block mt-4 text-sm font-semibold text-[#5757CD]"
            >
              Manage webhook
            </Link>
          </div>
        ) : (
          <WebhookHistoryTable history={history} isLoading={historyLoading} />
        )}
      </div>
    </div>
  );
}
