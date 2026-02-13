import { useState } from "react";
import { contactSchema, type ContactInput } from "@shared/schemas/contact.schema";
import { api } from "../../api/client";

type FieldErrors = Partial<Record<keyof ContactInput, string>>;

export default function ContactForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSent(false);
    setFieldErrors({});

    const data = { fullName, email, phone, message };

    const parsed = contactSchema.safeParse(data);
    if (!parsed.success) {
      const flattened = parsed.error.flatten();
      const fe: FieldErrors = {};

      if (flattened.fieldErrors.fullName?.[0]) {
        fe.fullName = flattened.fieldErrors.fullName[0];
      }
      if (flattened.fieldErrors.email?.[0]) {
        fe.email = flattened.fieldErrors.email[0];
      }
      if (flattened.fieldErrors.phone?.[0]) {
        fe.phone = flattened.fieldErrors.phone[0];
      }
      if (flattened.fieldErrors.message?.[0]) {
        fe.message = flattened.fieldErrors.message[0];
      }

      setFieldErrors(fe);
      return;
    }

    try {
      setIsSending(true);
      await api.post("/contact", parsed.data);

      setSent(true);
      setFullName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } catch (err: any) {
      const backendMsg = err?.response?.data?.message;
      setErrorMsg(backendMsg || "Something went wrong. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
   <section className="bg-stone-200 rounded-3xl shadow-[0_18px_40px_rgba(24,20,15,0.08)] border border-amber-50 px-5 sm:px-7 py-7 sm:py-8">
      <h2 className="text-2xl sm:text-3xl font-semibold text-stone-900 mb-2">
        Send us a message
      </h2>
      <p className="text-base sm:text-lg text-stone-700 mb-5">
        Tell us about your dates, number of guests and any special requests.
      </p>

      {/* Contact info strip: email, phone, socials */}
      <div className="mb-6 rounded-2xl bg-white/70 border border-stone-200 px-3 sm:px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm sm:text-base text-stone-700 space-y-0.5">
          <div>
            Email:{" "}
            <a
              href="mailto:info@eaglevillas.com"
              className="font-medium text-amber-800 hover:text-amber-600"
            >
              eagleluxuryvillas@gmail.com
            </a>
          </div>
          <div>
            Phone:{" "}
            <a
              href="tel:+302101234567"
              className="font-medium text-amber-800 hover:text-amber-600"
            >
              +30 6942885021
            </a>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-3 text-sm sm:text-base text-red-700 bg-red-50 border border-red-200 rounded-2xl px-3 py-2">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name + Email */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-base font-medium text-stone-800">
              Full name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-base sm:text-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400/80 focus:border-amber-300"
            />
            {fieldErrors.fullName && (
              <p className="text-xs sm:text-sm text-red-600 mt-0.5">
                {fieldErrors.fullName}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-base font-medium text-stone-800">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-base sm:text-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400/80 focus:border-amber-300"
            />
            {fieldErrors.email && (
              <p className="text-xs sm:text-sm text-red-600 mt-0.5">
                {fieldErrors.email}
              </p>
            )}
          </div>
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <label className="text-base font-medium text-stone-800">
            Phone (optional)
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+30 ..."
            className="w-full rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-base sm:text-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400/80 focus:border-amber-300"
          />
          {fieldErrors.phone && (
            <p className="text-xs sm:text-sm text-red-600 mt-0.5">
              {fieldErrors.phone}
            </p>
          )}
        </div>

        {/* Message */}
        <div className="space-y-1.5">
          <label className="text-base font-medium text-stone-800">
            How can we help?
          </label>
          <textarea
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us your dates, number of guests and any questions you have."
            className="w-full rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-base sm:text-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400/80 focus:border-amber-300 resize-none"
          />
          {fieldErrors.message && (
            <p className="text-xs sm:text-sm text-red-600 mt-0.5">
              {fieldErrors.message}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2">
          <button
            type="submit"
            disabled={isSending}
            className="inline-flex items-center justify-center rounded-full bg-amber-500 px-5 py-2 text-base sm:text-lg font-semibold text-amber-950 shadow-md shadow-amber-900/15 hover:bg-amber-400 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
          >
            {isSending ? "Sending..." : "Send message"}
          </button>

          {sent && !errorMsg && (
            <p className="text-xs sm:text-sm text-emerald-700">
              Thank you – your message has been sent.
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
