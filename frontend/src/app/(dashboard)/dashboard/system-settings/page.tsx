"use client";

import React, { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Settings, Upload, ImageIcon } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { settingsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";

// ─── Zod Schema ─────────────────────────────────────────────────────────────

const appNameSchema = z.object({
  appName: z
    .string({ required_error: "Nama aplikasi wajib diisi" })
    .min(1, { message: "Nama aplikasi tidak boleh kosong" })
    .max(100, { message: "Nama aplikasi maksimal 100 karakter" })
    .transform((val) => val.trim())
    .refine((val) => val.length > 0, {
      message: "Nama aplikasi tidak boleh hanya berisi spasi",
    }),
});

type AppNameFormData = z.infer<typeof appNameSchema>;

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_LOGO_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_LOGO_FORMATS = ["image/jpeg", "image/jpg", "image/png", "image/svg+xml"];
const ALLOWED_LOGO_EXTENSIONS = [".jpg", ".jpeg", ".png", ".svg"];

// ─── Main Component ─────────────────────────────────────────────────────────

export default function SystemSettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  // Data state
  const [currentAppName, setCurrentAppName] = useState("");
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // App name save state
  const [isSavingName, setIsSavingName] = useState(false);

  // Logo upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // React Hook Form for app name
  const form = useForm<AppNameFormData>({
    resolver: zodResolver(appNameSchema),
    defaultValues: {
      appName: "",
    },
  });

  // ─── Fetch Current Settings ─────────────────────────────────────────────────

  useEffect(() => {
    if (!authLoading && user) {
      fetchSettings();
    }
  }, [authLoading, user]);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await settingsApi.get();
      const data = response.data?.data || response.data;

      const name = data?.appName || "PoldaHelp Kalsel";
      form.reset({ appName: name });
      setCurrentAppName(name);

      if (data?.appLogo) {
        const logoUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/settings/logo`;
        setCurrentLogoUrl(logoUrl);
      } else {
        setCurrentLogoUrl(null);
      }
    } catch {
      toast({
        title: "Gagal",
        description: "Gagal memuat pengaturan sistem.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ─── App Name Form Submit ─────────────────────────────────────────────────────

  const handleSaveAppName = async (data: AppNameFormData) => {
    setIsSavingName(true);

    try {
      await settingsApi.update({ appName: data.appName });
      setCurrentAppName(data.appName);
      form.reset({ appName: data.appName });

      toast({
        title: "Berhasil",
        description: "Nama aplikasi berhasil diperbarui. Perubahan akan terlihat pada navigasi berikutnya.",
      });
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
      };
      toast({
        title: "Gagal",
        description: axiosError.response?.data?.message || "Gagal memperbarui nama aplikasi.",
        variant: "destructive",
      });
    } finally {
      setIsSavingName(false);
    }
  };

  // ─── Logo Upload Handlers ───────────────────────────────────────────────────

  const validateLogoFile = (file: File): string | null => {
    // Check file size
    if (file.size > MAX_LOGO_SIZE) {
      return "Ukuran file melebihi batas maksimal 5MB.";
    }

    // Check file format by MIME type
    if (!ALLOWED_LOGO_FORMATS.includes(file.type)) {
      // Also check by extension as fallback
      const extension = "." + file.name.split(".").pop()?.toLowerCase();
      if (!ALLOWED_LOGO_EXTENSIONS.includes(extension)) {
        return "Format file tidak didukung. Gunakan format: JPG, JPEG, PNG, atau SVG.";
      }
    }

    return null;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateLogoFile(file);
    if (error) {
      setLogoError(error);
      setSelectedFile(null);
      setPreviewUrl(null);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setLogoError(null);
    setSelectedFile(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadLogo = async () => {
    if (!selectedFile) return;

    setIsUploadingLogo(true);
    setLogoError(null);

    try {
      const formData = new FormData();
      formData.append("logo", selectedFile);

      await settingsApi.uploadLogo(formData);

      // Update current logo URL with cache-busting
      const logoUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/settings/logo?t=${Date.now()}`;
      setCurrentLogoUrl(logoUrl);
      setSelectedFile(null);
      setPreviewUrl(null);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      toast({
        title: "Berhasil",
        description: "Logo aplikasi berhasil diperbarui. Perubahan akan terlihat pada navigasi berikutnya.",
      });
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
      };
      toast({
        title: "Gagal",
        description: axiosError.response?.data?.message || "Gagal mengunggah logo.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };

  // ─── Loading State ──────────────────────────────────────────────────────────

  if (authLoading || isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengaturan Sistem</h1>
          <p className="text-muted-foreground">
            Kelola nama dan logo aplikasi
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-24" />
          </div>
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-32 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pengaturan Sistem</h1>
        <p className="text-muted-foreground">
          Kelola nama dan logo aplikasi
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* App Name Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Nama Aplikasi
            </CardTitle>
            <CardDescription>
              Nama yang ditampilkan di sidebar dan halaman login
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSaveAppName)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="appName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Aplikasi</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Masukkan nama aplikasi"
                          maxLength={100}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {(field.value || "").trim().length}/100 karakter
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={isSavingName || form.watch("appName")?.trim() === currentAppName}
                >
                  {isSavingName ? "Menyimpan..." : "Simpan Nama"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Logo Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Logo Aplikasi
            </CardTitle>
            <CardDescription>
              Logo yang ditampilkan di sidebar dan halaman login (maks. 5MB, format: JPG, PNG, SVG)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Logo Preview */}
            <div className="space-y-2">
              <Label>Logo Saat Ini</Label>
              <div className="flex items-center justify-center w-32 h-32 rounded-lg border bg-muted/50 overflow-hidden">
                {currentLogoUrl ? (
                  <img
                    src={currentLogoUrl}
                    alt="Logo aplikasi saat ini"
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <ImageIcon className="h-8 w-8" />
                    <span className="text-xs">Belum ada logo</span>
                  </div>
                )}
              </div>
            </div>

            {/* New Logo Preview (if selected) */}
            {previewUrl && (
              <div className="space-y-2">
                <Label>Preview Logo Baru</Label>
                <div className="flex items-center justify-center w-32 h-32 rounded-lg border border-primary bg-muted/50 overflow-hidden">
                  <img
                    src={previewUrl}
                    alt="Preview logo baru"
                    className="w-full h-full object-contain p-2"
                  />
                </div>
              </div>
            )}

            {/* File Input */}
            <div className="space-y-2">
              <Label htmlFor="logoFile">Pilih File Logo</Label>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  id="logoFile"
                  type="file"
                  accept=".jpg,.jpeg,.png,.svg"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleChooseFile}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Pilih File
                </Button>
                {selectedFile && (
                  <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {selectedFile.name}
                  </span>
                )}
              </div>
              {logoError && (
                <p className="text-sm text-destructive">{logoError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Format: JPG, JPEG, PNG, SVG. Maksimal 5MB.
              </p>
            </div>

            <Button
              onClick={handleUploadLogo}
              disabled={!selectedFile || isUploadingLogo}
            >
              {isUploadingLogo ? "Mengunggah..." : "Upload Logo"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
