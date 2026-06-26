import { useState, type FormEvent } from "react";
import InfoPageShell from "../components/InfoPageShell";
import { apiUrl } from "../lib/api";
import { getApiErrorMessage } from "../lib/apiError";

export default function Feedback() {
  const [form, setForm] = useState(() => ({
    name: localStorage.getItem("userName") || "",
    email: localStorage.getItem("userEmail") || "",
    message: "",
  }));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(apiUrl("/api/feedback"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(
            response,
            "Unable to send feedback right now",
          ),
        );
      }
      setSuccess("Thanks for your feedback. It has been sent.");
      setForm((prev) => ({ ...prev, message: "" }));
    } catch (err: any) {
      setError(err?.message || "Unable to send feedback right now");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <InfoPageShell
      title="Feedback"
      subtitle="Share product feedback, bugs, or feature requests."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Name
          </span>
          <input
            type="text"
            value={form.name}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, name: e.target.value }))
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
            minLength={2}
            maxLength={120}
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Email
          </span>
          <input
            type="email"
            value={form.email}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, email: e.target.value }))
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
            maxLength={190}
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Message
          </span>
          <textarea
            value={form.message}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, message: e.target.value }))
            }
            className="min-h-32 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
            minLength={10}
            maxLength={3000}
            required
          />
        </label>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Sending..." : "Send feedback"}
        </button>
      </form>
    </InfoPageShell>
  );
}
