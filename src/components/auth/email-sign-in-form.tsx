"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function EmailSignInForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"sign_in" | "sign_up">("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || password.length < 6) {
      toast.error("Enter your email and a password of at least 6 characters");
      return;
    }
    setLoading(true);
    const supabase = createClient();

    if (mode === "sign_in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      router.push("/");
      router.refresh();
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      router.push("/");
      router.refresh();
      return;
    }
    setCheckEmail(true);
  }

  if (checkEmail) {
    return (
      <p className="max-w-xs text-center text-sm text-muted-foreground">
        Check <span className="font-medium text-foreground">{email}</span> for a confirmation link
        to finish creating your account.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col gap-3">
      <p className="text-center text-xs text-muted-foreground">
        Or {mode === "sign_in" ? "sign in" : "create an account"} with email
      </p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email-auth-email">Email</Label>
        <Input
          id="email-auth-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email-auth-password">Password</Label>
        <Input
          id="email-auth-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
          autoComplete={mode === "sign_in" ? "current-password" : "new-password"}
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Please wait…" : mode === "sign_in" ? "Sign in" : "Create account"}
      </Button>
      <button
        type="button"
        onClick={() => setMode(mode === "sign_in" ? "sign_up" : "sign_in")}
        className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        {mode === "sign_in" ? "Don't have an account? Create one" : "Already have an account? Sign in"}
      </button>
    </form>
  );
}
