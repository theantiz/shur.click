import { useState, useEffect, useCallback, useRef, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";

import { apiUrl } from "../lib/api";
import { getApiErrorMessage } from "../lib/apiError";
import { formatIstDateTime, IST_TIMEZONE, parseApiDateTime } from "../lib/dateTime";
import ConfirmDialog from "../components/ConfirmDialog";
import Skeleton from "../components/Skeleton";

type UrlEntry = {
  id: number;
  shortCode: string;
  longUrl: string;
  clickCount: number;
  shortUrl: string;
  createdAt: string;
  lastAccessedAt: string | null;
};

type BillingStatus = {
  planTier: "FREE" | "PRO";
  usedLinks: number;
  freeTierLimit: number;
  remainingFreeLinks: number | null;
  proMonthlyPriceUsd: number;
  proExpiresAt: string | null;
  proActive: boolean;
};

type RazorpayOrderResponse = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefillEmail: string;
};

type GeoCountryClicks = {
  countryCode: string;
  clicks: number;
};

type UrlGeoAnalyticsResponse = {
  shortCode: string;
  totalClicks: number;
  countryTrackedClicks: number;
  topCountries: GeoCountryClicks[];
};

type MeResponse = {
  id: number;
  fullName: string;
  email: string;
};

type ProfileUpdateResponse = MeResponse & {
  message?: string;
  challengeId?: string;
  pendingEmail?: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

async function ensureRazorpayLoaded(): Promise<boolean> {
  if (window.Razorpay) return true;

  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [longUrl, setLongUrl] = useState("");
  const [customAlias, setCustomAlias] = useState("");
  const [urls, setUrls] = useState<UrlEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [qrOpenId, setQrOpenId] = useState<number | null>(null);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
  const [geoOpenId, setGeoOpenId] = useState<number | null>(null);
  const [geoByCode, setGeoByCode] = useState<Record<string, UrlGeoAnalyticsResponse>>({});
  const [geoLoadingCode, setGeoLoadingCode] = useState<string | null>(null);
  const [geoErrorByCode, setGeoErrorByCode] = useState<Record<string, string>>({});
  const [pendingDelete, setPendingDelete] = useState<UrlEntry | null>(null);
  const [isDeletingLink, setIsDeletingLink] = useState(false);
  const [isDeleteAccountDialogOpen, setIsDeleteAccountDialogOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<"profile" | "password" | "danger">("profile");
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileFullName, setProfileFullName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [initialProfileFullName, setInitialProfileFullName] = useState("");
  const [initialProfileEmail, setInitialProfileEmail] = useState("");
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileEmailOtpChallengeId, setProfileEmailOtpChallengeId] = useState<string | null>(null);
  const [profilePendingEmail, setProfilePendingEmail] = useState<string | null>(null);
  const [profileEmailOtp, setProfileEmailOtp] = useState("");
  const [isProfileOtpVerifying, setIsProfileOtpVerifying] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const autoRefreshInFlight = useRef(false);

  const clearAuthAndRedirect = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
    navigate("/auth/login", { replace: true });
  }, [navigate]);

  const resolveApiError = useCallback(
    async (
      response: Response,
      fallback: string,
      statusMessages: Partial<Record<number, string>> = {},
    ): Promise<string | null> => {
      if (response.ok) return null;
      const message = await getApiErrorMessage(response, fallback, statusMessages);
      if (response.status === 401 || response.status === 403 || /user not found/i.test(message)) {
        clearAuthAndRedirect();
        return "__redirect__";
      }
      return message;
    },
    [clearAuthAndRedirect],
  );

  const fetchUrls = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl("/api/urls"), {
        headers: { Authorization: `Bearer ${token}` },
      });

      const apiError = await resolveApiError(response, "Failed to fetch URLs");
      if (apiError) {
        if (apiError === "__redirect__") return;
        throw new Error(apiError);
      }

      const data = await response.json();
      const mappedUrls: UrlEntry[] = data.map((item: any) => ({
        id: item.id,
        shortCode: item.shortCode,
        longUrl: item.longUrl,
        clickCount: item.clickCount,
        shortUrl: item.shortUrl,
        createdAt: item.createdAt || "",
        lastAccessedAt: item.lastAccessedAt || null,
      }));
      setUrls(mappedUrls);
    } catch (fetchError) {
      console.error("Error fetching URLs:", fetchError);
      setError(fetchError instanceof Error ? fetchError.message : "Failed to fetch URLs");
    }
  }, [resolveApiError]);

  const fetchBilling = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl("/api/billing/status"), {
        headers: { Authorization: `Bearer ${token}` },
      });

      const apiError = await resolveApiError(response, "Failed to fetch billing status");
      if (apiError) {
        if (apiError === "__redirect__") return;
        throw new Error(apiError);
      }

      const data = (await response.json()) as BillingStatus;
      setBilling(data);
    } catch (billingError) {
      console.error("Error fetching billing:", billingError);
    }
  }, [resolveApiError]);

  const fetchGeoAnalytics = useCallback(async (shortCode: string) => {
    if (!shortCode) return;
    try {
      setGeoLoadingCode(shortCode);
      setGeoErrorByCode((prev) => {
        const next = { ...prev };
        delete next[shortCode];
        return next;
      });
      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl(`/api/urls/${encodeURIComponent(shortCode)}/geo-analytics`), {
        headers: { Authorization: `Bearer ${token}` },
      });

      const apiError = await resolveApiError(response, "Failed to fetch country analytics");
      if (apiError) {
        if (apiError === "__redirect__") return;
        throw new Error(apiError);
      }

      const data = (await response.json()) as UrlGeoAnalyticsResponse;
      setGeoByCode((prev) => ({ ...prev, [shortCode]: data }));
    } catch (analyticsError: any) {
      setGeoErrorByCode((prev) => ({
        ...prev,
        [shortCode]: analyticsError?.message || "Failed to fetch country analytics",
      }));
    } finally {
      setGeoLoadingCode((prev) => (prev === shortCode ? null : prev));
    }
  }, [resolveApiError]);

  const refreshDashboard = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/auth/login");
      return;
    }
    try {
      await Promise.all([fetchUrls(), fetchBilling()]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchUrls, fetchBilling, navigate]);

  useEffect(() => {
    void refreshDashboard();
  }, [refreshDashboard]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (autoRefreshInFlight.current) return;
      autoRefreshInFlight.current = true;
      void refreshDashboard().finally(() => {
        autoRefreshInFlight.current = false;
      });
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [refreshDashboard]);

  const handleCreateUrl = async (e: FormEvent) => {
    e.preventDefault();
    if (!longUrl.trim()) return;

    setIsCreating(true);

    try {
      setError(null);
      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl("/api/urls"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          longUrl,
          customAlias: customAlias || null,
        }),
      });

      const apiError = await resolveApiError(response, "Failed to create URL");
      if (apiError) {
        if (apiError === "__redirect__") return;
        throw new Error(apiError);
      }

      await response.json();
      await refreshDashboard();
      setLongUrl("");
      setCustomAlias("");
    } catch (createError: any) {
      console.error("Error creating URL:", createError);
      setError(createError?.message || "Failed to create URL");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setIsDeletingLink(true);
      setError(null);
      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl(`/api/urls/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const apiError = await resolveApiError(response, "Failed to delete URL");
      if (apiError) {
        if (apiError === "__redirect__") return;
        throw new Error(apiError);
      }

      await refreshDashboard();
    } catch (deleteError: any) {
      console.error("Error deleting URL:", deleteError);
      setError(deleteError?.message || "Failed to delete URL");
    } finally {
      setIsDeletingLink(false);
    }
  };

  const requestDelete = (url: UrlEntry) => {
    setPendingDelete(url);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await handleDelete(pendingDelete.id);
    setPendingDelete(null);
  };

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const orderRes = await fetch(apiUrl("/api/billing/razorpay-order"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const orderApiError = await resolveApiError(orderRes, "Failed to start Razorpay checkout");
      if (orderApiError) {
        if (orderApiError === "__redirect__") return;
        throw new Error(orderApiError);
      }

      const order = (await orderRes.json()) as RazorpayOrderResponse;
      const loaded = await ensureRazorpayLoaded();
      if (!loaded || !window.Razorpay) {
        throw new Error("Razorpay SDK failed to load");
      }

      const razorpay = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: order.name,
        description: order.description,
        order_id: order.orderId,
        prefill: {
          email: order.prefillEmail || localStorage.getItem("userEmail") || "",
        },
        theme: {
          color: "#0f766e",
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          const verifyRes = await fetch(apiUrl("/api/billing/verify-payment"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          });

          const verifyApiError = await resolveApiError(verifyRes, "Payment verification failed");
          if (verifyApiError) {
            if (verifyApiError === "__redirect__") return;
            setError(verifyApiError);
            return;
          }

          await refreshDashboard();
          setError(null);
        },
        modal: {
          ondismiss: () => {
            setError("Razorpay checkout canceled. Your current plan is unchanged.");
          },
        },
      });

      razorpay.open();
    } catch (upgradeError: any) {
      setError(upgradeError?.message || "Failed to start Razorpay checkout");
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleRedeemPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim()) return;
    setIsRedeeming(true);
    setPromoError(null);
    setPromoSuccess(null);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(apiUrl("/api/billing/redeem-promo"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: promoCode.trim() }),
      });

      const promoApiError = await resolveApiError(res, "Failed to redeem promo code");
      if (promoApiError) {
        if (promoApiError === "__redirect__") return;
        setPromoError(promoApiError);
        return;
      }

      const data = (await res.json()) as { message: string };
      setPromoSuccess(data.message);
      setPromoCode("");
      await fetchBilling();
    } catch (redeemError: any) {
      setPromoError(redeemError?.message || "Failed to redeem promo code");
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleCopy = (shortUrl: string, id: number) => {
    void navigator.clipboard.writeText(shortUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1400);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
    navigate("/");
  };

  const fetchProfile = useCallback(async () => {
    setIsProfileLoading(true);
    setProfileError(null);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl("/api/me"), {
        headers: { Authorization: `Bearer ${token}` },
      });

      const apiError = await resolveApiError(response, "Failed to load profile");
      if (apiError) {
        if (apiError === "__redirect__") return;
        throw new Error(apiError);
      }

      const data = (await response.json()) as MeResponse;
      setProfileFullName(data.fullName || "");
      setProfileEmail(data.email || "");
      setInitialProfileFullName(data.fullName || "");
      setInitialProfileEmail(data.email || "");
      setIsProfileEditing(false);
    } catch (profileFetchError: any) {
      setProfileError(profileFetchError?.message || "Failed to load profile");
    } finally {
      setIsProfileLoading(false);
    }
  }, [resolveApiError]);

  useEffect(() => {
    if (!isProfileOpen) return;
    void fetchProfile();
  }, [isProfileOpen, fetchProfile]);

  const handleProfileSave = async (e: FormEvent) => {
    e.preventDefault();
    setIsProfileSaving(true);
    setProfileError(null);
    setProfileMessage(null);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl("/api/me"), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: profileFullName.trim(),
          email: profileEmail.trim(),
        }),
      });

      const apiError = await resolveApiError(response, "Failed to update profile");
      if (apiError) {
        if (apiError === "__redirect__") return;
        throw new Error(apiError);
      }

      const data = (await response.json()) as ProfileUpdateResponse;
      setProfileFullName(data.fullName || profileFullName);
      setProfileEmail(data.email || profileEmail);
      localStorage.setItem("userName", data.fullName || profileFullName);
      if (data.challengeId) {
        setIsProfileEditing(false);
        setProfileEmailOtpChallengeId(data.challengeId);
        setProfilePendingEmail(data.pendingEmail || profileEmail.trim());
        setProfileEmailOtp("");
        setProfileMessage(data.message || "OTP sent to new email. Verify to complete update.");
      } else {
        setInitialProfileFullName(data.fullName || profileFullName);
        setInitialProfileEmail(data.email || profileEmail);
        setIsProfileEditing(false);
        localStorage.setItem("userEmail", data.email || profileEmail);
        setProfileEmailOtpChallengeId(null);
        setProfilePendingEmail(null);
        setProfileEmailOtp("");
        setProfileMessage(data.message || "Profile updated successfully");
      }
    } catch (profileSaveError: any) {
      setProfileError(profileSaveError?.message || "Failed to update profile");
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handleVerifyProfileEmailOtp = async () => {
    if (!profileEmailOtpChallengeId) return;

    setIsProfileOtpVerifying(true);
    setProfileError(null);
    setProfileMessage(null);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl("/api/me/email/verify"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          challengeId: profileEmailOtpChallengeId,
          otp: profileEmailOtp.trim(),
        }),
      });

      const apiError = await resolveApiError(response, "Failed to verify OTP");
      if (apiError) {
        if (apiError === "__redirect__") return;
        throw new Error(apiError);
      }

      const data = (await response.json()) as MeResponse & { message?: string };
      setProfileFullName(data.fullName || profileFullName);
      setProfileEmail(data.email || profileEmail);
      setInitialProfileFullName(data.fullName || profileFullName);
      setInitialProfileEmail(data.email || profileEmail);
      setIsProfileEditing(false);
      localStorage.setItem("userName", data.fullName || profileFullName);
      localStorage.setItem("userEmail", data.email || profileEmail);
      setProfileEmailOtpChallengeId(null);
      setProfilePendingEmail(null);
      setProfileEmailOtp("");
      setProfileMessage(data.message || "Email updated successfully");
    } catch (verifyError: any) {
      setProfileError(verifyError?.message || "Failed to verify OTP");
    } finally {
      setIsProfileOtpVerifying(false);
    }
  };

  const handlePasswordSave = async (e: FormEvent) => {
    e.preventDefault();
    setIsPasswordSaving(true);
    setPasswordError(null);
    setPasswordMessage(null);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl("/api/me/password"), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmNewPassword,
        }),
      });

      const apiError = await resolveApiError(response, "Failed to update password");
      if (apiError) {
        if (apiError === "__redirect__") return;
        throw new Error(apiError);
      }

      const data = (await response.json()) as { message?: string };
      setPasswordMessage(data.message || "Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmNewPassword(false);
    } catch (passwordSaveError: any) {
      setPasswordError(passwordSaveError?.message || "Failed to update password");
    } finally {
      setIsPasswordSaving(false);
    }
  };

  const openProfile = () => {
    setProfileTab("profile");
    setProfileMessage(null);
    setProfileError(null);
    setPasswordMessage(null);
    setPasswordError(null);
    setIsProfileEditing(false);
    setProfileEmailOtpChallengeId(null);
    setProfilePendingEmail(null);
    setProfileEmailOtp("");
    setIsProfileOpen(true);
  };

  const handleDeleteAccount = async () => {
    if (isDeletingAccount) return;

    setIsDeletingAccount(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/auth/login");
        return;
      }

      const response = await fetch(apiUrl("/api/auth/account"), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const apiError = await resolveApiError(response, "Failed to delete account");
      if (apiError) {
        if (apiError === "__redirect__") return;
        throw new Error(apiError);
      }

      localStorage.removeItem("token");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userName");
      setIsDeleteAccountDialogOpen(false);
      navigate("/");
    } catch (deleteError: any) {
      setError(deleteError?.message || "Failed to delete account");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const openDeleteAccountConfirm = () => {
    setIsProfileOpen(false);
    setIsDeleteAccountDialogOpen(true);
  };

  const totalClicks = urls.reduce((sum, url) => sum + url.clickCount, 0);
  const formatDateTime = (value: string | null) => {
    return formatIstDateTime(value);
  };

  if (isLoading) {
    return (
      <div className="app-shell min-h-screen px-3 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto w-full max-w-6xl">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-2 h-8 w-12" />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-8 w-14" />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-2 h-8 w-12" />
            </div>
          </div>
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white/80 p-5">
            <Skeleton className="h-6 w-40" />
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px_auto]">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full sm:w-28" />
            </div>
          </section>
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white/80 p-5">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="mt-4 h-16 w-full" />
            <Skeleton className="mt-3 h-16 w-full" />
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen text-slate-800">
      <header className="sticky top-0 z-20 border-b border-slate-900/10 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Link to="/" className="font-mono text-sm font-semibold text-teal-800 sm:text-base">
              shur.click
            </Link>
            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-slate-500">
              Dashboard
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openProfile}
              title="Profile settings"
              aria-label="Profile settings"
              className="grid h-8 w-8 place-items-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:border-teal-600 hover:text-teal-700"
            >
              <span className="font-mono text-xs font-semibold">
                {(profileFullName || localStorage.getItem("userName") || "U").trim().charAt(0).toUpperCase()}
              </span>
            </button>
            <button
              onClick={handleLogout}
              className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-500"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-3 py-6 sm:px-6 sm:py-8">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
            <p className="font-mono text-xs text-slate-500">LINKS</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{urls.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
            <p className="font-mono text-xs text-slate-500">TOTAL CLICKS</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{totalClicks}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
            <p className="font-mono text-xs text-slate-500">AVG / LINK</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{urls.length ? Math.round(totalClicks / urls.length) : 0}</p>
          </div>
        </div>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-slate-900">Create Link</h2>
            {error && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            )}
            <form onSubmit={handleCreateUrl} className="mt-3 grid gap-3 sm:grid-cols-[1fr_180px_auto]">
              <input
                type="url"
                value={longUrl}
                onChange={(e) => setLongUrl(e.target.value)}
                placeholder="https://your-long-url.com"
                className="min-w-0 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
                required
              />
              <input
                type="text"
                value={customAlias}
                onChange={(e) => setCustomAlias(e.target.value)}
                placeholder="custom alias"
                className="min-w-0 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
              />
              <button
                type="submit"
                disabled={isCreating || !longUrl.trim()}
                className="rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreating ? "Creating..." : "Shorten"}
              </button>
            </form>
          </section>

          {billing && (
            <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 sm:p-5">
              <p className="font-mono text-xs text-slate-500">PLAN</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {billing.proActive ? "PRO (Unlimited)" : `FREE (${billing.usedLinks}/${billing.freeTierLimit})`}
              </p>
              {billing.proActive && billing.proExpiresAt && (
                <p className="mt-1 text-xs text-slate-500">
                  Active until {parseApiDateTime(billing.proExpiresAt)?.toLocaleDateString("en-IN", { timeZone: IST_TIMEZONE }) ?? "N/A"}
                </p>
              )}
              {!billing.proActive && (
                <p className="mt-1 text-xs text-slate-500">
                  {billing.remainingFreeLinks ?? 0} free links remaining
                </p>
              )}
              {!billing.proActive && (
                <button
                  type="button"
                  onClick={handleUpgrade}
                  disabled={isUpgrading}
                  className="mt-4 w-full rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isUpgrading ? "Opening checkout..." : `Upgrade Pro - $${billing.proMonthlyPriceUsd}/month`}
                </button>
              )}

              {/* Promo code redemption — shown only on FREE plan */}
              {!billing.proActive && (
                <div className="mt-4 border-t border-slate-200 pt-4">
                  <p className="mb-2 text-xs font-medium text-slate-500">Have a promo code?</p>
                  <form onSubmit={handleRedeemPromo} className="flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      placeholder="Enter promo code"
                      maxLength={64}
                      className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs uppercase tracking-wider outline-none transition focus:border-teal-600"
                    />
                    <button
                      type="submit"
                      disabled={isRedeeming || !promoCode.trim()}
                      className="rounded-lg border border-teal-600 bg-white px-3 py-1.5 text-xs font-semibold text-teal-700 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isRedeeming ? "..." : "Redeem"}
                    </button>
                  </form>
                  {promoSuccess && (
                    <p className="mt-2 text-xs font-medium text-teal-700">{promoSuccess}</p>
                  )}
                  {promoError && (
                    <p className="mt-2 text-xs text-rose-600">{promoError}</p>
                  )}
                </div>
              )}
            </section>
          )}
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white/85">
          <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
            <h2 className="text-lg font-semibold text-slate-900">Your Links</h2>
          </div>

          {urls.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">No links yet. Create your first one above.</p>
          ) : (
            <div className="divide-y divide-slate-200">
              {urls.map((url) => {
                const computedShortUrl = url.shortUrl || `${window.location.origin}/${url.shortCode}`;
                const qrOpen = qrOpenId === url.id;
                const geoOpen = geoOpenId === url.id;
                const geoData = geoByCode[url.shortCode];
                const geoError = geoErrorByCode[url.shortCode];
                const geoLoading = geoLoadingCode === url.shortCode;
                return (
                  <article key={url.shortCode} className="px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <a
                            href={computedShortUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="break-all font-mono text-sm text-teal-700 underline-offset-2 hover:underline sm:truncate"
                          >
                            {computedShortUrl}
                          </a>
                          <button
                            onClick={() => handleCopy(computedShortUrl, url.id)}
                            className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 transition hover:border-slate-500"
                          >
                            {copiedId === url.id ? "Copied" : "Copy"}
                          </button>
                        </div>
                        <p className="mt-1 break-all text-xs text-slate-500 sm:truncate">{url.longUrl}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5">
                            Created: {formatDateTime(url.createdAt)}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5">
                            Last clicked: {formatDateTime(url.lastAccessedAt)}
                          </span>
                        </div>

                        {billing?.proActive ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                if (geoOpen) {
                                  setGeoOpenId(null);
                                  return;
                                }
                                setGeoOpenId(url.id);
                                if (geoLoadingCode !== url.shortCode) {
                                  void fetchGeoAnalytics(url.shortCode);
                                }
                              }}
                              className="mt-2 block font-mono text-xs text-slate-600 transition hover:text-slate-900"
                            >
                              {geoOpen ? "[-] hide country analytics" : "[+] show country analytics"}
                            </button>

                            {geoOpen && (
                              <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3">
                                {geoLoading && (
                                  <p className="text-xs text-slate-500">Loading country analytics...</p>
                                )}
                                {geoError && (
                                  <p className="text-xs text-rose-700">{geoError}</p>
                                )}
                                {!geoLoading && !geoError && geoData && (
                                  <div>
                                    <div className="mb-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                                      <span>Total: {geoData.totalClicks}</span>
                                      <span>Country-tracked: {geoData.countryTrackedClicks}</span>
                                    </div>
                                    {geoData.topCountries.length === 0 ? (
                                      <p className="text-xs text-slate-500">No country data yet.</p>
                                    ) : (
                                      <div className="space-y-1.5">
                                        {geoData.topCountries.map((row) => {
                                          const denom = geoData.countryTrackedClicks || 1;
                                          const pct = Math.round((row.clicks / denom) * 100);
                                          return (
                                            <div key={row.countryCode} className="flex items-center justify-between rounded-md border border-slate-200 px-2 py-1 text-xs">
                                              <span className="font-mono text-slate-700">{row.countryCode}</span>
                                              <span className="text-slate-600">{row.clicks} ({pct}%)</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="mt-2 text-[11px] text-slate-500">Country analytics is available on Pro plan.</p>
                        )}
                      </div>

                        <div className="flex flex-col items-stretch gap-2 sm:items-end">
                        <div className="text-left sm:text-right">
                          <p className="text-lg font-semibold text-slate-900">{url.clickCount}</p>
                          <p className="font-mono text-[10px] uppercase tracking-wide text-slate-500">clicks</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setQrOpenId(qrOpen ? null : url.id)}
                          className="font-mono text-xs text-slate-600 transition hover:text-slate-900"
                        >
                          {qrOpen ? "[-] hide qr" : "[+] show qr"}
                        </button>
                        {qrOpen && (
                          <div className="self-start rounded-lg border border-slate-200 bg-white p-2 sm:self-end">
                            <QRCodeSVG value={computedShortUrl} size={88} level="M" includeMargin={false} />
                          </div>
                        )}

                        <button
                          onClick={() => requestDelete(url)}
                          className="w-full rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-700 transition hover:border-rose-400 sm:w-auto sm:py-1"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {pendingDelete && (
          <ConfirmDialog
            isOpen={Boolean(pendingDelete)}
            title="Delete this short link?"
            description={`${pendingDelete.shortUrl}\nThis action cannot be undone.`}
            confirmLabel={isDeletingLink ? "Deleting..." : "Delete link"}
            tone="danger"
            isConfirming={isDeletingLink}
            onCancel={() => setPendingDelete(null)}
            onConfirm={() => void confirmDelete()}
          />
        )}
        <ConfirmDialog
          isOpen={isDeleteAccountDialogOpen}
          title="Delete your account?"
          description="This permanently deletes your account and all of your links. This action cannot be undone."
          confirmLabel={isDeletingAccount ? "Deleting..." : "Delete account"}
          tone="danger"
          isConfirming={isDeletingAccount}
          onCancel={() => setIsDeleteAccountDialogOpen(false)}
          onConfirm={() => void handleDeleteAccount()}
        />
        {isProfileOpen && (
          <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-900/45 px-3 py-6 sm:px-4">
            <div className="max-h-[calc(100svh-3rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_28px_70px_-40px_rgba(15,23,42,0.7)] sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-slate-900">Profile Settings</h3>
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(false)}
                  className="rounded-full border border-slate-300 px-2.5 py-1 text-xs text-slate-700 transition hover:border-slate-500"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setProfileTab("profile")}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    profileTab === "profile"
                      ? "border-teal-700 bg-teal-700 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"
                  }`}
                >
                  Profile
                </button>
                <button
                  type="button"
                  onClick={() => setProfileTab("password")}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    profileTab === "password"
                      ? "border-teal-700 bg-teal-700 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"
                  }`}
                >
                  Password
                </button>
                <button
                  type="button"
                  onClick={() => setProfileTab("danger")}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    profileTab === "danger"
                      ? "border-rose-700 bg-rose-700 text-white"
                      : "border-rose-300 bg-white text-rose-700 hover:border-rose-500"
                  }`}
                >
                  Danger Zone
                </button>
              </div>

              {isProfileLoading ? (
                <p className="mt-4 text-sm text-slate-600">Loading profile...</p>
              ) : (
                <>
                  {profileTab === "profile" && (
                    <form onSubmit={handleProfileSave} className="mt-4 space-y-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-slate-600">Use Edit to unlock profile fields.</p>
                        <div className="flex flex-wrap items-center gap-2">
                          {isProfileEditing && (
                            <button
                              type="button"
                              onClick={() => {
                                setProfileFullName(initialProfileFullName);
                                setProfileEmail(initialProfileEmail);
                                setProfileError(null);
                                setProfileMessage(null);
                                setIsProfileEditing(false);
                              }}
                              className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-700 transition hover:border-slate-500"
                            >
                              Cancel
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setIsProfileEditing((prev) => !prev)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-700 transition hover:border-teal-600 hover:text-teal-700"
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-current">
                              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l9.06-9.06.92.92L5.92 19.58zM20.71 7.04a1 1 0 0 0 0-1.41L18.37 3.3a1 1 0 0 0-1.41 0l-1.25 1.24 3.75 3.75 1.25-1.25z" />
                            </svg>
                            {isProfileEditing ? "Lock" : "Edit"}
                          </button>
                        </div>
                      </div>
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-slate-600">Full name</span>
                        <input
                          type="text"
                          value={profileFullName}
                          onChange={(e) => setProfileFullName(e.target.value)}
                          disabled={!isProfileEditing}
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
                          required
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-slate-600">Email</span>
                        <input
                          type="email"
                          value={profileEmail}
                          onChange={(e) => setProfileEmail(e.target.value)}
                          disabled={!isProfileEditing}
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
                          required
                        />
                      </label>
                      {profileError && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{profileError}</div>}
                      {profileMessage && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{profileMessage}</div>}
                      <button
                        type="submit"
                        disabled={!isProfileEditing || isProfileSaving || !profileFullName.trim() || !profileEmail.trim()}
                        className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isProfileSaving ? "Saving..." : "Save profile"}
                      </button>

                      {profileEmailOtpChallengeId && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                          <p className="text-xs text-amber-800">
                            Enter OTP sent to <span className="font-semibold">{profilePendingEmail || "new email"}</span> to confirm email update.
                          </p>
                          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                            <input
                              type="text"
                              value={profileEmailOtp}
                              onChange={(e) => setProfileEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                              placeholder="6-digit OTP"
                              className="w-full rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm tracking-[0.15em] outline-none transition focus:border-amber-500 sm:max-w-[220px]"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => void handleVerifyProfileEmailOtp()}
                              disabled={isProfileOtpVerifying || profileEmailOtp.length !== 6}
                              className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isProfileOtpVerifying ? "Verifying..." : "Verify OTP"}
                            </button>
                          </div>
                        </div>
                      )}
                    </form>
                  )}

                  {profileTab === "password" && (
                    <form onSubmit={handlePasswordSave} className="mt-4 space-y-3">
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-slate-600">Current password</span>
                        <div className="relative">
                          <input
                            type={showCurrentPassword ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-14 text-sm outline-none transition focus:border-teal-600"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword((prev) => !prev)}
                            className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-500 transition hover:text-slate-700"
                            aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
                          >
                            {showCurrentPassword ? (
                              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
                                <path d="M3 3l18 18" />
                                <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                                <path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c6 0 10 8 10 8a18.4 18.4 0 0 1-4.1 4.8" />
                                <path d="M6.6 6.7C3.7 8.6 2 12 2 12s4 8 10 8a10.8 10.8 0 0 0 4.1-.8" />
                              </svg>
                            ) : (
                              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
                                <path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8S2 12 2 12z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-slate-600">New password</span>
                        <div className="relative">
                          <input
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            minLength={8}
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-14 text-sm outline-none transition focus:border-teal-600"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword((prev) => !prev)}
                            className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-500 transition hover:text-slate-700"
                            aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                          >
                            {showNewPassword ? (
                              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
                                <path d="M3 3l18 18" />
                                <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                                <path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c6 0 10 8 10 8a18.4 18.4 0 0 1-4.1 4.8" />
                                <path d="M6.6 6.7C3.7 8.6 2 12 2 12s4 8 10 8a10.8 10.8 0 0 0 4.1-.8" />
                              </svg>
                            ) : (
                              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
                                <path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8S2 12 2 12z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-slate-600">Confirm new password</span>
                        <div className="relative">
                          <input
                            type={showConfirmNewPassword ? "text" : "password"}
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            minLength={8}
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-14 text-sm outline-none transition focus:border-teal-600"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmNewPassword((prev) => !prev)}
                            className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-500 transition hover:text-slate-700"
                            aria-label={showConfirmNewPassword ? "Hide confirm new password" : "Show confirm new password"}
                          >
                            {showConfirmNewPassword ? (
                              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
                                <path d="M3 3l18 18" />
                                <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                                <path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c6 0 10 8 10 8a18.4 18.4 0 0 1-4.1 4.8" />
                                <path d="M6.6 6.7C3.7 8.6 2 12 2 12s4 8 10 8a10.8 10.8 0 0 0 4.1-.8" />
                              </svg>
                            ) : (
                              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
                                <path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8S2 12 2 12z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </label>
                      {passwordError && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{passwordError}</div>}
                      {passwordMessage && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{passwordMessage}</div>}
                      <button
                        type="submit"
                        disabled={isPasswordSaving || !currentPassword || !newPassword || !confirmNewPassword}
                        className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isPasswordSaving ? "Updating..." : "Update password"}
                      </button>
                    </form>
                  )}

                  {profileTab === "danger" && (
                    <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4">
                      <p className="text-sm font-semibold text-rose-800">Delete Account</p>
                      <p className="mt-1 text-xs text-rose-700">This permanently removes your account and all links.</p>
                      <button
                        type="button"
                        onClick={openDeleteAccountConfirm}
                        className="mt-3 rounded-xl border border-rose-300 bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
                      >
                        Delete account
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
