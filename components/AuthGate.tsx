"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  children: React.ReactNode;
};

export default function AuthGate({ children }: Props) {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSignedIn(!!data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSignedIn(!!session);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async () => {
    if (!email) return;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      alert(`登入連結寄送失敗：${error.message}`);
      return;
    }

    setSent(true);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return <div className="p-6 text-center text-sm text-slate-500">載入中…</div>;
  }

  if (signedIn) {
    return (
      <>
        <div className="mx-auto w-full max-w-md px-3 pt-3">
          <div className="rounded-xl border bg-white p-3 text-xs text-slate-600 flex items-center justify-between gap-3">
            <span>已登入雲端同步</span>
            <button
              type="button"
              onClick={signOut}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium"
            >
              登出
            </button>
          </div>
        </div>
        {children}
      </>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
      <div className="w-full rounded-2xl border bg-white p-5 shadow-sm space-y-4">
        <div>
          <h1 className="text-xl font-bold">猛健樂個人版 Pro</h1>
          <p className="mt-1 text-sm text-slate-500">請先登入，資料才會同步到雲端。</p>
        </div>

        <input
          type="email"
          placeholder="請輸入 Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border px-3 py-2 outline-none"
        />

        <button
          type="button"
          onClick={signIn}
          className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
        >
          寄送登入連結
        </button>

        {sent ? (
          <p className="text-sm text-emerald-600">
            已寄出登入連結，請去 Email 點擊後回到這個網站。
          </p>
        ) : null}
      </div>
    </div>
  );
}