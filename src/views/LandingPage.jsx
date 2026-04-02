import { ArrowRight, Boxes, Clock3, ShieldCheck } from 'lucide-react';

const LandingPage = ({ onLoginClick }) => {
  const now = new Date();

  return (
    <div className="min-h-screen bg-slate-100 px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <div className="w-full max-w-[520px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="px-8 pb-7 pt-7 text-center sm:px-10">
            <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-900">Card Inventory</p>
                <p className="text-sm font-medium text-slate-400">Management System</p>
              </div>
            </div>

            <div className="relative mx-auto mt-8 flex h-44 w-44 items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-blue-100 bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.12),_rgba(255,255,255,0)_68%)]" />
              <div className="absolute inset-[16px] rounded-full border border-slate-200" />
              <div className="absolute inset-[32px] rounded-full border border-blue-100" />
              <div className="absolute inset-[48px] rounded-full border border-slate-200 bg-slate-50 shadow-inner" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-[24px] bg-blue-600 text-white shadow-[0_16px_40px_rgba(37,99,235,0.28)]">
                <Boxes className="h-9 w-9" />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 bg-slate-50 px-8 py-7 text-center sm:px-10">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Card Inventory management System
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">
              Role-based access for inventory operations across procurement, store, production, and finance.
            </p>

            <button
              type="button"
              onClick={onLoginClick}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Login
              <ArrowRight className="h-4 w-4" />
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
