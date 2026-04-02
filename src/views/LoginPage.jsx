import { useState } from 'react';
import { ArrowLeft, Boxes, ChevronDown, KeyRound, Lock, User } from 'lucide-react';

const LoginPage = ({
  credentials,
  dummyUsers,
  error,
  notice,
  onBack,
  onChange,
  onForgotPassword,
  onSelectDemoUser,
  onSubmit,
}) => {
  const [showDemoUsers, setShowDemoUsers] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <div className="w-full max-w-[520px] rounded-[30px] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-10">
          <div className="flex items-start justify-between gap-4">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDemoUsers((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-white"
              >
                Demo User
                <ChevronDown className="h-4 w-4" />
              </button>

              {showDemoUsers ? (
                <div className="absolute right-0 z-20 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">Select demo user</p>
                    <p className="mt-1 text-xs text-slate-400">Username and password will be filled automatically.</p>
                  </div>

                  <div className="py-2">
                    {dummyUsers.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          onSelectDemoUser(user);
                          setShowDemoUsers(false);
                        }}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                          <p className="text-xs text-slate-400">
                            {user.roleLabel} · {user.username}
                          </p>
                        </div>
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                          {user.role}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-blue-600 text-white shadow-lg shadow-blue-200/60">
              <Boxes className="h-8 w-8" />
            </div>
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">
              Login
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Card Inventory Access Portal</h1>
          </div>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Username</label>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-blue-500 focus-within:bg-white">
                <User className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  name="username"
                  value={credentials.username}
                  onChange={onChange}
                  placeholder="Enter username"
                  className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-blue-500 focus-within:bg-white">
                <Lock className="h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  name="password"
                  value={credentials.password}
                  onChange={onChange}
                  placeholder="Enter password"
                  className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
              >
                Forgot password?
              </button>
            </div>

            {notice ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {notice}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <KeyRound className="h-4 w-4" />
              Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
