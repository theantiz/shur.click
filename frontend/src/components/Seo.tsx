import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_NAME = "shur.click";
const SITE_URL = "https://shur.click";
const SITE_DESCRIPTION =
  "shur.click is the official SaaS URL shortener for branded links, QR codes, click analytics, and a simple dashboard.";
const DEFAULT_IMAGE = `${SITE_URL}/android-chrome-512x512.png`;
const TITLE_SUFFIX = " | shur.click";

type RouteMeta = {
  title: string;
  description: string;
  keywords?: string;
  canonicalPath: string;
  robots?: string;
  ogType?: "website" | "article";
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
};

function ensureMeta(
  selector: string,
  attribute: "name" | "property",
  value: string,
) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, value);
    document.head.appendChild(element);
  }
  return element;
}

function setMetaByName(name: string, content: string) {
  ensureMeta(`meta[name="${name}"]`, "name", name).setAttribute(
    "content",
    content,
  );
}

function setMetaByProperty(property: string, content: string) {
  ensureMeta(`meta[property="${property}"]`, "property", property).setAttribute(
    "content",
    content,
  );
}

function setCanonical(url: string) {
  let link = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", url);
}

function setStructuredData(
  data?: Record<string, unknown> | Record<string, unknown>[],
) {
  const existing = document.head.querySelector<HTMLScriptElement>(
    "#route-structured-data",
  );
  if (!data) {
    existing?.remove();
    return;
  }

  const script = existing ?? document.createElement("script");
  script.id = "route-structured-data";
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(data);
  if (!existing) {
    document.head.appendChild(script);
  }
}

function buildMeta(pathname: string): RouteMeta {
  switch (pathname) {
    case "/":
      return {
        title: "Branded URL Shortener, QR Codes & Analytics",
        description: SITE_DESCRIPTION,
        keywords:
          "shur.click, url shortener, branded links, custom short links, qr code links, link analytics, short link dashboard",
        canonicalPath: "/",
        ogType: "website",
        structuredData: [
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: SITE_NAME,
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            url: SITE_URL,
            description:
              "SaaS URL shortener for branded links, QR sharing, and click analytics.",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: SITE_NAME,
            url: SITE_URL,
            description: SITE_DESCRIPTION,
          },
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: SITE_NAME,
            url: SITE_URL,
            logo: DEFAULT_IMAGE,
          },
        ],
      };
    case "/terms":
      return {
        title: "Terms of Service",
        description:
          "Read the shur.click Terms of Service covering account use, service access, billing, and platform responsibilities.",
        keywords:
          "shur.click terms, terms of service, saas terms, url shortener terms",
        canonicalPath: "/terms",
        structuredData: {
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: `Terms of Service${TITLE_SUFFIX}`,
          url: `${SITE_URL}/terms`,
          description:
            "Terms of Service for the shur.click SaaS URL shortener platform.",
        },
      };
    case "/privacy":
      return {
        title: "Privacy Policy",
        description:
          "Review how shur.click collects, stores, and protects account data, link usage data, and service analytics.",
        keywords:
          "shur.click privacy, privacy policy, saas privacy, link analytics privacy",
        canonicalPath: "/privacy",
        structuredData: {
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: `Privacy Policy${TITLE_SUFFIX}`,
          url: `${SITE_URL}/privacy`,
          description:
            "Privacy Policy for the shur.click SaaS URL shortener platform.",
        },
      };
    case "/license":
      return {
        title: "Software License",
        description:
          "See the shur.click SaaS software license terms for hosted access, account scope, billing, and usage restrictions.",
        keywords:
          "shur.click license, saas license, software license agreement, hosted software terms",
        canonicalPath: "/license",
        structuredData: {
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: `Software License${TITLE_SUFFIX}`,
          url: `${SITE_URL}/license`,
          description:
            "Software License Agreement for the shur.click SaaS platform.",
        },
      };
    case "/feedback":
      return {
        title: "Product Feedback",
        description:
          "Send bug reports, feature requests, and product feedback to the shur.click team.",
        keywords: "shur.click feedback, feature request, bug report",
        canonicalPath: "/feedback",
        robots: "noindex,nofollow",
      };
    case "/track":
      return {
        title: "Track Short Link Performance",
        description:
          "Track clicks and recent activity for your shur.click short URLs from the live stats page.",
        keywords:
          "track short link, click stats, short url analytics, shur.click tracking",
        canonicalPath: "/track",
        robots: "noindex,nofollow",
      };
    case "/auth/login":
    case "/login":
      return {
        title: "Login",
        description:
          "Sign in to shur.click to manage branded short links, analytics, and billing.",
        canonicalPath: "/auth/login",
        robots: "noindex,nofollow",
      };
    case "/auth/signup":
    case "/signup":
      return {
        title: "Create Account",
        description:
          "Create a shur.click account to start shortening links, generating QR codes, and tracking clicks.",
        canonicalPath: "/auth/signup",
        robots: "noindex,nofollow",
      };
    case "/forgot-password":
      return {
        title: "Forgot Password",
        description: "Recover access to your shur.click account.",
        canonicalPath: "/forgot-password",
        robots: "noindex,nofollow",
      };
    case "/forgot-password-otp":
      return {
        title: "Verify Reset OTP",
        description:
          "Verify your reset code to continue recovering your shur.click account.",
        canonicalPath: "/forgot-password-otp",
        robots: "noindex,nofollow",
      };
    case "/reset-password":
      return {
        title: "Reset Password",
        description: "Set a new password for your shur.click account.",
        canonicalPath: "/reset-password",
        robots: "noindex,nofollow",
      };
    case "/user/dashboard":
    case "/dashboard":
      return {
        title: "Dashboard",
        description:
          "Manage short links, analytics, and billing in your shur.click dashboard.",
        canonicalPath: "/user/dashboard",
        robots: "noindex,nofollow",
      };
    default:
      return {
        title: "Smart Link Platform",
        description:
          "shur.click helps teams shorten links, share faster, and review click analytics from one SaaS dashboard.",
        keywords:
          "url shortener, link analytics, smart link platform, shur.click",
        canonicalPath: pathname || "/",
        robots: "index,follow,max-image-preview:large",
      };
  }
}

export default function Seo() {
  const location = useLocation();

  useEffect(() => {
    const meta = buildMeta(location.pathname);
    const canonicalUrl = `${SITE_URL}${meta.canonicalPath}`;
    const fullTitle = `${meta.title}${TITLE_SUFFIX}`;
    const robots = meta.robots ?? "index,follow,max-image-preview:large";
    const keywords =
      meta.keywords ??
      "shur.click, url shortener, branded short links, link management, link analytics";

    document.title = fullTitle;

    setMetaByName("description", meta.description);
    setMetaByName("keywords", keywords);
    setMetaByName("robots", robots);
    setMetaByName("author", SITE_NAME);
    setMetaByName("application-name", SITE_NAME);
    setMetaByName("apple-mobile-web-app-title", SITE_NAME);

    setMetaByProperty("og:type", meta.ogType ?? "website");
    setMetaByProperty("og:site_name", SITE_NAME);
    setMetaByProperty("og:locale", "en_US");
    setMetaByProperty("og:title", fullTitle);
    setMetaByProperty("og:description", meta.description);
    setMetaByProperty("og:url", canonicalUrl);
    setMetaByProperty("og:image", DEFAULT_IMAGE);
    setMetaByProperty("og:image:alt", `${SITE_NAME} official website logo`);
    setMetaByProperty("og:image:width", "512");
    setMetaByProperty("og:image:height", "512");

    setMetaByName("twitter:card", "summary_large_image");
    setMetaByName("twitter:site", "@shurclick");
    setMetaByName("twitter:creator", "@shurclick");
    setMetaByName("twitter:title", fullTitle);
    setMetaByName("twitter:description", meta.description);
    setMetaByName("twitter:image", DEFAULT_IMAGE);
    setMetaByName("twitter:image:alt", `${SITE_NAME} official website logo`);
    setMetaByName("twitter:url", canonicalUrl);

    setCanonical(canonicalUrl);
    setStructuredData(meta.structuredData);
  }, [location.pathname]);

  return null;
}
