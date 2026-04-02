import { Clock3 } from 'lucide-react';

const LandingPage = ({ onLoginClick }) => {
  const now = new Date();

  return (
    <div className="min-h-screen bg-slate-100 px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <div className="w-full max-w-[500px] overflow-hidden rounded-[28px] border border-slate-300 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="flex min-h-[300px] items-center justify-center px-8 pb-8 pt-8 sm:px-10">
            <img
              src="/onestra-logo.png"
              alt="ONESTRA logo"
              className="max-h-[250px] w-auto object-contain"
            />
          </div>

          <div className="border-t border-slate-200 bg-slate-50 px-8 py-7 text-center sm:px-10">
            <h1 className="text-[22px] font-semibold leading-snug tracking-tight text-slate-900 sm:text-[24px]">
              Card Inventory Management System
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-400">
              
Streamline your entire card production lifecycle — from import to delivery.
            </p>

            <button
              type="button"
              onClick={onLoginClick}
              className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-6 py-3.5 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-blue-700"
            >
              Get Started
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-slate-200 bg-white px-6 py-4 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4" />
              <span>{now.toLocaleString('en-GB')}</span>
            </div>
            <span className="rounded-md bg-slate-50 px-2.5 py-1 text-slate-500">v-01.00</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
