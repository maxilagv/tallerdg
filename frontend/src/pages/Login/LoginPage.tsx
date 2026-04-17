import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { authApi } from "../../features/auth/api";
import { Button } from "../../shared/ui/Button";
import { Card } from "../../shared/ui/Card";
import { Input } from "../../shared/ui/Input";
import { useAuthStore } from "../../shared/store/authStore";
import { getErrorMessage } from "../../shared/utils/errorMessage";
import { useAppNombre } from "../../shared/hooks/useAppNombre";

const schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Ingresá tu contraseña"),
});

type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  const setSession = useAuthStore((state) => state.setSession);
  const status = useAuthStore((state) => state.status);
  const appNombre = useAppNombre();

  useEffect(() => {
    if (status === "authenticated") {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate, status]);

  const mutation = useMutation({
    mutationFn: (payload: FormData) => authApi.login(payload),
    onSuccess: ({ data }) => {
      setSession(data.accessToken, data.empleado);
      navigate("/dashboard", { replace: true });
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border-white/5 bg-surface/90">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
            <Wrench size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text">{appNombre}</h1>
            <p className="mt-1 text-sm text-text-muted">Iniciá sesión para entrar al sistema</p>
          </div>
        </div>

        <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
          <Input label="Email" type="email" placeholder="admin@tallerpro.com" error={errors.email?.message} {...register("email")} />
          <Input
            label="Contraseña"
            type="password"
            placeholder="********"
            error={errors.password?.message}
            {...register("password")}
          />

          {mutation.isError ? (
            <p className="text-sm text-red-300">{getErrorMessage(mutation.error)}</p>
          ) : null}

          <Button type="submit" size="lg" className="w-full" loading={mutation.isPending}>
            Entrar
          </Button>
        </form>
      </Card>
    </div>
  );
}
