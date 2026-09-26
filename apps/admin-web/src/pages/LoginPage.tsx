import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { adminLogin } from "@/services/auth-api";
import { useAuthStore } from "@/stores/auth-store";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const mutation = useMutation({
    mutationFn: adminLogin,
    onSuccess: (data) => {
      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      });
      navigate("/", { replace: true });
    },
  });

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-12">
      <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section className="max-w-xl">
          <p className="font-[family-name:var(--font-display)] text-5xl leading-none text-[var(--color-ink)] md:text-6xl">
            Ride
          </p>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-[var(--color-ink-soft)] md:text-3xl">
            Run the city from one calm console.
          </h1>
          <p className="mt-3 max-w-md text-[var(--color-ink-soft)]">
            Admin access for verification, live ops, pricing, and safety.
          </p>
          <p className="mt-8 max-w-md text-sm text-[var(--color-ink-soft)]">
            Installing passenger or driver on a phone?{" "}
            <Link
              to="/downloads"
              className="font-medium text-[var(--color-accent)] underline-offset-2 hover:underline"
            >
              Download APKs over Wi‑Fi
            </Link>
            — no sign-in required.
          </p>
        </section>

        <form
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
          className="rounded-2xl border border-[var(--color-line)] bg-white/90 p-6 shadow-[0_20px_60px_-40px_rgba(11,31,28,0.45)]"
          noValidate
        >
          <h2 className="text-lg font-semibold">Admin sign in</h2>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
            Use client-owned credentials from environment bootstrap.
          </p>

          <label className="mt-6 block text-sm font-medium">
            Email
            <input
              type="email"
              autoComplete="username"
              className="mt-1.5 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-fog)] px-3 py-2.5 outline-none ring-[var(--color-accent)] focus:ring-2"
              {...register("email")}
            />
            {errors.email && (
              <span className="mt-1 block text-sm text-[var(--color-danger)]">
                {errors.email.message}
              </span>
            )}
          </label>

          <label className="mt-4 block text-sm font-medium">
            Password
            <input
              type="password"
              autoComplete="current-password"
              className="mt-1.5 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-fog)] px-3 py-2.5 outline-none ring-[var(--color-accent)] focus:ring-2"
              {...register("password")}
            />
            {errors.password && (
              <span className="mt-1 block text-sm text-[var(--color-danger)]">
                {errors.password.message}
              </span>
            )}
          </label>

          {mutation.isError && (
            <p
              role="alert"
              className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--color-danger)]"
            >
              {mutation.error instanceof Error
                ? mutation.error.message
                : "Sign in failed"}
            </p>
          )}

          <button
            type="submit"
            disabled={mutation.isPending}
            aria-busy={mutation.isPending}
            className="mt-6 w-full rounded-xl bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
          >
            {mutation.isPending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
