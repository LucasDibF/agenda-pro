"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export function BookingLinkCard() {
  const [bookingLink, setBookingLink] = useState("");
  const [bookingCode, setBookingCode] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("booking_code")
        .eq("id", user.id)
        .maybeSingle();

      const code = profile?.booking_code || user.id;
      setBookingCode(code);

      if (typeof window !== "undefined") {
        setBookingLink(`${window.location.origin}/booking/${code}`);
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
      <h2 className="text-sm font-medium text-[#6f5852]">Link publico de agendamento</h2>
      <p className="mt-2 text-sm text-[#2f231f]">
        Codigo de agendamento:{" "}
        <span className="font-semibold">{bookingCode || "Carregando..."}</span>
      </p>
      <p className="mt-2 break-all text-sm text-[#2f231f]">
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
        {feedback ? <span className="text-xs text-green-700">{feedback}</span> : null}
      </div>
    </article>
  );
}
