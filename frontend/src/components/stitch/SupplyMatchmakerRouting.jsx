import React, { useEffect, useState } from 'react';
import { apiGet } from '../../lib/api';

const SupplyMatchmakerRouting = ({ isEmbedded = false }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiGet('/api/requests');
        if (!cancelled) setRequests(data.requests ?? []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={`flex flex-col h-full overflow-hidden bg-background ${isEmbedded ? '' : 'h-screen'}`}>
      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <section className="max-w-6xl mx-auto bg-white border border-outline-variant rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-outline-variant">
            <h2 className="text-xl font-bold text-on-surface">Transfer Missions</h2>
            <p className="text-sm text-on-surface-variant mt-1">
              One row per transfer, showing requester, donor, and requested item.
            </p>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-on-surface-variant">Loading transfers…</div>
          ) : error ? (
            <div className="p-6 text-sm text-red-700 bg-red-50 border-t border-red-100">
              Failed to load transfers: {error}
            </div>
          ) : requests.length === 0 ? (
            <div className="p-6 text-sm text-on-surface-variant">No active transfers.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-container-lowest text-on-surface-variant">
                  <tr className="border-b border-outline-variant">
                    <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest">Mission</th>
                    <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest">Requester</th>
                    <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest">Donor</th>
                    <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest">Item</th>
                    <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {requests.map((request) => (
                    <tr key={request.requestId ?? request.id} className="hover:bg-surface-bright">
                      <td className="px-6 py-4 font-mono text-xs text-on-surface-variant">
                        {(request.requestId ?? request.id ?? '').slice(0, 8)}
                      </td>
                      <td className="px-6 py-4 font-medium text-on-surface">
                        {request.fromHospitalName ?? request.fromHospitalId}
                      </td>
                      <td className="px-6 py-4 text-on-surface">
                        {request.toHospitalName ?? 'Unassigned'}
                      </td>
                      <td className="px-6 py-4 text-on-surface">
                        <span className="font-medium">{request.itemName}</span>
                        <span className="text-on-surface-variant"> × {request.quantity}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex rounded-full bg-surface-container px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                          {request.status ?? 'PENDING'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default SupplyMatchmakerRouting;
