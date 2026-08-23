"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/provider";

const credentialsSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type CredentialsValues = z.infer<typeof credentialsSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CredentialsValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit({ email, password }: CredentialsValues) {
    setAuthError(null);
    const { error } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);

    if (error) {
      setAuthError(error);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        {isSignUp ? "Create account" : "Sign in"}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register("email")}
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <Input
            id="password"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            {...register("password")}
            aria-invalid={!!errors.password}
          />
          {errors.password && (
            <p className="text-sm text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        {authError && (
          <p role="alert" className="text-sm text-destructive">
            {authError}
          </p>
        )}

        <Button
          type="submit"
          className="cursor-pointer w-full"
          disabled={isSubmitting}
        >
          {isSignUp ? "Sign up" : "Sign in"}
        </Button>
      </form>

      <button
        type="button"
        className="cursor-pointer text-sm text-muted-foreground hover:text-foreground"
        onClick={() => {
          setAuthError(null);
          setIsSignUp((v) => !v);
        }}
      >
        {isSignUp
          ? "Already have an account? Sign in"
          : "Need an account? Sign up"}
      </button>
    </div>
  );
}
