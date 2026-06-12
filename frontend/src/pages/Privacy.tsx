import InfoPageShell from "../components/InfoPageShell";

export default function Privacy() {
  return (
    <InfoPageShell
      title="Privacy Policy"
      subtitle="How shur.click collects, uses, stores, and protects your data."
    >
      <p className="font-medium text-slate-800">Updated: February 22, 2026</p>

      <p>
        shur.click ("Company," "we," or "us") is committed to protecting your privacy. This Privacy
        Policy explains how we collect, use, store, and protect your information when you use our Services.
      </p>

      <h2 className="pt-2 text-base font-semibold text-slate-900">
        Information We Collect About You and How We Collect It
      </h2>
      <p>
        We collect information you provide directly and information automatically collected when you use our
        Services.
      </p>

      <h2 className="pt-2 text-base font-semibold text-slate-900">Information You Provide to Us</h2>
      <ul className="list-disc space-y-1 pl-6">
        <li>Account registration data, including email, encrypted password, and optional name.</li>
        <li>Authentication provider details when using third-party login methods.</li>
        <li>Content submitted for generation and your customization preferences.</li>
        <li>API keys, request metadata, and usage metrics for API usage.</li>
      </ul>

      <h2 className="pt-2 text-base font-semibold text-slate-900">Automatic Data Collection</h2>
      <ul className="list-disc space-y-1 pl-6">
        <li>Usage data, pages visited, feature interactions, and behavior patterns.</li>
        <li>Technical data such as IP address, browser, OS, and device information.</li>
        <li>Cookies and similar technologies to maintain sessions and improve reliability.</li>
      </ul>

      <h2 className="pt-2 text-base font-semibold text-slate-900">Third-Party Authentication Services</h2>
      <p>
        We may use providers such as Supabase and Google OAuth for authentication. Their privacy policies
        govern credential handling. We only receive identity data needed to operate your account.
      </p>

      <h2 className="pt-2 text-base font-semibold text-slate-900">How We Use Your Information</h2>
      <ul className="list-disc space-y-1 pl-6">
        <li>Account management and authentication.</li>
        <li>Service delivery and processing of generation requests.</li>
        <li>Usage quota and limit tracking.</li>
        <li>Service improvement and operational analysis.</li>
        <li>Security, fraud prevention, and abuse detection.</li>
      </ul>
      <p>
        We do not use your information for unrelated marketing or advertising purposes.
      </p>

      <h2 className="pt-2 text-base font-semibold text-slate-900">Data Storage and Retention</h2>
      <p>
        Account and usage data are retained while your account is active and for a reasonable period after
        deletion where required by law or security needs.
      </p>
      <p>
        Generated content may be stored for a limited period to provide downloads and service reliability,
        and may be deleted automatically or upon request.
      </p>

      <h2 className="pt-2 text-base font-semibold text-slate-900">Disclosure of Your Information</h2>
      <p>We do not sell your personal data. Limited disclosures may occur only:</p>
      <ul className="list-disc space-y-1 pl-6">
        <li>To trusted service providers under confidentiality obligations.</li>
        <li>To comply with legal requirements.</li>
        <li>During business transfers such as merger or acquisition.</li>
        <li>With your explicit consent.</li>
      </ul>

      <h2 className="pt-2 text-base font-semibold text-slate-900">Data Security</h2>
      <p>
        We apply reasonable technical and organizational security controls, including encryption, secure access
        controls, and ongoing security updates. No system is absolutely secure.
      </p>

      <h2 className="pt-2 text-base font-semibold text-slate-900">Your Rights and Choices</h2>
      <ul className="list-disc space-y-1 pl-6">
        <li>Access and review account data.</li>
        <li>Request deletion of account and associated data.</li>
        <li>Download generated content before expiration/deletion.</li>
      </ul>

      <h2 className="pt-2 text-base font-semibold text-slate-900">International Data Transfers</h2>
      <p>
        Your information may be processed in countries outside your residence with different legal protections.
        By using the Services, you consent to such transfers.
      </p>

      <h2 className="pt-2 text-base font-semibold text-slate-900">Changes to This Privacy Policy</h2>
      <p>
        We may update this policy periodically. Material changes are posted on this page with an updated date.
      </p>

      <h2 className="pt-2 text-base font-semibold text-slate-900">Third-Party Services</h2>
      <p>
        Our Services may link to third-party sites. We are not responsible for external privacy practices and
        recommend reviewing their policies directly.
      </p>

      <h2 className="pt-2 text-base font-semibold text-slate-900">Contact</h2>
      <p>
        Questions about privacy:{" "}
        <a className="text-teal-700 hover:text-teal-800" href="mailto:jaychothiyawala04@gmail.com">
          jaychothiyawala04@gmail.com
        </a>
      </p>
    </InfoPageShell>
  );
}
