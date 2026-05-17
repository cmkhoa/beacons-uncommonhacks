import React, { useEffect, useMemo } from 'react';

const AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID;
const WIDGET_SCRIPT_ID = 'elevenlabs-convai-widget-embed';

function buildInventoryContext(inventoryEntries, itemMap) {
  if (!inventoryEntries?.length) return 'No inventory data available.';

  return inventoryEntries
    .map((entry) => {
      const item = itemMap.get(entry.itemId);
      const name = item?.name ?? entry.itemId;
      const unit = item?.unit ?? 'units';
      return `${name} — entryId: ${entry.id}, count: ${entry.count}, available: ${entry.availableCount}, unit: ${unit}, status: ${entry.status}`;
    })
    .join('\n');
}

export function VoiceAssistant({
  session,
  hospital,
  inventoryEntries,
  itemMap,
}) {
  useEffect(() => {
    if (document.getElementById(WIDGET_SCRIPT_ID)) return;

    const script = document.createElement('script');
    script.id = WIDGET_SCRIPT_ID;
    script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
    script.async = true;
    script.type = 'text/javascript';
    document.body.appendChild(script);
  }, []);

  const dynamicVariables = useMemo(
    () =>
      JSON.stringify({
        hospitalId: session?.hospitalId ?? '',
        nurseId: session?.userId ?? '',
        inventoryList: buildInventoryContext(inventoryEntries, itemMap),
      }),
    [hospital, inventoryEntries, itemMap, session]
  );

  const isReady = Boolean(AGENT_ID && session?.hospitalId && session?.userId);

  return (
    <div className="w-full">
      {isReady ? (
        <elevenlabs-convai
          agent-id={AGENT_ID}
          dynamic-variables={dynamicVariables}
        />
      ) : (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Missing ElevenLabs agent ID or nurse session context.
        </div>
      )}
    </div>
  );
}
