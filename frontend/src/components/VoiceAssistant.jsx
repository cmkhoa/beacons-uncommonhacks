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
    <section className="bg-white border border-outline-variant rounded-2xl p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">mic</span>
            Voice Assistant
          </h3>
          <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">
            Use Beacon to log supply changes hands-free. The assistant knows
            your hospital, nurse ID, and current inventory entry IDs.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
        {isReady ? (
          <div className="space-y-3">
            <elevenlabs-convai
              agent-id={AGENT_ID}
              dynamic-variables={dynamicVariables}
            />
            <p className="text-xs text-on-surface-variant">
              Context: hospital ID {session.hospitalId}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Missing ElevenLabs agent ID or nurse session context.
          </div>
        )}
      </div>

      <div className="mt-5 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          Try saying
        </p>
        {[
          'We used five ventilators.',
          'Remove 20 N95 masks.',
          'How many isolation gowns do we have?',
        ].map((phrase) => (
          <div
            key={phrase}
            className="rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface"
          >
            "{phrase}"
          </div>
        ))}
      </div>
    </section>
  );
}
