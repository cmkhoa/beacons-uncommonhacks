import React, { useEffect, useMemo, useState } from 'react';
import { apiGet } from '../lib/api';

const ROLES = [
  {
    id: 'nurse',
    label: 'Nurse',
    tagline: 'Rapid inventory input',
    description:
      'Submit supply usage in seconds via form or voice. "We just used 5 ventilators." Beacon does the rest.',
    icon: 'medical_services',
    accent: 'from-sky-50 to-white',
    border: 'border-sky-200',
    badge: 'bg-sky-100 text-sky-700',
  },
  {
    id: 'admin',
    label: 'Admin / Test',
    tagline: 'Demo controls + raw logs',
    description:
      'Reset inventory, trigger demo shortages, inspect every transfer request and activity log. For the hackathon team.',
    icon: 'science',
    accent: 'from-fuchsia-50 to-white',
    border: 'border-fuchsia-200',
    badge: 'bg-fuchsia-100 text-fuchsia-700',
  },
];

function dedupeHospitalsByName(hospitals) {
  const byName = new Map();
  for (const h of hospitals) {
    const invCount = h.inventory?.length ?? 0;
    const existing = byName.get(h.name);
    if (!existing || invCount > (existing.inventory?.length ?? 0)) {
      byName.set(h.name, h);
    }
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

const RoleLogin = ({ onLogin }) => {
  const [step, setStep] = useState('role');
  const [hospitals, setHospitals] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [selectedNurseId, setSelectedNurseId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const hospitalOptions = useMemo(
    () => dedupeHospitalsByName(hospitals),
    [hospitals]
  );

  const selectedHospital = hospitalOptions.find((h) => h.id === selectedHospitalId);

  useEffect(() => {
    if (step === 'role') return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiGet('/api/hospitals?hydrate=true');
        if (cancelled) return;
        const list = data.hospitals ?? [];
        setHospitals(list);
        const deduped = dedupeHospitalsByName(list);
        if (deduped.length > 0) {
          setSelectedHospitalId((prev) =>
            prev && deduped.some((h) => h.id === prev) ? prev : deduped[0].id
          );
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step]);

  useEffect(() => {
    if (step !== 'nurse' || !selectedHospitalId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiGet(
          `/api/users?hospitalId=${encodeURIComponent(selectedHospitalId)}`
        );
        if (cancelled) return;
        const list = data.users ?? [];
        setNurses(list);
        setSelectedNurseId((prev) =>
          prev && list.some((n) => n.id === prev) ? prev : (list[0]?.id ?? '')
        );
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, selectedHospitalId]);

  const handleRolePick = (roleId) => {
    if (roleId === 'nurse') {
      setStep('hospital');
      return;
    }
    onLogin({ role: roleId });
  };

  const handleNurseSubmit = (e) => {
    e.preventDefault();
    const nurse = nurses.find((n) => n.id === selectedNurseId);
    if (!selectedHospital || !nurse) {
      setError('Select a hospital and nurse to continue.');
      return;
    }
    onLogin({
      role: 'nurse',
      userId: nurse.id,
      userName: nurse.name,
      hospitalId: selectedHospital.id,
      hospitalName: selectedHospital.name,
    });
  };

  if (step !== 'role') {
    return (
      <NurseSignInPanel
        step={step}
        setStep={setStep}
        hospitalOptions={hospitalOptions}
        selectedHospitalId={selectedHospitalId}
        setSelectedHospitalId={setSelectedHospitalId}
        nurses={nurses}
        selectedNurseId={selectedNurseId}
        setSelectedNurseId={setSelectedNurseId}
        loading={loading}
        error={error}
        onBack={() => {
          setStep('role');
          setError(null);
        }}
        onSubmit={handleNurseSubmit}
      />
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-6">
      <div className="max-w-5xl w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {ROLES.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => handleRolePick(role.id)}
              className={`group text-left bg-gradient-to-b ${role.accent} border ${role.border} rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-primary/40`}
            >
              <div className="flex items-center justify-between mb-4">
                <span
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${role.badge} shadow-sm`}
                >
                  <span className="material-symbols-outlined text-[26px]">
                    {role.icon}
                  </span>
                </span>
                <span className="material-symbols-outlined text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
                  arrow_forward
                </span>
              </div>
              <h3 className="text-lg font-bold text-on-surface">{role.label}</h3>
              <p className="text-[11px] font-bold uppercase tracking-widest mt-1 text-on-surface-variant">
                {role.tagline}
              </p>
              <p className="text-sm text-on-surface-variant mt-3 leading-relaxed">
                {role.description}
              </p>
              <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-primary">
                Continue
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </div>
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-on-surface-variant mt-8">
          No password required — this is a demo sign-in. Your session is stored locally.
        </p>
      </div>
    </div>
  );
};

function NurseSignInPanel({
  step,
  setStep,
  hospitalOptions,
  selectedHospitalId,
  setSelectedHospitalId,
  nurses,
  selectedNurseId,
  setSelectedNurseId,
  loading,
  error,
  onBack,
  onSubmit,
}) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-sky-50 p-6">
      <div className="max-w-md w-full bg-white border border-outline-variant rounded-2xl shadow-lg p-8">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-on-surface-variant hover:text-primary mb-4 flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back
        </button>

        <h1 className="text-xl font-bold text-on-surface mb-1">Nurse sign-in</h1>
        <p className="text-sm text-on-surface-variant mb-6">
          {step === 'hospital'
            ? 'Select your hospital.'
            : 'Select your name to attribute inventory changes.'}
        </p>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
            {error}
          </div>
        )}

        {step === 'hospital' && (
          <>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
              Hospital
            </label>
            <select
              value={selectedHospitalId}
              onChange={(e) => setSelectedHospitalId(e.target.value)}
              disabled={loading || hospitalOptions.length === 0}
              className="w-full mb-6 bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-sm"
            >
              {hospitalOptions.length === 0 ? (
                <option value="">No hospitals found</option>
              ) : (
                hospitalOptions.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))
              )}
            </select>
            <button
              type="button"
              disabled={!selectedHospitalId || loading}
              onClick={() => setStep('nurse')}
              className="w-full py-3 bg-primary text-white font-bold rounded-xl disabled:opacity-50"
            >
              Continue
            </button>
          </>
        )}

        {step === 'nurse' && (
          <form onSubmit={onSubmit}>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
              Nurse
            </label>
            <select
              value={selectedNurseId}
              onChange={(e) => setSelectedNurseId(e.target.value)}
              disabled={loading || nurses.length === 0}
              className="w-full mb-6 bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-sm"
            >
              {nurses.length === 0 ? (
                <option value="">No nurses at this hospital</option>
              ) : (
                nurses.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))
              )}
            </select>
            <button
              type="submit"
              disabled={!selectedNurseId || loading}
              className="w-full py-3 bg-primary text-white font-bold rounded-xl disabled:opacity-50"
            >
              Sign in
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default RoleLogin;
