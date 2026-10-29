"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toaster";
import { displayUrl } from "@/lib/display";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { DisplaySettings as DisplaySettingsRow } from "@/lib/types";
import { SettingsIntro } from "./SettingsView";

const noSubscribe = () => () => undefined;
const getOrigin = () => window.location.origin;
const getServerOrigin = () => "";

/** The lobby TV link: copy it, preview it, or rotate it when it should stop working. */
export function DisplaySettings({ settings: initial }: { settings: DisplaySettingsRow }) {
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const [settings, setSettings] = useState(initial);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const origin = useSyncExternalStore(noSubscribe, getOrigin, getServerOrigin);
  const url = displayUrl(origin, settings.key);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Display link copied");
    } catch {
      toast.error("Couldn't copy automatically. Click the link box, select all and copy.");
    }
  }

  async function rotate() {
    const { error } = await supabase.rpc("rotate_display_key");
    if (error) {
      toast.error(`Couldn't rotate the link: ${error.message}`);
      return;
    }
    const { data } = await supabase.from("display_settings").select("*").eq("id", 1).single();
    if (data) setSettings(data);
    setConfirmRotate(false);
    toast.success("New display link ready. Update the TV with it.");
  }

  return (
    <div>
      <SettingsIntro>
        A view-only, always-live version of the board for a TV. It needs no sign-in: anyone with the link sees ticket
        numbers, clients, titles, stages, techs, scheduled dates and ages (never contact details, notes or files), so
        keep the link inside the building. Rotate it if it ever leaks.
      </SettingsIntro>

      <div className="field-label">Display link</div>
      <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
        <input
          className="input font-mono text-[12.5px]"
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Lobby display link"
        />
        <button type="button" onClick={() => void copy()} className="btn btn-primary shrink-0">
          Copy link
        </button>
        <a href={url} target="_blank" rel="noreferrer" className="btn btn-secondary shrink-0 no-underline">
          Preview
        </a>
      </div>
      <p className="mt-2 text-[12px] text-label">
        Link issued {formatDateTime(settings.rotated_at)} by {settings.rotated_by_name}.
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-card border border-line-card bg-card px-4 py-3">
        <div className="text-[13px] text-ink-2">
          <span className="font-semibold text-ink">Rotate the link</span> to issue a new one. The old link stops working
          right away and the TV shows &ldquo;This display link isn&rsquo;t valid&rdquo; until it gets the new link.
        </div>
        <button type="button" onClick={() => setConfirmRotate(true)} className="btn btn-danger btn-sm">
          Rotate link
        </button>
      </div>

      <details className="mt-5 rounded-card border border-line-card bg-card px-4 py-3 text-[13px] text-ink-2">
        <summary className="cursor-pointer font-semibold text-ink">Set up the TV on a Raspberry Pi</summary>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>Install Raspberry Pi OS (64-bit, with desktop), boot the Pi, connect it to Wi-Fi and plug it into the TV.</li>
          <li>
            Run <code className="font-mono text-[12px] text-ink-value">sudo raspi-config</code>: System Options → Boot / Auto
            Login → <span className="text-ink-value">Desktop Autologin</span>; Display Options → Screen Blanking →{" "}
            <span className="text-ink-value">off</span>.
          </li>
          <li>
            Create <code className="font-mono text-[12px] text-ink-value">~/.config/labwc/autostart</code> (older images: add
            the line under <code className="font-mono text-[12px] text-ink-value">[autostart]</code> in{" "}
            <code className="font-mono text-[12px] text-ink-value">~/.config/wayfire.ini</code>) with this one line:
            <pre className="mt-2 overflow-x-auto rounded-md border border-line bg-field p-3 font-mono text-[11.5px] leading-relaxed text-ink-value">
              {`chromium --kiosk --noerrdialogs --disable-infobars --incognito --hide-scrollbars "${url}" &`}
            </pre>
            On older images the browser is called <code className="font-mono text-[12px] text-ink-value">chromium-browser</code>.
          </li>
          <li>Set the TV to its PC or Game picture mode so nothing is cropped, reboot the Pi, then unplug the mouse.</li>
        </ol>
        <p className="mt-3">
          The page scales itself to the screen, keeps the last data on screen if the network drops, and reloads itself a
          few times a day to pick up updates.
        </p>
      </details>

      <ConfirmDialog
        open={confirmRotate}
        title="Rotate the display link?"
        confirmLabel="Rotate link"
        busyLabel="Rotating…"
        onCancel={() => setConfirmRotate(false)}
        onConfirm={rotate}
        message={
          <>
            The current link stops working immediately. The lobby TV will show &ldquo;This display link isn&rsquo;t
            valid&rdquo; until someone updates it with the new link.
          </>
        }
      />
    </div>
  );
}
