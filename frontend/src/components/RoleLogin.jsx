import React from 'react';

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
    id: 'dispatcher',
    label: 'Dispatcher',
    tagline: 'Command center + map + alerts',
    description:
      'Watch live hospital status, critical shortage alerts, active transfer requests, and the regional map in one view.',
    icon: 'hub',
    accent: 'from-indigo-50 to-white',
    border: 'border-indigo-200',
    badge: 'bg-indigo-100 text-indigo-700',
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

const RoleLogin = ({ onLogin }) => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-6">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="text-3xl font-bold text-primary tracking-tight">Beacon</span>
            <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest">
              Sign In
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-on-surface">
            Choose your role to continue
          </h1>
          <p className="text-sm text-on-surface-variant mt-2 max-w-xl mx-auto">
            Each role opens a focused view. You can switch later from the sidebar.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {ROLES.map((role) => (
            <button
              key={role.id}
              onClick={() => onLogin(role.id)}
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
              <p
                className={`text-[11px] font-bold uppercase tracking-widest mt-1 ${role.badge.replace(
                  'bg-',
                  'text-'
                )
                  .split(' ')
                  .filter((c) => c.startsWith('text-'))
                  .join(' ')}`}
              >
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
          No password required — this is a demo sign-in. Your role is stored locally.
        </p>
      </div>
    </div>
  );
};

export default RoleLogin;
