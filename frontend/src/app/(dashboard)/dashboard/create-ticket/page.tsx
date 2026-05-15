"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Upload, X, FileText } from "lucide-react";

import { createTicketSchema, CreateTicketFormData } from "@/schemas/ticket";
import { ticketApi, profileApi } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/components/ui/use-toast";
import { DivisiRequiredBanner } from "@/components/shared/DivisiRequiredBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getFileExtension, formatFileSize } from "@/lib/formatters";

// ─── Constants ──────────────────────────────────────────────────────────────

const KATEGORI_OPTIONS = [
  { value: "HARDWARE", label: "Hardware" },
  { value: "SOFTWARE", label: "Software" },
  { value: "JARINGAN", label: "Jaringan" },
  { value: "EMAIL", label: "Email" },
  { value: "WEBSITE", label: "Website" },
  { value: "LAINNYA", label: "Lainnya" },
];

const MAX_FILES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
];

// ─── Page Component ─────────────────────────────────────────────────────────

export default function CreateTicketPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [divisi, setDivisi] = useState<string | null | undefined>(undefined);
  const [profileLoading, setProfileLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<CreateTicketFormData>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      judul: "",
      deskripsi: "",
      kategori: undefined,
      lokasi: "",
    },
  });

  // Fetch user profile to check divisi
  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await profileApi.get();
        const profile = response.data?.data || response.data;
        setDivisi(profile?.divisi || null);
      } catch {
        setDivisi(null);
      } finally {
        setProfileLoading(false);
      }
    }

    if (user) {
      fetchProfile();
    }
  }, [user]);

  // ─── File Handling ──────────────────────────────────────────────────────

  function validateFiles(newFiles: File[]): { valid: File[]; errors: string[] } {
    const errors: string[] = [];
    const valid: File[] = [];

    for (const file of newFiles) {
      const ext = getFileExtension(file.name);

      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        errors.push(
          `"${file.name}" — format tidak diizinkan. Format yang diizinkan: ${ALLOWED_EXTENSIONS.join(", ")}`
        );
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        errors.push(
          `"${file.name}" — ukuran file melebihi 5MB (${formatFileSize(file.size)})`
        );
        continue;
      }

      valid.push(file);
    }

    return { valid, errors };
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(e.target.files || []);
    setFileErrors([]);

    if (files.length + selectedFiles.length > MAX_FILES) {
      setFileErrors([`Maksimal ${MAX_FILES} file yang dapat diunggah.`]);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const { valid, errors } = validateFiles(selectedFiles);

    if (errors.length > 0) {
      setFileErrors(errors);
    }

    if (valid.length > 0) {
      setFiles((prev) => [...prev, ...valid]);
    }

    // Reset input so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFileErrors([]);
  }

  // ─── Form Submit ────────────────────────────────────────────────────────

  async function onSubmit(data: CreateTicketFormData) {
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("judul", data.judul);
      formData.append("deskripsi", data.deskripsi);
      formData.append("kategori", data.kategori);
      formData.append("lokasi", data.lokasi);

      // Append files
      for (const file of files) {
        formData.append("attachments", file);
      }

      await ticketApi.create(formData);

      toast({
        title: "Tiket berhasil dibuat",
        description: "Tiket Anda telah berhasil dikirim dan sedang menunggu proses.",
      });

      router.push("/dashboard/tickets");
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string; code?: string } };
      };
      const code = err?.response?.data?.code;
      const message = err?.response?.data?.message;

      if (code === "UNRATED_TICKETS_EXIST") {
        toast({
          variant: "destructive",
          title: "Tidak dapat membuat tiket",
          description:
            message ||
            "Anda memiliki tiket selesai yang belum diberi rating. Harap beri rating terlebih dahulu.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Gagal membuat tiket",
          description: message || "Terjadi kesalahan. Silakan coba lagi.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // ─── Loading State ──────────────────────────────────────────────────────

  if (authLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  // ─── Divisi Check ───────────────────────────────────────────────────────

  if (!divisi) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Buat Tiket Baru</h1>
          <p className="text-muted-foreground">
            Ajukan permintaan bantuan IT
          </p>
        </div>
        <DivisiRequiredBanner
          message="Anda belum mengisi divisi. Lengkapi profil Anda terlebih dahulu sebelum membuat tiket."
          redirectTo="/dashboard/settings"
        />
      </div>
    );
  }

  // ─── Render Form ────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Buat Tiket Baru</h1>
        <p className="text-muted-foreground">
          Isi formulir di bawah untuk mengajukan permintaan bantuan IT
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Formulir Tiket</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Judul */}
              <FormField
                control={form.control}
                name="judul"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Judul Tiket</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Contoh: Komputer tidak bisa menyala"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Deskripsi */}
              <FormField
                control={form.control}
                name="deskripsi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deskripsi</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Jelaskan masalah yang Anda alami secara detail..."
                        className="min-h-[120px] resize-y"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Kategori */}
              <FormField
                control={form.control}
                name="kategori"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih kategori masalah" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {KATEGORI_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Lokasi */}
              <FormField
                control={form.control}
                name="lokasi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lokasi</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Contoh: Ruang IT Lantai 2, Gedung A"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* File Upload */}
              <div className="space-y-3">
                <FormLabel>Lampiran (Opsional)</FormLabel>
                <p className="text-xs text-muted-foreground">
                  Maks. {MAX_FILES} file, ukuran maks. 5MB per file. Format:{" "}
                  {ALLOWED_EXTENSIONS.join(", ")}
                </p>

                <div
                  className="flex cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/25 p-6 transition-colors hover:border-muted-foreground/50"
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      fileInputRef.current?.click();
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label="Pilih file untuk diunggah"
                >
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Klik untuk memilih file atau seret file ke sini
                    </p>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(",")}
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                />

                {/* File Errors */}
                {fileErrors.length > 0 && (
                  <div className="space-y-1">
                    {fileErrors.map((error, idx) => (
                      <p key={idx} className="text-sm text-destructive">
                        {error}
                      </p>
                    ))}
                  </div>
                )}

                {/* File List */}
                {files.length > 0 && (
                  <div className="space-y-2">
                    {files.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate text-sm">{file.name}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            ({formatFileSize(file.size)})
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => removeFile(index)}
                          disabled={isSubmitting}
                          aria-label={`Hapus file ${file.name}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground">
                      {files.length}/{MAX_FILES} file dipilih
                    </p>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Kirim Tiket
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
