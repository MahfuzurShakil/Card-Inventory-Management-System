import { ArrowLeft, KeyRound, Lock, Mail } from 'lucide-react';

const ForgotPasswordPage = ({
  email,
  error,
  onBack,
  onEmailChange,
  onPasswordChange,
  onSendEmail,
  onSubmitReset,
  step,
  targetUser,
  values,
}) => {
  const isResetStep = step === 'reset';

  return (
    <div className="min-h-screen bg-slate-100 px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <div className="w-full max-w-[520px] rounded-[30px] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-10">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </button>

          <div className="mt-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-blue-600 text-white shadow-lg shadow-blue-200/60">
              {isResetStep ? <KeyRound className="h-8 w-8" /> : <Mail className="h-8 w-8" />}
            </div>
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">
              Password Reset
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              {isResetStep ? 'Create a New Password' : 'Forgot Password'}
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">
              {isResetStep
                ? `Reset access for ${targetUser?.email}. This demo flow updates the password in the current session only.`
                : 'Enter the registered email address for a demo user to continue.'}
            </p>
          </div>

          <form onSubmit={isResetStep ? onSubmitReset : onSendEmail} className="mt-8 space-y-5">
            {isResetStep ? (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">New Password</label>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-blue-500 focus-within:bg-white">
                    <Lock className="h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      name="newPassword"
                      value={values.newPassword}
                      onChange={onPasswordChange}
                      placeholder="Enter new password"
                      className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Confirm Password</label>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-blue-500 focus-within:bg-white">
                    <Lock className="h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      name="confirmPassword"
                      value={values.confirmPassword}
                      onChange={onPasswordChange}
                      placeholder="Confirm password"
                      className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Email Address</label>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-blue-500 focus-within:bg-white">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    value={email}
                    onChange={onEmailChange}
                    placeholder="Enter email address"
                    className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>
            )}

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              {isResetStep ? <KeyRound className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
              {isResetStep ? 'Update Password' : 'Send Reset Email'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
