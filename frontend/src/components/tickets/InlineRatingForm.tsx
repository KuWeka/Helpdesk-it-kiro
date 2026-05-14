'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Star, Loader2, CheckCircle2 } from 'lucide-react';

import { ratingApi } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';

// ─── Frontend-specific schema (500 char limit per Req 26.6) ─────────────────

const inlineRatingSchema = z.object({
  bintang: z
    .number({ required_error: 'Rating bintang wajib dipilih' })
    .int({ message: 'Rating bintang harus berupa bilangan bulat' })
    .min(1, { message: 'Rating bintang minimal 1' })
    .max(5, { message: 'Rating bintang maksimal 5' }),
  feedback: z
    .string({ required_error: 'Feedback wajib diisi' })
    .min(1, { message: 'Feedback tidak boleh kosong' })
    .max(500, { message: 'Feedback tidak boleh lebih dari 500 karakter' })
    .refine((val) => val.trim().length > 0, {
      message: 'Feedback tidak boleh hanya berisi spasi',
    }),
});

type InlineRatingFormData = z.infer<typeof inlineRatingSchema>;

// ─── Props ──────────────────────────────────────────────────────────────────

interface InlineRatingFormProps {
  ticketId: string;
  onRatingSubmitted?: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function InlineRatingForm({
  ticketId,
  onRatingSubmitted,
}: InlineRatingFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);
  const { toast } = useToast();

  const form = useForm<InlineRatingFormData>({
    resolver: zodResolver(inlineRatingSchema),
    defaultValues: {
      bintang: 0,
      feedback: '',
    },
  });

  const selectedRating = form.watch('bintang');

  async function onSubmit(data: InlineRatingFormData) {
    setIsLoading(true);

    try {
      await ratingApi.submit(ticketId, {
        bintang: data.bintang,
        feedback: data.feedback,
      });

      setIsSubmitted(true);
      toast({
        title: 'Rating berhasil dikirim',
        description: 'Terima kasih atas feedback Anda.',
      });
      onRatingSubmitted?.();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const message =
        err?.response?.data?.message ||
        'Gagal mengirim rating. Silakan coba lagi.';

      toast({
        variant: 'destructive',
        title: 'Gagal mengirim rating',
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Success State ──────────────────────────────────────────────────────

  if (isSubmitted) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
        <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
          <CheckCircle2 className="h-5 w-5" />
          <p className="text-sm font-medium">
            Rating berhasil dikirim. Terima kasih atas feedback Anda.
          </p>
        </div>
      </div>
    );
  }

  // ─── Rating Form ────────────────────────────────────────────────────────

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div>
        <h3 className="text-base font-semibold">Beri Rating</h3>
        <p className="text-sm text-muted-foreground">
          Berikan penilaian Anda terhadap penyelesaian tiket ini.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Star Rating Field */}
          <FormField
            control={form.control}
            name="bintang"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rating Bintang</FormLabel>
                <FormControl>
                  <div
                    className="flex items-center gap-1"
                    role="radiogroup"
                    aria-label="Rating bintang"
                  >
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isFilled =
                        star <= (hoveredStar || field.value || 0);

                      return (
                        <button
                          key={star}
                          type="button"
                          role="radio"
                          aria-checked={field.value === star}
                          aria-label={`${star} bintang`}
                          disabled={isLoading}
                          className="rounded-sm p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => field.onChange(star)}
                          onMouseEnter={() => setHoveredStar(star)}
                          onMouseLeave={() => setHoveredStar(0)}
                        >
                          <Star
                            className={`h-7 w-7 transition-colors ${
                              isFilled
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'fill-none text-muted-foreground hover:text-yellow-300'
                            }`}
                          />
                        </button>
                      );
                    })}
                    {selectedRating > 0 && (
                      <span className="ml-2 text-sm text-muted-foreground">
                        {selectedRating}/5
                      </span>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Feedback Textarea Field */}
          <FormField
            control={form.control}
            name="feedback"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Feedback</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Tuliskan feedback Anda mengenai penyelesaian tiket ini..."
                    disabled={isLoading}
                    maxLength={500}
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {field.value.length}/500 karakter
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit Button */}
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Kirim Rating
          </Button>
        </form>
      </Form>
    </div>
  );
}
