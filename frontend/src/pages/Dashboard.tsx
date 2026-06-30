import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type FormEvent,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";

import { apiUrl } from "../lib/api";
import { getApiErrorMessage } from "../lib/apiError";
import {
  formatIstDateTime,
  IST_TIMEZONE,
  parseApiDateTime,
} from "../lib/dateTime";
import ConfirmDialog from "../components/ConfirmDialog";
import Skeleton from "../components/Skeleton";

type UrlEntry = {
  id: number;
  shortCode: string;
  longUrl: string;
  clickCount: number;
  shortUrl: string;
  shortBaseUrl?: string | null;
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

type CustomDomain = {
  id: number;
  domain: string;
  status: "PENDING" | "VERIFIED" | "FAILED";
  verificationToken: string;
};

type ShortLinkDomainMode = "shur" | "custom";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const DEFAULT_SHORT_LINK_BASE_URL = "https://shur.click";
const SHORT_LINK_DOMAIN_MODE_KEY = "shortLinkDomainMode";

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
  const qrCanvasRef = useRef<HTMLDivElement>(null);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
  const [geoOpenId, setGeoOpenId] = useState<number | null>(null);
  const [geoByCode, setGeoByCode] = useState<
    Record<string, UrlGeoAnalyticsResponse>
  >({});
  const [geoLoadingCode, setGeoLoadingCode] = useState<string | null>(null);
  const [geoErrorByCode, setGeoErrorByCode] = useState<Record<string, string>>(
    {},
  );
  const [pendingDelete, setPendingDelete] = useState<UrlEntry | null>(null);
  const [isDeletingLink, setIsDeletingLink] = useState(false);
  const [switchingToShurId, setSwitchingToShurId] = useState<number | null>(
    null,
  );
  const [switchingToCustomId, setSwitchingToCustomId] = useState<number | null>(
    null,
  );
  const [isDeleteAccountDialogOpen, setIsDeleteAccountDialogOpen] =
    useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<
    "profile" | "password" | "danger"
  >("profile");
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileFullName, setProfileFullName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [initialProfileFullName, setInitialProfileFullName] = useState("");
  const [initialProfileEmail, setInitialProfileEmail] = useState("");
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileEmailOtpChallengeId, setProfileEmailOtpChallengeId] = useState<
    string | null
  >(null);
  const [profilePendingEmail, setProfilePendingEmail] = useState<string | null>(
    null,
  );
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

  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [isDomainsLoading, setIsDomainsLoading] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [newDomain, setNewDomain] = useState("");
  const [shortLinkDomainMode, setShortLinkDomainMode] =
    useState<ShortLinkDomainMode>(() =>
      localStorage.getItem(SHORT_LINK_DOMAIN_MODE_KEY) === "custom"
        ? "custom"
        : "shur",
    );

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
      const message = await getApiErrorMessage(
        response,
        fallback,
        statusMessages,
      );
      if (
        response.status === 401 ||
        response.status === 403 ||
        /user not found/i.test(message)
      ) {
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
        shortBaseUrl: item.shortBaseUrl || null,
        createdAt: item.createdAt || "",
        lastAccessedAt: item.lastAccessedAt || null,
      }));
      setUrls(mappedUrls);
    } catch (fetchError) {
      console.error("Error fetching URLs:", fetchError);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to fetch URLs",
      );
    }
  }, [resolveApiError]);

  const fetchBilling = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl("/api/billing/status"), {
        headers: { Authorization: `Bearer ${token}` },
      });

      const apiError = await resolveApiError(
        response,
        "Failed to fetch billing status",
      );
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

  const fetchDomains = useCallback(async (showLoading = domains.length === 0) => {
    try {
      if (showLoading) {
        setIsDomainsLoading(true);
      }
      setDomainError(null);
      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl("/api/domains"), {
        headers: { Authorization: `Bearer ${token}` },
      });

      const apiError = await resolveApiError(
        response,
        "Failed to fetch custom domains",
      );
      if (apiError) {
        if (apiError === "__redirect__") return;
        throw new Error(apiError);
      }

      const data = (await response.json()) as CustomDomain[];
      setDomains(data);
    } catch (err: any) {
      console.error("Error fetching domains:", err);
      setDomainError(err?.message || "Failed to fetch custom domains");
    } finally {
      if (showLoading) {
        setIsDomainsLoading(false);
      }
    }
  }, [domains.length, resolveApiError]);

  const fetchGeoAnalytics = useCallback(
    async (shortCode: string) => {
      if (!shortCode) return;
      try {
        setGeoLoadingCode(shortCode);
        setGeoErrorByCode((prev) => {
          const next = { ...prev };
          delete next[shortCode];
          return next;
        });
        const token = localStorage.getItem("token");
        const response = await fetch(
          apiUrl(`/api/urls/${encodeURIComponent(shortCode)}/geo-analytics`),
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        const apiError = await resolveApiError(
          response,
          "Failed to fetch country analytics",
        );
        if (apiError) {
          if (apiError === "__redirect__") return;
          throw new Error(apiError);
        }

        const data = (await response.json()) as UrlGeoAnalyticsResponse;
        setGeoByCode((prev) => ({ ...prev, [shortCode]: data }));
      } catch (analyticsError: any) {
        setGeoErrorByCode((prev) => ({
          ...prev,
          [shortCode]:
            analyticsError?.message || "Failed to fetch country analytics",
        }));
      } finally {
        setGeoLoadingCode((prev) => (prev === shortCode ? null : prev));
      }
    },
    [resolveApiError],
  );

  const refreshDashboard = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/auth/login");
      return;
    }
    try {
      await Promise.all([fetchUrls(), fetchBilling(), fetchDomains()]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchUrls, fetchBilling, fetchDomains, navigate]);

  useEffect(() => {
    void refreshDashboard();
  }, [refreshDashboard]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (autoRefreshInFlight.current) return;
      autoRefreshInFlight.current = true;
      void fetchUrls().finally(() => {
        autoRefreshInFlight.current = false;
      });
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [fetchUrls]);

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
          shortDomainMode: shortLinkDomainMode,
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

  const handleSwitchToShur = async (url: UrlEntry) => {
    try {
      setSwitchingToShurId(url.id);
      setError(null);
      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl(`/api/urls/${url.id}/switch-to-shur`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      const apiError = await resolveApiError(
        response,
        "Failed to switch link to shur.click",
        {
          409: "Alias URL name already exists on shur.click.",
        },
      );
      if (apiError) {
        if (apiError === "__redirect__") return;
        throw new Error(apiError);
      }

      await response.json();
      await refreshDashboard();
    } catch (switchError: any) {
      console.error("Error switching link domain:", switchError);
      setError(switchError?.message || "Failed to switch link to shur.click");
    } finally {
      setSwitchingToShurId(null);
    }
  };

  const handleSwitchToCustom = async (url: UrlEntry) => {
    try {
      setSwitchingToCustomId(url.id);
      setError(null);
      const token = localStorage.getItem("token");
      const response = await fetch(
        apiUrl(`/api/urls/${url.id}/switch-to-custom`),
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const apiError = await resolveApiError(
        response,
        "Failed to switch link to custom domain",
        {
          409: "Alias already exists on your custom domain.",
        },
      );
      if (apiError) {
        if (apiError === "__redirect__") return;
        throw new Error(apiError);
      }

      await response.json();
      await refreshDashboard();
    } catch (switchError: any) {
      console.error("Error switching link to custom domain:", switchError);
      setError(
        switchError?.message || "Failed to switch link to custom domain",
      );
    } finally {
      setSwitchingToCustomId(null);
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

      const orderApiError = await resolveApiError(
        orderRes,
        "Failed to start Razorpay checkout",
      );
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

          const verifyApiError = await resolveApiError(
            verifyRes,
            "Payment verification failed",
          );
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
            setError(
              "Razorpay checkout canceled. Your current plan is unchanged.",
            );
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

      const promoApiError = await resolveApiError(
        res,
        "Failed to redeem promo code",
      );
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

  const handleAddDomain = async (e: FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;
    if (domains.length > 0) {
      setDomainError("Only one custom domain is allowed per Pro account.");
      return;
    }
    setDomainError(null);

    try {
      const token = localStorage.getItem("token");
      const raw = newDomain.trim().replace(/^https?:\/\//i, "");
      const response = await fetch(apiUrl("/api/domains"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ domain: raw }),
      });

      const apiError = await resolveApiError(
        response,
        "Failed to add custom domain",
      );
      if (apiError) {
        if (apiError === "__redirect__") return;
        throw new Error(apiError);
      }

      await response.json();
      setNewDomain("");
      await fetchDomains();
    } catch (err: any) {
      console.error("Error adding domain:", err);
      setDomainError(err?.message || "Failed to add custom domain");
    }
  };

  const handleVerifyDomain = async (id: number) => {
    setDomainError(null);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl(`/api/domains/${id}/verify`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const apiError = await resolveApiError(
        response,
        "Failed to verify custom domain",
      );
      if (apiError) {
        if (apiError === "__redirect__") return;
        throw new Error(apiError);
      }

      await response.json();
      await fetchDomains();
    } catch (err: any) {
      console.error("Error verifying domain:", err);
      setDomainError(err?.message || "Failed to verify custom domain");
    }
  };

  const handleDeleteDomain = async (id: number) => {
    setDomainError(null);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl(`/api/domains/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const apiError = await resolveApiError(
        response,
        "Failed to delete custom domain",
      );
      if (apiError) {
        if (apiError === "__redirect__") return;
        throw new Error(apiError);
      }

      await fetchDomains();
    } catch (err: any) {
      console.error("Error deleting domain:", err);
      setDomainError(err?.message || "Failed to delete custom domain");
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

      const apiError = await resolveApiError(
        response,
        "Failed to load profile",
      );
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

      const apiError = await resolveApiError(
        response,
        "Failed to update profile",
      );
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
        setProfileMessage(
          data.message || "OTP sent to new email. Verify to complete update.",
        );
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

      const apiError = await resolveApiError(
        response,
        "Failed to update password",
      );
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
      setPasswordError(
        passwordSaveError?.message || "Failed to update password",
      );
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

      const apiError = await resolveApiError(
        response,
        "Failed to delete account",
      );
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
  const verifiedDomain = domains.find((d) => d.status === "VERIFIED")?.domain;
  const customShortLinkBase =
    verifiedDomain && billing?.proActive
      ? `https://${verifiedDomain.replace(/\/+$/, "")}`
      : null;
  const selectedShortLinkBase =
    shortLinkDomainMode === "custom" && customShortLinkBase
      ? customShortLinkBase
      : DEFAULT_SHORT_LINK_BASE_URL;
  const formatDateTime = (value: string | null) => {
    return formatIstDateTime(value);
  };

  useEffect(() => {
    if (shortLinkDomainMode === "custom" && !customShortLinkBase) {
      setShortLinkDomainMode("shur");
      localStorage.setItem(SHORT_LINK_DOMAIN_MODE_KEY, "shur");
    }
  }, [customShortLinkBase, shortLinkDomainMode]);

  const handleShortLinkDomainModeChange = (mode: ShortLinkDomainMode) => {
    if (mode === "custom" && !customShortLinkBase) return;
    setShortLinkDomainMode(mode);
    localStorage.setItem(SHORT_LINK_DOMAIN_MODE_KEY, mode);
  };

  if (isLoading) {
    return (
      <div className="app-shell min-h-screen px-3 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto w-full max-w-6xl">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white/50 p-4">
              <Skeleton className="h-3 w-20 bg-slate-200" />
              <Skeleton className="mt-2 h-8 w-12 bg-slate-200" />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/50 p-4">
              <Skeleton className="h-3 w-24 bg-slate-200" />
              <Skeleton className="mt-2 h-8 w-14 bg-slate-200" />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/50 p-4">
              <Skeleton className="h-3 w-20 bg-slate-200" />
              <Skeleton className="mt-2 h-8 w-12 bg-slate-200" />
            </div>
          </div>
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white/50 p-5">
            <Skeleton className="h-6 w-40 bg-slate-200" />
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px_auto]">
              <Skeleton className="h-12 w-full bg-slate-200" />
              <Skeleton className="h-12 w-full bg-slate-200" />
              <Skeleton className="h-12 w-full sm:w-28 bg-slate-200" />
            </div>
          </section>
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white/50 p-5">
            <Skeleton className="h-6 w-28 bg-slate-200" />
            <Skeleton className="mt-4 h-16 w-full bg-slate-200" />
            <Skeleton className="mt-3 h-16 w-full bg-slate-200" />
          </section>
        </div>
      </div>
    );
  }


  return (
    <div style={{ minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* ── TOP NAV ── */}
      <header style={{ position: "sticky", top: 0, zIndex: 40, borderBottom: "1px solid rgba(15,23,42,0.08)", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "space-between", height: 60 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link to="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#0f766e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "ui-monospace, monospace" }}>s.</div>
              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 15, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.3px" }}>shur.click</span>
            </Link>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#0f766e", background: "rgba(20,184,166,0.12)", border: "1px solid rgba(20,184,166,0.25)", borderRadius: 6, padding: "2px 8px" }}>Dashboard</span>
          </div>

          {/* Right side */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {billing?.proActive && (
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", background: "#d97706", color: "#fff", borderRadius: 6, padding: "3px 10px" }}>PRO</span>
            )}
            <button
              onClick={openProfile}
              title="Profile settings"
              aria-label="Profile settings"
              style={{ width: 36, height: 36, borderRadius: "50%", background: "#0f766e", border: "2px solid rgba(20,184,166,0.4)", color: "#fff", fontWeight: 700, fontSize: 13, fontFamily: "ui-monospace, monospace", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.15s, box-shadow 0.15s", boxShadow: "0 0 0 0 rgba(20,184,166,0)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.08)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 16px rgba(20,184,166,0.5)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 0 0 rgba(20,184,166,0)"; }}
            >{(profileFullName || localStorage.getItem("userName") || "U").trim().charAt(0).toUpperCase()}</button>
            <button
              onClick={handleLogout}
              style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid rgba(15,23,42,0.1)", background: "#fff", color: "#475569", fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(15,23,42,0.04)"; (e.currentTarget as HTMLButtonElement).style.color = "#0f172a"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fff"; (e.currentTarget as HTMLButtonElement).style.color = "#475569"; }}
            >Logout</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 64px" }}>

        {/* ── STAT CARDS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
          {[
            { label: "Total Links", value: urls.length, color: "#0f766e", glow: "rgba(20,184,166,0.1)" },
            { label: "Total Clicks", value: totalClicks, color: "#4f46e5", glow: "rgba(99,102,241,0.1)" },
            { label: "Avg / Link", value: urls.length ? Math.round(totalClicks / urls.length) : 0, color: "#d97706", glow: "rgba(245,158,11,0.1)" },
          ].map(card => (
            <div key={card.label} style={{ borderRadius: 16, border: "1px solid rgba(15,23,42,0.08)", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", padding: "20px 24px", position: "relative", overflow: "hidden", transition: "transform 0.2s, border-color 0.2s, box-shadow 0.2s", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = card.color; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 16px rgba(0,0,0,0.04)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(15,23,42,0.08)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.02)"; }}
            >
              <div style={{ position: "absolute", top: 0, right: 0, width: 120, height: 120, borderRadius: "50%", background: card.glow, filter: "blur(40px)", pointerEvents: "none" }} />
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#64748b", marginBottom: 8 }}>{card.label}</p>
              <p style={{ fontSize: 36, fontWeight: 700, color: "#0f172a", lineHeight: 1, marginBottom: 4 }}>{card.value.toLocaleString()}</p>
              <div style={{ width: 28, height: 3, borderRadius: 2, background: `${card.color}` }} />
            </div>
          ))}
        </div>

        {/* ── TOP PANEL: CREATE + PLAN ── */}
        <div style={{ display: "grid", gridTemplateColumns: billing ? "1fr 340px" : "1fr", gap: 16, marginBottom: 24 }}>

          {/* Create Link */}
          <div style={{ borderRadius: 20, border: "1px solid rgba(15,23,42,0.08)", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", padding: 24, boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: 0, marginBottom: 2 }}>Shorten a link</h2>
                <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>Creating on <span style={{ color: "#0f766e", fontFamily: "ui-monospace, monospace" }}>{selectedShortLinkBase.replace(/^https?:\/\//, "")}</span></p>
              </div>
            </div>

            {error && (
              <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)", color: "#b91c1c", fontSize: 13 }}>{error}</div>
            )}

            <form onSubmit={handleCreateUrl}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 160px auto", gap: 10, marginBottom: 14 }}>
                <input
                  type="url"
                  value={longUrl}
                  onChange={e => setLongUrl(e.target.value)}
                  placeholder="https://your-very-long-url.com/..."
                  required
                  style={{ padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(15,23,42,0.15)", background: "#fff", color: "#0f172a", fontSize: 13, outline: "none", transition: "border-color 0.15s, box-shadow 0.15s" }}
                  onFocus={e => { e.target.style.borderColor = "#14b8a6"; e.target.style.boxShadow = "0 0 0 3px rgba(20,184,166,0.15)"; }}
                  onBlur={e => { e.target.style.borderColor = "rgba(15,23,42,0.15)"; e.target.style.boxShadow = "none"; }}
                />
                <input
                  type="text"
                  value={customAlias}
                  onChange={e => setCustomAlias(e.target.value)}
                  placeholder="custom-alias"
                  style={{ padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(15,23,42,0.15)", background: "#fff", color: "#0f172a", fontSize: 13, outline: "none", transition: "border-color 0.15s, box-shadow 0.15s" }}
                  onFocus={e => { e.target.style.borderColor = "#14b8a6"; e.target.style.boxShadow = "0 0 0 3px rgba(20,184,166,0.15)"; }}
                  onBlur={e => { e.target.style.borderColor = "rgba(15,23,42,0.15)"; e.target.style.boxShadow = "none"; }}
                />
                <button
                  type="submit"
                  disabled={isCreating || !longUrl.trim()}
                  style={{ padding: "11px 22px", borderRadius: 10, border: "none", background: isCreating || !longUrl.trim() ? "rgba(20,184,166,0.3)" : "#0f766e", color: "#fff", fontSize: 13, fontWeight: 600, cursor: isCreating || !longUrl.trim() ? "not-allowed" : "pointer", transition: "all 0.15s", whiteSpace: "nowrap" }}
                >{isCreating ? "Creating…" : "Shorten →"}</button>
              </div>

              {/* Domain toggle */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10, background: "rgba(15,23,42,0.02)", border: "1px solid rgba(15,23,42,0.06)" }}>
                <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>Short link domain</span>
                <div style={{ display: "flex", background: "rgba(15,23,42,0.06)", borderRadius: 8, padding: 3, gap: 2 }}>
                  <button
                    type="button"
                    onClick={() => handleShortLinkDomainModeChange("shur")}
                    style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: shortLinkDomainMode === "shur" ? "#fff" : "transparent", color: shortLinkDomainMode === "shur" ? "#0f766e" : "#64748b", fontSize: 11, fontWeight: 600, fontFamily: "ui-monospace, monospace", cursor: "pointer", transition: "all 0.2s", boxShadow: shortLinkDomainMode === "shur" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}
                  >shur.click</button>
                  <button
                    type="button"
                    onClick={() => handleShortLinkDomainModeChange("custom")}
                    disabled={!customShortLinkBase}
                    style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: shortLinkDomainMode === "custom" && customShortLinkBase ? "#fff" : "transparent", color: shortLinkDomainMode === "custom" && customShortLinkBase ? "#4f46e5" : !customShortLinkBase ? "#94a3b8" : "#64748b", fontSize: 11, fontWeight: 600, fontFamily: "ui-monospace, monospace", cursor: !customShortLinkBase ? "not-allowed" : "pointer", transition: "all 0.2s", boxShadow: shortLinkDomainMode === "custom" && customShortLinkBase ? "0 1px 3px rgba(0,0,0,0.1)" : "none", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    title={verifiedDomain || "Custom domain"}
                  >{verifiedDomain ? (verifiedDomain.length > 18 ? verifiedDomain.slice(0, 16) + "…" : verifiedDomain) : "Custom"}</button>
                </div>
              </div>
            </form>
          </div>

          {/* Plan & Domains Panel */}
          {billing && (
            <div style={{ borderRadius: 20, border: "1px solid rgba(15,23,42,0.08)", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", padding: 24, display: "flex", flexDirection: "column", gap: 0, boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
              {/* Plan header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#64748b", marginBottom: 4 }}>Plan</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0 }}>{billing.proActive ? "Pro" : `Free`}</p>
                  {billing.proActive && billing.proExpiresAt && (
                    <p style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>until {parseApiDateTime(billing.proExpiresAt)?.toLocaleDateString("en-IN", { timeZone: IST_TIMEZONE }) ?? "N/A"}</p>
                  )}
                  {!billing.proActive && (
                    <p style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{billing.usedLinks}/{billing.freeTierLimit} links used</p>
                  )}
                </div>
                <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", background: billing.proActive ? "rgba(245,158,11,0.15)" : "rgba(100,116,139,0.1)", border: billing.proActive ? "1px solid rgba(245,158,11,0.3)" : "1px solid rgba(100,116,139,0.2)", color: billing.proActive ? "#d97706" : "#64748b" }}>
                  {billing.proActive ? "Unlimited" : "Free tier"}
                </span>
              </div>

              {/* Free → Upgrade CTA */}
              {!billing.proActive && (
                <>
                  {/* Progress bar */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ height: 4, borderRadius: 4, background: "rgba(15,23,42,0.06)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min((billing.usedLinks / billing.freeTierLimit) * 100, 100)}%`, background: "#0f766e", borderRadius: 4, transition: "width 0.6s ease" }} />
                    </div>
                    <p style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>{billing.remainingFreeLinks ?? 0} free links remaining</p>
                  </div>
                  <button
                    onClick={handleUpgrade}
                    disabled={isUpgrading}
                    style={{ width: "100%", padding: "11px 0", borderRadius: 10, border: "none", background: isUpgrading ? "rgba(245,158,11,0.3)" : "#d97706", color: "#fff", fontSize: 13, fontWeight: 700, cursor: isUpgrading ? "not-allowed" : "pointer", transition: "all 0.15s", marginBottom: 12 }}
                  >{isUpgrading ? "Opening checkout…" : `Upgrade to Pro — $${billing.proMonthlyPriceUsd}/mo`}</button>
                  {/* Promo */}
                  <form onSubmit={handleRedeemPromo} style={{ display: "flex", gap: 8 }}>
                    <input
                      type="text"
                      value={promoCode}
                      onChange={e => setPromoCode(e.target.value.toUpperCase())}
                      placeholder="PROMO CODE"
                      maxLength={64}
                      style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(15,23,42,0.1)", background: "#fff", color: "#0f172a", fontSize: 11, fontFamily: "ui-monospace, monospace", letterSpacing: "0.1em", outline: "none" }}
                      onFocus={e => (e.target.style.borderColor = "#14b8a6")}
                      onBlur={e => (e.target.style.borderColor = "rgba(15,23,42,0.1)")}
                    />
                    <button
                      type="submit"
                      disabled={isRedeeming || !promoCode.trim()}
                      style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(20,184,166,0.3)", background: "rgba(20,184,166,0.1)", color: "#0f766e", fontSize: 11, fontWeight: 600, cursor: isRedeeming || !promoCode.trim() ? "not-allowed" : "pointer" }}
                    >{isRedeeming ? "…" : "Redeem"}</button>
                  </form>
                  {promoSuccess && <p style={{ fontSize: 11, color: "#059669", marginTop: 6 }}>{promoSuccess}</p>}
                  {promoError && <p style={{ fontSize: 11, color: "#dc2626", marginTop: 6 }}>{promoError}</p>}
                </>
              )}

              {/* Pro → Custom Domain */}
              {billing.proActive && (
                <div style={{ borderTop: "1px solid rgba(15,23,42,0.06)", paddingTop: 16, marginTop: 4 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Custom Domain</p>
                  {domains.length === 0 && (
                    <form onSubmit={handleAddDomain} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                      <input
                        type="text"
                        value={newDomain}
                        onChange={e => setNewDomain(e.target.value)}
                        placeholder="links.yourbrand.com"
                        style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(15,23,42,0.1)", background: "#fff", color: "#0f172a", fontSize: 12, outline: "none" }}
                        onFocus={e => (e.target.style.borderColor = "#6366f1")}
                        onBlur={e => (e.target.style.borderColor = "rgba(15,23,42,0.1)")}
                      />
                      <button
                        type="submit"
                        disabled={!newDomain.trim()}
                        style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#4f46e5", color: "#fff", fontSize: 11, fontWeight: 600, cursor: !newDomain.trim() ? "not-allowed" : "pointer", opacity: !newDomain.trim() ? 0.5 : 1 }}
                      >Add</button>
                    </form>
                  )}
                  {domainError && <p style={{ fontSize: 11, color: "#dc2626", marginBottom: 8 }}>{domainError}</p>}
                  {isDomainsLoading && <p style={{ fontSize: 11, color: "#64748b" }}>Loading…</p>}
                  {!isDomainsLoading && domains.length === 0 && <p style={{ fontSize: 11, color: "#64748b" }}>No custom domain yet. Add one above.</p>}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {domains.map(d => (
                      <div key={d.id} style={{ borderRadius: 10, border: "1px solid rgba(15,23,42,0.08)", background: "#fff", padding: "10px 12px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, color: "#0f172a", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{d.domain}</p>
                            <span style={{ display: "inline-block", marginTop: 4, padding: "2px 7px", borderRadius: 5, fontSize: 10, fontWeight: 600, background: d.status === "VERIFIED" ? "rgba(16,185,129,0.1)" : d.status === "FAILED" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)", color: d.status === "VERIFIED" ? "#059669" : d.status === "FAILED" ? "#dc2626" : "#d97706", border: d.status === "VERIFIED" ? "1px solid rgba(16,185,129,0.2)" : d.status === "FAILED" ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(245,158,11,0.2)" }}>{d.status}</span>
                          </div>
                          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                            {d.status !== "VERIFIED" && (
                              <button onClick={() => void handleVerifyDomain(d.id)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(20,184,166,0.3)", background: "rgba(20,184,166,0.1)", color: "#0f766e", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Verify</button>
                            )}
                            <button onClick={() => void handleDeleteDomain(d.id)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.05)", color: "#dc2626", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Delete</button>
                          </div>
                        </div>
                        {d.status !== "VERIFIED" && (
                          <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 7, background: "rgba(15,23,42,0.03)", border: "1px solid rgba(15,23,42,0.05)" }}>
                            <p style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>Add this TXT record in your DNS:</p>
                            <pre style={{ margin: 0, fontFamily: "ui-monospace, monospace", fontSize: 10, color: "#475569", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{`Host: _shurclick-verify.${d.domain}\nValue: ${d.verificationToken}`}</pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── LINKS LIST ── */}
        <div style={{ borderRadius: 20, border: "1px solid rgba(15,23,42,0.08)", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
          {/* List header */}
          <div style={{ display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid rgba(15,23,42,0.08)" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>Your Links</h2>
            <span style={{ fontSize: 11, fontFamily: "ui-monospace, monospace", color: "#64748b", background: "rgba(15,23,42,0.05)", padding: "3px 10px", borderRadius: 6 }}>{urls.length} total</span>
          </div>

          {urls.length === 0 ? (
            <div style={{ padding: "64px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12, fontWeight: 700, color: "#cbd5e1" }}>0</div>
              <p style={{ fontSize: 15, color: "#64748b", margin: 0 }}>No links yet. Create your first one above.</p>
            </div>
          ) : (
            <div>
              {urls.map((url, idx) => {
                const computedShortUrl = url.shortUrl || `${DEFAULT_SHORT_LINK_BASE_URL}/${url.shortCode}`;
                const shortBaseUrl = url.shortBaseUrl || DEFAULT_SHORT_LINK_BASE_URL;
                const isShurLink = shortBaseUrl.replace(/\/+$/, "").toLowerCase() === DEFAULT_SHORT_LINK_BASE_URL.toLowerCase();
                const qrOpen = qrOpenId === url.id;
                const geoOpen = geoOpenId === url.id;
                const geoData = geoByCode[url.shortCode];
                const geoError = geoErrorByCode[url.shortCode];
                const geoLoading = geoLoadingCode === url.shortCode;
                const isSwitchingToShur = switchingToShurId === url.id;
                const isSwitchingToCustom = switchingToCustomId === url.id;
                const maxClicks = Math.max(...urls.map(u => u.clickCount), 1);
                const clickPct = Math.round((url.clickCount / maxClicks) * 100);

                return (
                  <article
                    key={url.shortCode}
                    style={{ borderBottom: idx < urls.length - 1 ? "1px solid rgba(15,23,42,0.06)" : "none", padding: "20px 24px", transition: "background 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(15,23,42,0.02)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 20, alignItems: "start" }}>
                      {/* Left: link info */}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                          <a
                            href={computedShortUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontFamily: "ui-monospace, monospace", fontSize: 14, fontWeight: 600, color: "#0f766e", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}
                          >{computedShortUrl}</a>
                          {/* Domain badge */}
                          {!isShurLink && (
                            <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "#4f46e5", fontFamily: "ui-monospace, monospace", flexShrink: 0 }}>custom</span>
                          )}
                        </div>

                        <p style={{ fontSize: 12, color: "#475569", margin: "0 0 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url.longUrl}</p>

                        {/* Click bar */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                          <div style={{ height: 3, flex: 1, maxWidth: 180, borderRadius: 3, background: "rgba(15,23,42,0.06)", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${clickPct}%`, background: "#0f766e", borderRadius: 3, transition: "width 0.6s ease" }} />
                          </div>
                          <span style={{ fontSize: 11, color: "#64748b", flexShrink: 0 }}>{url.clickCount.toLocaleString()} clicks</span>
                        </div>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                          <span style={{ fontSize: 10, color: "#64748b", padding: "3px 8px", borderRadius: 6, background: "rgba(15,23,42,0.03)", border: "1px solid rgba(15,23,42,0.06)" }}>Created {formatDateTime(url.createdAt)}</span>
                          <span style={{ fontSize: 10, color: "#64748b", padding: "3px 8px", borderRadius: 6, background: "rgba(15,23,42,0.03)", border: "1px solid rgba(15,23,42,0.06)" }}>Last click {formatDateTime(url.lastAccessedAt)}</span>
                        </div>

                        {/* Action buttons row */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {/* Copy */}
                          <button
                            onClick={() => handleCopy(computedShortUrl, url.id)}
                            style={{ padding: "5px 12px", borderRadius: 7, border: `1px solid ${copiedId === url.id ? "rgba(16,185,129,0.3)" : "rgba(15,23,42,0.1)"}`, background: copiedId === url.id ? "rgba(16,185,129,0.1)" : "#fff", color: copiedId === url.id ? "#059669" : "#475569", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}
                            onMouseEnter={e => { if (copiedId !== url.id) e.currentTarget.style.background = "rgba(15,23,42,0.02)"; }}
                            onMouseLeave={e => { if (copiedId !== url.id) e.currentTarget.style.background = "#fff"; }}
                          >{copiedId === url.id ? "Copied" : "Copy URL"}</button>

                          {/* QR */}
                          <button
                            onClick={() => setQrOpenId(qrOpen ? null : url.id)}
                            style={{ padding: "5px 12px", borderRadius: 7, border: `1px solid ${qrOpen ? "rgba(20,184,166,0.3)" : "rgba(15,23,42,0.1)"}`, background: qrOpen ? "rgba(20,184,166,0.1)" : "#fff", color: qrOpen ? "#0f766e" : "#475569", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}
                            onMouseEnter={e => { if (!qrOpen) e.currentTarget.style.background = "rgba(15,23,42,0.02)"; }}
                            onMouseLeave={e => { if (!qrOpen) e.currentTarget.style.background = "#fff"; }}
                          >{qrOpen ? "Hide QR" : "QR Code"}</button>

                          {/* Geo analytics */}
                          {billing?.proActive && (
                            <button
                              onClick={() => {
                                if (geoOpen) { setGeoOpenId(null); return; }
                                setGeoOpenId(url.id);
                                if (geoLoadingCode !== url.shortCode) void fetchGeoAnalytics(url.shortCode);
                              }}
                              style={{ padding: "5px 12px", borderRadius: 7, border: `1px solid ${geoOpen ? "rgba(99,102,241,0.3)" : "rgba(15,23,42,0.1)"}`, background: geoOpen ? "rgba(99,102,241,0.1)" : "#fff", color: geoOpen ? "#4f46e5" : "#475569", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}
                              onMouseEnter={e => { if (!geoOpen) e.currentTarget.style.background = "rgba(15,23,42,0.02)"; }}
                              onMouseLeave={e => { if (!geoOpen) e.currentTarget.style.background = "#fff"; }}
                            >{geoOpen ? "Hide analytics" : "Analytics"}</button>
                          )}

                          {/* Domain switch */}
                          {!isShurLink && (
                            <button
                              onClick={() => void handleSwitchToShur(url)}
                              disabled={isSwitchingToShur}
                              style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid rgba(20,184,166,0.3)", background: "rgba(20,184,166,0.05)", color: "#0f766e", fontSize: 11, fontWeight: 600, cursor: isSwitchingToShur ? "not-allowed" : "pointer", opacity: isSwitchingToShur ? 0.6 : 1 }}
                            >{isSwitchingToShur ? "Switching…" : "Use shur.click"}</button>
                          )}
                          {isShurLink && customShortLinkBase && (
                            <button
                              onClick={() => void handleSwitchToCustom(url)}
                              disabled={isSwitchingToCustom}
                              title={`Use ${verifiedDomain}`}
                              style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.05)", color: "#4f46e5", fontSize: 11, fontWeight: 600, cursor: isSwitchingToCustom ? "not-allowed" : "pointer", opacity: isSwitchingToCustom ? 0.6 : 1, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                            >{isSwitchingToCustom ? "Switching…" : `Use custom`}</button>
                          )}

                          {/* Delete */}
                          <button
                            onClick={() => requestDelete(url)}
                            style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid rgba(239,68,68,0.2)", background: "#fff", color: "#dc2626", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.05)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fff"; }}
                          >Delete</button>

                          {/* Free plan analytics notice */}
                          {!billing?.proActive && (
                            <span style={{ fontSize: 10, color: "#64748b", padding: "5px 10px", borderRadius: 7, border: "1px solid rgba(15,23,42,0.05)", background: "rgba(15,23,42,0.02)" }}>Analytics on Pro ⚡</span>
                          )}
                        </div>

                        {/* QR Panel */}
                        {qrOpen && (
                          <div style={{ marginTop: 14, padding: 16, borderRadius: 12, background: "rgba(248,250,252,0.8)", border: "1px solid rgba(15,23,42,0.06)", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                            <div ref={qrOpen ? qrCanvasRef : undefined} style={{ padding: 10, borderRadius: 10, background: "#fff", display: "inline-flex", border: "1px solid rgba(15,23,42,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                              <QRCodeCanvas value={computedShortUrl} size={88} level="M" includeMargin={false} />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              <p style={{ fontSize: 12, color: "#475569", margin: 0, fontFamily: "ui-monospace, monospace" }}>{computedShortUrl}</p>
                              <div style={{ display: "flex", gap: 8 }}>
                                <button
                                  onClick={() => {
                                    const wrapper = qrCanvasRef.current;
                                    if (!wrapper) return;
                                    const canvas = wrapper.querySelector("canvas");
                                    if (!canvas) return;
                                    const link = document.createElement("a");
                                    link.download = `qr-${url.shortCode}.png`;
                                    link.href = canvas.toDataURL("image/png");
                                    link.click();
                                  }}
                                  style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid rgba(15,23,42,0.1)", background: "#fff", color: "#475569", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                                >Download</button>
                                {typeof navigator.share === "function" && (
                                  <button
                                    onClick={async () => {
                                      const wrapper = qrCanvasRef.current;
                                      if (!wrapper) return;
                                      const canvas = wrapper.querySelector("canvas");
                                      if (!canvas) return;
                                      canvas.toBlob(async blob => {
                                        if (!blob) return;
                                        const file = new File([blob], `qr-${url.shortCode}.png`, { type: "image/png" });
                                        try { await navigator.share({ title: `QR for ${computedShortUrl}`, text: computedShortUrl, files: [file] }); } catch { /* cancelled */ }
                                      }, "image/png");
                                    }}
                                    style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid rgba(15,23,42,0.1)", background: "#fff", color: "#475569", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                                  >Share</button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Geo Analytics Panel */}
                        {geoOpen && billing?.proActive && (
                          <div style={{ marginTop: 14, padding: 16, borderRadius: 12, background: "rgba(248,250,252,0.8)", border: "1px solid rgba(99,102,241,0.15)" }}>
                            {geoLoading && <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>Loading analytics…</p>}
                            {geoError && <p style={{ fontSize: 12, color: "#dc2626", margin: 0 }}>{geoError}</p>}
                            {!geoLoading && !geoError && geoData && (
                              <>
                                <div style={{ display: "flex", gap: 20, marginBottom: 12 }}>
                                  <div><p style={{ fontSize: 10, color: "#64748b", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Total</p><p style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: 0 }}>{geoData.totalClicks}</p></div>
                                  <div><p style={{ fontSize: 10, color: "#64748b", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Country-tracked</p><p style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: 0 }}>{geoData.countryTrackedClicks}</p></div>
                                </div>
                                {geoData.topCountries.length === 0 ? (
                                  <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>No country data yet.</p>
                                ) : (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    {geoData.topCountries.map(row => {
                                      const denom = geoData.countryTrackedClicks || 1;
                                      const pct = Math.round((row.clicks / denom) * 100);
                                      return (
                                        <div key={row.countryCode} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                          <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, color: "#64748b", width: 28, flexShrink: 0 }}>{row.countryCode}</span>
                                          <div style={{ flex: 1, height: 4, borderRadius: 3, background: "rgba(15,23,42,0.06)", overflow: "hidden" }}>
                                            <div style={{ height: "100%", width: `${pct}%`, background: "#0f766e", borderRadius: 3 }} />
                                          </div>
                                          <span style={{ fontSize: 11, color: "#64748b", flexShrink: 0, width: 70, textAlign: "right" }}>{row.clicks} ({pct}%)</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right: click count badge */}
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <p style={{ fontSize: 28, fontWeight: 700, color: "#0f172a", margin: "0 0 2px", lineHeight: 1 }}>{url.clickCount.toLocaleString()}</p>
                        <p style={{ fontSize: 10, fontFamily: "ui-monospace, monospace", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>clicks</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ── DIALOGS ── */}
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

      {/* ── PROFILE DRAWER ── */}
      {isProfileOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 50, display: "grid", placeItems: "center", background: "rgba(15,23,42,0.5)", backdropFilter: "blur(8px)", padding: 16, overflowY: "auto" }}
          onClick={e => { if (e.target === e.currentTarget) setIsProfileOpen(false); }}
        >
          <div style={{ width: "100%", maxWidth: 480, borderRadius: 20, background: "#fff", border: "1px solid rgba(15,23,42,0.08)", padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", maxHeight: "calc(100svh - 48px)", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: 0 }}>Profile Settings</h3>
              <button onClick={() => setIsProfileOpen(false)} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(15,23,42,0.1)", background: "#fff", color: "#64748b", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center" }}>×</button>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 6, marginBottom: 24, background: "rgba(15,23,42,0.04)", borderRadius: 10, padding: 4 }}>
              {(["profile", "password", "danger"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setProfileTab(tab)}
                  style={{ flex: 1, padding: "7px 0", borderRadius: 7, border: "none", background: profileTab === tab ? (tab === "danger" ? "#dc2626" : "#fff") : "transparent", color: profileTab === tab ? (tab === "danger" ? "#fff" : "#0f172a") : "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", textTransform: "capitalize", boxShadow: profileTab === tab ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}
                >{tab === "danger" ? "Danger" : tab.charAt(0).toUpperCase() + tab.slice(1)}</button>
              ))}
            </div>

            {isProfileLoading ? (
              <p style={{ fontSize: 13, color: "#64748b", textAlign: "center", padding: 32 }}>Loading profile…</p>
            ) : (
              <>
                {/* Profile Tab */}
                {profileTab === "profile" && (
                  <form onSubmit={handleProfileSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "space-between" }}>
                      <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>Edit to unlock fields</p>
                      <div style={{ display: "flex", gap: 8 }}>
                        {isProfileEditing && (
                          <button type="button" onClick={() => { setProfileFullName(initialProfileFullName); setProfileEmail(initialProfileEmail); setProfileError(null); setProfileMessage(null); setIsProfileEditing(false); }} style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid rgba(15,23,42,0.1)", background: "#fff", color: "#475569", fontSize: 11, cursor: "pointer" }}>Cancel</button>
                        )}
                        <button type="button" onClick={() => setIsProfileEditing(p => !p)} style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid rgba(20,184,166,0.3)", background: "rgba(20,184,166,0.1)", color: "#0f766e", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{isProfileEditing ? "Lock" : "Edit"}</button>
                      </div>
                    </div>
                    {[{ label: "Full name", value: profileFullName, setValue: setProfileFullName, type: "text" }, { label: "Email", value: profileEmail, setValue: setProfileEmail, type: "email" }].map(field => (
                      <label key={field.label} style={{ display: "block" }}>
                        <span style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{field.label}</span>
                        <input
                          type={field.type}
                          value={field.value}
                          onChange={e => field.setValue(e.target.value)}
                          disabled={!isProfileEditing}
                          required
                          style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: `1px solid ${isProfileEditing ? "rgba(20,184,166,0.4)" : "rgba(15,23,42,0.1)"}`, background: isProfileEditing ? "#fff" : "rgba(15,23,42,0.02)", color: isProfileEditing ? "#0f172a" : "#64748b", fontSize: 13, outline: "none", transition: "all 0.2s", boxSizing: "border-box" }}
                        />
                      </label>
                    ))}
                    {profileError && <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)", color: "#b91c1c", fontSize: 12 }}>{profileError}</div>}
                    {profileMessage && <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.2)", color: "#059669", fontSize: 12 }}>{profileMessage}</div>}
                    <button type="submit" disabled={!isProfileEditing || isProfileSaving || !profileFullName.trim() || !profileEmail.trim()} style={{ padding: "11px 0", borderRadius: 10, border: "none", background: !isProfileEditing || isProfileSaving ? "rgba(20,184,166,0.2)" : "#0f766e", color: "#fff", fontSize: 13, fontWeight: 600, cursor: !isProfileEditing ? "not-allowed" : "pointer" }}>{isProfileSaving ? "Saving…" : "Save profile"}</button>
                    {profileEmailOtpChallengeId && (
                      <div style={{ padding: 14, borderRadius: 10, background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.2)" }}>
                        <p style={{ fontSize: 12, color: "#d97706", marginBottom: 10 }}>Enter OTP sent to <strong>{profilePendingEmail || "new email"}</strong></p>
                        <div style={{ display: "flex", gap: 8 }}>
                          <input type="text" value={profileEmailOtp} onChange={e => setProfileEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit OTP" style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(245,158,11,0.3)", background: "#fff", color: "#d97706", fontSize: 14, fontFamily: "ui-monospace, monospace", letterSpacing: "0.15em", outline: "none" }} />
                          <button type="button" onClick={() => void handleVerifyProfileEmailOtp()} disabled={isProfileOtpVerifying || profileEmailOtp.length !== 6} style={{ padding: "9px 14px", borderRadius: 8, border: "none", background: "#d97706", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{isProfileOtpVerifying ? "…" : "Verify"}</button>
                        </div>
                      </div>
                    )}
                  </form>
                )}

                {/* Password Tab */}
                {profileTab === "password" && (
                  <form onSubmit={handlePasswordSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {[
                      { label: "Current password", value: currentPassword, setValue: setCurrentPassword, show: showCurrentPassword, setShow: setShowCurrentPassword },
                      { label: "New password", value: newPassword, setValue: setNewPassword, show: showNewPassword, setShow: setShowNewPassword },
                      { label: "Confirm new password", value: confirmNewPassword, setValue: setConfirmNewPassword, show: showConfirmNewPassword, setShow: setShowConfirmNewPassword },
                    ].map(field => (
                      <label key={field.label} style={{ display: "block" }}>
                        <span style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{field.label}</span>
                        <div style={{ position: "relative" }}>
                          <input
                            type={field.show ? "text" : "password"}
                            value={field.value}
                            onChange={e => field.setValue(e.target.value)}
                            minLength={8}
                            required
                            style={{ width: "100%", padding: "11px 44px 11px 14px", borderRadius: 10, border: "1px solid rgba(15,23,42,0.15)", background: "#fff", color: "#0f172a", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                            onFocus={e => (e.target.style.borderColor = "#14b8a6")}
                            onBlur={e => (e.target.style.borderColor = "rgba(15,23,42,0.15)")}
                          />
                          <button type="button" onClick={() => field.setShow(p => !p)} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 42, background: "none", border: "none", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} aria-label={field.show ? "Hide" : "Show"}>
                            {field.show ? (
                              <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: "none", stroke: "currentColor", strokeWidth: 1.8 }}><path d="M3 3l18 18" /><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c6 0 10 8 10 8a18.4 18.4 0 0 1-4.1 4.8" /><path d="M6.6 6.7C3.7 8.6 2 12 2 12s4 8 10 8a10.8 10.8 0 0 0 4.1-.8" /></svg>
                            ) : (
                              <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: "none", stroke: "currentColor", strokeWidth: 1.8 }}><path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
                            )}
                          </button>
                        </div>
                      </label>
                    ))}
                    {passwordError && <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)", color: "#b91c1c", fontSize: 12 }}>{passwordError}</div>}
                    {passwordMessage && <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.2)", color: "#059669", fontSize: 12 }}>{passwordMessage}</div>}
                    <button type="submit" disabled={isPasswordSaving || !currentPassword || !newPassword || !confirmNewPassword} style={{ padding: "11px 0", borderRadius: 10, border: "none", background: isPasswordSaving || !currentPassword || !newPassword || !confirmNewPassword ? "rgba(20,184,166,0.2)" : "#0f766e", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{isPasswordSaving ? "Updating…" : "Update password"}</button>
                  </form>
                )}

                {/* Danger Tab */}
                {profileTab === "danger" && (
                  <div style={{ padding: 20, borderRadius: 12, background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "#b91c1c", margin: "0 0 6px" }}>Delete Account</p>
                    <p style={{ fontSize: 12, color: "#dc2626", margin: "0 0 16px" }}>This permanently removes your account and all links. This cannot be undone.</p>
                    <button onClick={openDeleteAccountConfirm} style={{ padding: "10px 20px", borderRadius: 9, border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.1)", color: "#b91c1c", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.15)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.1)"; }}
                    >Delete my account</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
