"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { publicBookingUrl } from "@/lib/public-booking-site";
import { fetchBookingPublicSegment } from "@/lib/utils/profile-booking";

export function BookingLinkCard() {
  const [bookingLink, setBookingLink] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const slug = await fetchBookingPublicSegment(supabase, user.id);

      if (typeof window !== "undefined") {
        setBookingLink(publicBookingUrl(slug, window.location.origin));
      }
    };

    load();
  }, []);

  const handleCopy = async () => {
    if (!bookingLink) return;
    await navigator.clipboard.writeText(bookingLink);
    setFeedback("Link copiado!");
    setTimeout(() => setFeedback(""), 2000);
  };

  return (
    <article className="elevated-card p-4 md:col-span-6">
      <h2 className="text-sm font-medium text-[#6E7380]">Link de agendamento</h2>
      <p className="mt-3 break-all text-sm font-medium text-[#1F2430]">
        {bookingLink || "Carregando link..."}
      </p>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={handleCopy}
          disabled={!bookingLink}
          className="btn-primary px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-70"
        >
          Copiar link
        </button>
        {feedback ? <span className="text-xs text-[#8B5CF6]">{feedback}</span> : null}
      </div>
    </article>
  );
}
