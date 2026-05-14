"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";

interface RatingDisplayProps {
  bintang: number;
  feedback: string;
  createdAt: string;
}

function formatTanggal(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return "-";
    }
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

function StarRating({ bintang }: { bintang: number }) {
  const clampedRating = Math.min(5, Math.max(1, Math.round(bintang)));

  return (
    <div className="flex items-center gap-0.5" aria-label={`Rating ${clampedRating} dari 5 bintang`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`size-5 ${
            i < clampedRating
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-none text-muted-foreground/40'
          }`}
        />
      ))}
      <span className="ml-2 text-sm text-muted-foreground">
        {clampedRating}/5
      </span>
    </div>
  );
}

export function RatingDisplay({ bintang, feedback, createdAt }: RatingDisplayProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200">Rating &amp; Feedback</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <StarRating bintang={bintang} />

        {feedback && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Feedback</p>
            <p className="text-sm whitespace-pre-wrap">{feedback}</p>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Dinilai pada {formatTanggal(createdAt)}
        </p>
      </CardContent>
    </Card>
  );
}
