'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { passwordSchema } from '@/schemas/auth';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Alert } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';

// Schema for the reset password form with confirm password match validation
const resetPasswordFormSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, { message: 'Konfirmasi password tidak boleh kosong' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Password dan konfirmasi password tidak cocok',
    path: ['confirmPassword'],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  // Redirect to login after successful reset
  useEffect(() => {
    if (isSuccess) {
      const timeout = setTimeout(() => {
        router.push('/login');
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [isSuccess, router]);

  // If no token in URL, show error state
  if (!token) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">
            Reset Password
          </h2>
        </div>
        <Alert variant="destructive" className="text-sm">
          <p>
            Link reset password tidak valid. Token tidak ditemukan di URL.
            Silakan minta link reset password baru.
          </p>
        </Alert>
        <div className="text-center">
          <Link
            href="/forgot-password"
            className="text-sm text-primary hover:underline"
          >
            Minta link reset password baru
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">
            Password Berhasil Direset
          </h2>
        </div>
        <Alert className="text-sm border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          <p>
            Password Anda telah berhasil diperbarui. Anda akan dialihkan ke
            halaman login dalam beberapa detik...
          </p>
        </Alert>
        <div className="text-center">
          <Link
            href="/login"
            className="text-sm text-primary hover:underline"
          >
            Klik di sini jika tidak dialihkan otomatis
          </Link>
        </div>
      </div>
    );
  }

  async function onSubmit(values: ResetPasswordFormValues) {
    setIsLoading(true);
    setServerError(null);

    try {
      await authApi.resetPassword({
        token: token!,
        newPassword: values.password,
      });

      setIsSuccess(true);
      toast({
        title: 'Berhasil',
        description: 'Password berhasil direset. Silakan login dengan password baru.',
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const message =
        err.response?.data?.message ||
        'Token tidak valid atau sudah kedaluwarsa. Silakan minta link reset password baru.';
      setServerError(message);
      toast({
        title: 'Gagal',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-foreground">
          Reset Password
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Masukkan password baru Anda
        </p>
      </div>

      {serverError && (
        <Alert variant="destructive" className="text-sm">
          <p>{serverError}</p>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password Baru</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Masukkan password baru"
                    autoComplete="new-password"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Konfirmasi Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Ulangi password baru"
                    autoComplete="new-password"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="text-xs text-muted-foreground">
            Password harus minimal 8 karakter, mengandung minimal 1 huruf
            kapital dan 1 angka.
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Memproses...' : 'Reset Password'}
          </Button>
        </form>
      </Form>

      <div className="text-center">
        <Link
          href="/login"
          className="text-sm text-primary hover:underline"
        >
          Kembali ke Login
        </Link>
      </div>
    </div>
  );
}
