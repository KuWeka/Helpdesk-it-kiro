"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTheme } from "next-themes";
import {
  Loader2,
  Upload,
  User,
  Shield,
  Palette,
  AlertTriangle,
  Camera,
  Sun,
  Moon,
} from "lucide-react";

import {
  updateProfileSchema,
  changePasswordSchema,
  UpdateProfileFormData,
  ChangePasswordFormData,
} from "@/schemas/profile";
import { profileApi } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/components/ui/use-toast";
// Language constants (i18n removed — inlined here)
type Locale = 'id' | 'en';
const locales: Locale[] = ['id', 'en'];
const localeNames: Record<Locale, string> = { id: 'Bahasa Indonesia', en: 'English' };
import { getFileExtension, getInitials } from "@/lib/formatters";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_PHOTO_EXTENSIONS = ["jpg", "jpeg", "png"];
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// ─── Helpers ────────────────────────────────────────────────────────────────


// ─── Types ──────────────────────────────────────────────────────────────────

interface UserProfile {
  id: string;
  nama: string;
  email: string;
  nomorWhatsApp: string;
  role: string;
  divisi: string | null;
  foto: string | null;
  tema: string;
  bahasa: string;
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Fetch user profile
  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await profileApi.get();
        const data = response.data?.data || response.data;
        setProfile(data);
      } catch {
        toast({
          variant: "destructive",
          title: "Gagal memuat profil",
          description: "Terjadi kesalahan saat memuat data profil.",
        });
      } finally {
        setProfileLoading(false);
      }
    }

    if (user) {
      fetchProfile();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ─── Loading State ──────────────────────────────────────────────────────

  if (authLoading || profileLoading) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengaturan</h1>
          <p className="text-muted-foreground">
            Kelola profil, keamanan, dan preferensi akun Anda
          </p>
        </div>
        {/* Tabs skeleton */}
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
        {/* Profile form skeleton */}
        <div className="space-y-6">
          {/* Photo card skeleton */}
          <div className="rounded-lg border bg-card p-6">
            <Skeleton className="h-5 w-24 mb-4" />
            <div className="flex items-center gap-6">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-9 w-24" />
              </div>
            </div>
          </div>
          {/* Form fields skeleton */}
          <div className="rounded-lg border bg-card p-6 space-y-6">
            <Skeleton className="h-5 w-32 mb-4" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-28" />
          </div>
        </div>
      </div>
    );
  }

  if (!user || !profile) return null;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pengaturan</h1>
        <p className="text-muted-foreground">
          Kelola profil, keamanan, dan preferensi akun Anda
        </p>
      </div>

      <Tabs defaultValue="profil" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profil" className="gap-2">
            <User className="h-4 w-4" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="keamanan" className="gap-2">
            <Shield className="h-4 w-4" />
            Keamanan
          </TabsTrigger>
          <TabsTrigger value="preferensi" className="gap-2">
            <Palette className="h-4 w-4" />
            Preferensi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profil">
          <ProfileTab
            profile={profile}
            isSatker={user.role === "SATKER"}
            onProfileUpdate={setProfile}
          />
        </TabsContent>

        <TabsContent value="keamanan">
          <SecurityTab />
        </TabsContent>

        <TabsContent value="preferensi">
          <PreferencesTab profile={profile} onProfileUpdate={setProfile} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Profile Tab ────────────────────────────────────────────────────────────

interface ProfileTabProps {
  profile: UserProfile;
  isSatker: boolean;
  onProfileUpdate: (profile: UserProfile) => void;
}

function ProfileTab({ profile, isSatker, onProfileUpdate }: ProfileTabProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      nama: profile.nama,
      nomorWhatsApp: profile.nomorWhatsApp,
      divisi: profile.divisi || undefined,
    },
  });

  const divisiEmpty = isSatker && !profile.divisi;

  // ─── Photo Upload ─────────────────────────────────────────────────────

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = getFileExtension(file.name);
    if (!ALLOWED_PHOTO_EXTENSIONS.includes(ext)) {
      toast({
        variant: "destructive",
        title: "Format tidak didukung",
        description: "Foto profil harus berformat JPG, JPEG, atau PNG.",
      });
      return;
    }

    if (file.size > MAX_PHOTO_SIZE) {
      toast({
        variant: "destructive",
        title: "Ukuran file terlalu besar",
        description: "Foto profil tidak boleh melebihi 5MB.",
      });
      return;
    }

    uploadPhoto(file);
  }

  async function uploadPhoto(file: File) {
    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);

      const response = await profileApi.uploadPhoto(formData);
      const updatedProfile = response.data?.data || response.data;

      // Update preview
      setPhotoPreview(URL.createObjectURL(file));
      onProfileUpdate({
        ...profile,
        foto: updatedProfile?.foto || profile.foto,
      });

      toast({
        title: "Foto berhasil diperbarui",
        description: "Foto profil Anda telah berhasil diunggah.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Gagal mengunggah foto",
        description: "Terjadi kesalahan saat mengunggah foto profil.",
      });
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // ─── Profile Form Submit ──────────────────────────────────────────────

  async function onSubmit(data: UpdateProfileFormData) {
    setIsSubmitting(true);
    try {
      const payload: Record<string, string> = {
        nama: data.nama,
        nomorWhatsApp: data.nomorWhatsApp,
      };

      if (isSatker && data.divisi) {
        payload.divisi = data.divisi;
      }

      const response = await profileApi.update(payload);
      const updatedProfile = response.data?.data || response.data;

      onProfileUpdate({
        ...profile,
        nama: updatedProfile?.nama || data.nama,
        nomorWhatsApp: updatedProfile?.nomorWhatsApp || data.nomorWhatsApp,
        divisi: isSatker
          ? updatedProfile?.divisi || data.divisi || null
          : profile.divisi,
      });

      toast({
        title: "Profil berhasil diperbarui",
        description: "Data profil Anda telah berhasil disimpan.",
      });
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string } };
      };
      toast({
        variant: "destructive",
        title: "Gagal memperbarui profil",
        description:
          err?.response?.data?.message ||
          "Terjadi kesalahan saat menyimpan profil.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // ─── Photo URL ────────────────────────────────────────────────────────

  const photoUrl = photoPreview
    ? photoPreview
    : profile.foto
      ? `${API_BASE_URL}/profile/photo/${profile.id}`
      : null;

  return (
    <div className="space-y-6">
      {/* Divisi Required Banner for Satker */}
      {divisiEmpty && (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="text-amber-800 dark:text-amber-300">
            Divisi Belum Diisi
          </AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-400">
            Anda belum mengisi divisi. Lengkapi field divisi di bawah agar dapat
            membuat tiket.
          </AlertDescription>
        </Alert>
      )}

      {/* Photo Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle>Foto Profil</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={photoUrl || undefined} alt={profile.nama} />
                <AvatarFallback className="text-2xl">
                  {getInitials(profile.nama)}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                aria-label="Unggah foto profil"
              >
                {isUploadingPhoto ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Unggah foto baru</p>
              <p className="text-xs text-muted-foreground">
                Format: JPG, JPEG, PNG. Maks. 5MB.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
              >
                {isUploadingPhoto ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Pilih Foto
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png"
              className="hidden"
              onChange={handlePhotoSelect}
              disabled={isUploadingPhoto}
            />
          </div>
        </CardContent>
      </Card>

      {/* Profile Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Informasi Profil</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Email (read-only) */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input value={profile.email} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">
                  Email tidak dapat diubah.
                </p>
              </div>

              {/* Nama */}
              <FormField
                control={form.control}
                name="nama"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Lengkap</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Masukkan nama lengkap"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Nomor WhatsApp */}
              <FormField
                control={form.control}
                name="nomorWhatsApp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nomor WhatsApp</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Contoh: 081234567890"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Masukkan 10-15 digit angka tanpa spasi atau tanda baca.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Divisi (Satker only) */}
              {isSatker && (
                <FormField
                  control={form.control}
                  name="divisi"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Divisi</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Masukkan nama divisi/satker"
                          disabled={isSubmitting}
                          className={
                            divisiEmpty
                              ? "ring-2 ring-amber-400 dark:ring-amber-600"
                              : ""
                          }
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Divisi/satuan kerja Anda. Wajib diisi sebelum membuat
                        tiket.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Submit Button */}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Simpan Profil
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Security Tab ───────────────────────────────────────────────────────────

function SecurityTab() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmError, setConfirmError] = useState("");

  const form = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
    },
  });

  // Watch newPassword for confirm validation
  const newPasswordValue = form.watch("newPassword");

  function validateConfirm(value: string) {
    setConfirmPassword(value);
    if (value && value !== newPasswordValue) {
      setConfirmError("Password tidak cocok.");
    } else {
      setConfirmError("");
    }
  }

  async function onSubmit(data: ChangePasswordFormData) {
    // Check confirm password match before submitting
    if (confirmPassword !== data.newPassword) {
      setConfirmError("Password tidak cocok.");
      return;
    }

    setIsSubmitting(true);
    try {
      await profileApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      toast({
        title: "Password berhasil diubah",
        description: "Password Anda telah berhasil diperbarui.",
      });

      form.reset();
      setConfirmPassword("");
      setConfirmError("");
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string; code?: string } };
      };
      const code = err?.response?.data?.code;
      const message = err?.response?.data?.message;

      if (code === "INVALID_CURRENT_PASSWORD") {
        form.setError("currentPassword", {
          message: "Password saat ini tidak sesuai.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Gagal mengubah password",
          description:
            message || "Terjadi kesalahan saat mengubah password.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ubah Password</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Current Password */}
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password Saat Ini</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Masukkan password saat ini"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* New Password */}
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password Baru</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Masukkan password baru"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Minimal 8 karakter, mengandung minimal 1 huruf kapital dan 1
                    angka.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Confirm New Password */}
            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Konfirmasi Password Baru
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Ulangi password baru"
                disabled={isSubmitting}
                value={confirmPassword}
                onChange={(e) => validateConfirm(e.target.value)}
              />
              {confirmError && (
                <p className="text-sm font-medium text-destructive">
                  {confirmError}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Ubah Password
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// ─── Preferences Tab ────────────────────────────────────────────────────────

interface PreferencesTabProps {
  profile: UserProfile;
  onProfileUpdate: (profile: UserProfile) => void;
}

function PreferencesTab({ profile, onProfileUpdate }: PreferencesTabProps) {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [currentLanguage, setCurrentLanguage] = useState<Locale>(
    (profile.bahasa as Locale) || "id"
  );

  // ─── Theme Toggle ─────────────────────────────────────────────────────

  function handleThemeChange(newTheme: string) {
    setTheme(newTheme);

    // Persist to backend
    profileApi
      .update({ nama: profile.nama, nomorWhatsApp: profile.nomorWhatsApp })
      .catch(() => {
        // Theme is already applied via next-themes localStorage
        // Backend persistence is best-effort
      });

    toast({
      title: "Tema diperbarui",
      description: `Tema berhasil diubah ke ${newTheme === "dark" ? "gelap" : "terang"}.`,
    });
  }

  // ─── Language Change ──────────────────────────────────────────────────

  async function handleLanguageChange(newLang: string) {
    const lang = newLang as Locale;
    setCurrentLanguage(lang);

    try {
      // Persist language preference to backend
      await profileApi.update({
        nama: profile.nama,
        nomorWhatsApp: profile.nomorWhatsApp,
      });

      onProfileUpdate({ ...profile, bahasa: lang });

      toast({
        title: "Bahasa diperbarui",
        description: `Bahasa berhasil diubah ke ${localeNames[lang]}.`,
      });
    } catch {
      // Revert on failure
      setCurrentLanguage((profile.bahasa as Locale) || "id");
      toast({
        variant: "destructive",
        title: "Gagal mengubah bahasa",
        description: "Terjadi kesalahan saat menyimpan preferensi bahasa.",
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Theme Card */}
      <Card>
        <CardHeader>
          <CardTitle>Tema Tampilan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Pilih tema tampilan yang Anda inginkan. Perubahan akan langsung
            diterapkan.
          </p>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => handleThemeChange("light")}
              className={`flex flex-1 flex-col items-center gap-3 rounded-lg border-2 p-6 transition-colors ${
                theme === "light"
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-muted-foreground/25"
              }`}
              aria-label="Tema terang"
              aria-pressed={theme === "light"}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <Sun className="h-6 w-6 text-amber-600" />
              </div>
              <span className="text-sm font-medium">Terang</span>
            </button>

            <button
              type="button"
              onClick={() => handleThemeChange("dark")}
              className={`flex flex-1 flex-col items-center gap-3 rounded-lg border-2 p-6 transition-colors ${
                theme === "dark"
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-muted-foreground/25"
              }`}
              aria-label="Tema gelap"
              aria-pressed={theme === "dark"}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <Moon className="h-6 w-6 text-slate-600 dark:text-slate-300" />
              </div>
              <span className="text-sm font-medium">Gelap</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Language Card */}
      <Card>
        <CardHeader>
          <CardTitle>Bahasa</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Pilih bahasa antarmuka yang Anda inginkan. Perubahan akan langsung
            diterapkan.
          </p>
          <Select
            value={currentLanguage}
            onValueChange={handleLanguageChange}
          >
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue placeholder="Pilih bahasa" />
            </SelectTrigger>
            <SelectContent>
              {locales.map((locale) => (
                <SelectItem key={locale} value={locale}>
                  {localeNames[locale]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  );
}
