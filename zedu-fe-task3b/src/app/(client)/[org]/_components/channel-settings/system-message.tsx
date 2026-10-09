"use client";

import { useContext, useEffect, useState } from "react";
import { Layers, MessageSquare } from "lucide-react";
import { Switch } from "~/components/ui/switch";
import { useRBAC } from "~/hooks/useRBAC";
import Loading from "~/components/ui/loading";
import { DataContext } from "~/store/GlobalState";
import { ACTIONS } from "~/store/Actions";
import { GetRequest, PutRequest } from "~/utils/new-request";
import { showSuccess } from "~/components/toast/sonner";

const SystemMessage = ({ channelId }: { channelId: string }) => {
  const { state, dispatch } = useContext(DataContext);
  const { hasPermission, status: rbacStatus } = useRBAC();
  const canManageChannels = hasPermission("manage:channels");
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  const syncChannelDetails = (showJoinedMessage: boolean) => {
    if (
      String(state?.channelDetails?.channels_id || "") !== String(channelId)
    ) {
      return;
    }
    dispatch({
      type: ACTIONS.CHANNEL_DETAILS,
      payload: {
        ...state.channelDetails,
        show_joined_message: showJoinedMessage,
      },
    });
  };

  useEffect(() => {
    if (!canManageChannels || !channelId) return;
    let cancelled = false;

    const load = async () => {
      setEnabled(null);
      const res = await GetRequest(`/channels/${channelId}`);
      if (cancelled) return;
      if (res?.status === 200 || res?.status === 201) {
        const data = res?.data?.data;
        setEnabled(data?.show_joined_message !== false);
      } else {
        setEnabled(true);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [canManageChannels, channelId]);

  const handleToggle = async (next: boolean) => {
    if (saving || enabled === null) return;
    const previous = enabled;
    setEnabled(next);
    setSaving(true);

    const res = await PutRequest(
      `/channels/${channelId}/toggle-user-joined-message`,
      { show_joined_message: next }
    );

    if (res?.status === 200 || res?.status === 201) {
      showSuccess(
        next
          ? "User join system messages are on"
          : "User join system messages are off"
      );
      syncChannelDetails(next);
    } else {
      setEnabled(previous);
    }

    setSaving(false);
  };

  if (rbacStatus === "loading" || (canManageChannels && enabled === null)) {
    return (
      <div className="flex justify-center py-24">
        <Loading color="#5757CD" height="36px" width="36px" />
      </div>
    );
  }

  if (!canManageChannels) {
    return (
      <div className="rounded-2xl border border-[#E6EAEF] dark:border-white/10 bg-[#F9FAFB] dark:bg-[#222529] p-10 text-center">
        <Layers className="mx-auto h-10 w-10 text-[#667085] mb-4" />
        <h2 className="text-lg font-bold text-[#101828] dark:text-zinc-100">
          System messages unavailable
        </h2>
        <p className="text-sm text-[#667085] dark:text-zinc-400 mt-2">
          You don&apos;t have permission to change this channel. Ask an
          administrator to grant the &quot;Manage channels&quot; permission.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#E6EAEF] dark:border-white/10 p-5 bg-white dark:bg-[#222529]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F9FAFB] dark:bg-[#1A1D21] border border-[#E6EAEF] dark:border-white/10 shrink-0">
            <MessageSquare className="h-5 w-5 text-[#5757CD]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#101828] dark:text-zinc-100">
              System message
            </h3>
            <p className="text-sm text-[#667085] dark:text-zinc-400 mt-0.5 max-w-xl">
              Turn system messages on or off for this channel. Join, leave, and
              other automated notices follow this setting.
            </p>
          </div>
        </div>
        <Switch
          checked={enabled ?? true}
          disabled={saving}
          onCheckedChange={handleToggle}
          aria-label="System message"
          className="data-[state=checked]:bg-[#5757CD] data-[state=unchecked]:bg-[#D0D5DD] dark:data-[state=unchecked]:bg-zinc-600"
        />
      </div>
    </div>
  );
};

export default SystemMessage;
