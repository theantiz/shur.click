import InfoPageShell from "../components/InfoPageShell";

export default function License() {
  return (
    <InfoPageShell
      title="License"
      subtitle="SaaS software license terms for shur.click."
    >
      <p className="font-medium text-slate-800">Updated: February 22, 2026</p>

      <p>
        This Software License Agreement ("License") is a legal agreement between you ("Customer," "you," or
        "your") and shur.click ("Company," "we," "our," or "us") governing your use of our software services,
        websites, APIs, and related functionality (collectively, the "Services").
      </p>

      <h2 className="pt-2 text-base font-semibold text-slate-900">1. License Grant</h2>
      <p>
        Subject to your compliance with this License and our Terms of Service, we grant you a limited,
        non-exclusive, non-transferable, non-sublicensable, revocable right to access and use the Services
        during your subscription term for your internal business or personal use.
      </p>

      <h2 className="pt-2 text-base font-semibold text-slate-900">2. SaaS Delivery Model</h2>
      <p>
        The Services are licensed, not sold. You receive rights to use hosted software functionality only.
        No ownership rights in software source code, architecture, or proprietary systems are transferred to
        you under this License.
      </p>

      <h2 className="pt-2 text-base font-semibold text-slate-900">3. Account Scope and Authorized Use</h2>
      <p>
        Your license is tied to your account and service plan. You are responsible for all activity performed
        under your credentials and for ensuring authorized users comply with this License.
      </p>

      <h2 className="pt-2 text-base font-semibold text-slate-900">4. Restrictions</h2>
      <p>You must not, and must not permit third parties to:</p>
      <ul className="list-disc space-y-1 pl-6">
        <li>Copy, modify, distribute, sell, lease, sublicense, or commercially exploit the Services.</li>
        <li>Reverse engineer, decompile, disassemble, or attempt to derive source code.</li>
        <li>Bypass usage limits, security controls, authentication, or billing enforcement.</li>
        <li>Use automated scripts or bots to abuse the Services or degrade platform performance.</li>
        <li>Remove copyright, trademark, or proprietary notices.</li>
      </ul>

      <h2 className="pt-2 text-base font-semibold text-slate-900">5. Customer Data and Generated Content</h2>
      <p>
        You retain rights to your uploaded inputs and generated outputs. You grant us a limited license to
        host, process, transmit, and store data solely to operate, secure, and improve the Services.
      </p>
      <p>
        You are responsible for ensuring that your content and use of the Services comply with applicable laws
        and third-party rights.
      </p>

      <h2 className="pt-2 text-base font-semibold text-slate-900">6. Subscription, Billing, and Plan Changes</h2>
      <p>
        Access to certain features may require a paid plan. Subscription fees, usage limits, and included
        features are defined in your selected plan. We may update plans and pricing prospectively, with notice
        as required by applicable law.
      </p>
      <p>
        Unless otherwise stated, fees are non-refundable. Taxes, duties, and payment processing charges may
        apply based on your location and payment method.
      </p>

      <h2 className="pt-2 text-base font-semibold text-slate-900">7. Availability and Support</h2>
      <p>
        We aim to provide reliable service but do not guarantee uninterrupted or error-free availability.
        Scheduled maintenance, updates, and security events may result in downtime.
      </p>

      <h2 className="pt-2 text-base font-semibold text-slate-900">8. Intellectual Property</h2>
      <p>
        All rights, title, and interest in and to the Services, including software, design, branding, and
        documentation, remain exclusively owned by shur.click and its licensors.
      </p>
      <p>
        Open-source components may be included and are governed by their applicable third-party licenses.
      </p>

      <h2 className="pt-2 text-base font-semibold text-slate-900">9. Security and Compliance</h2>
      <p>
        We implement reasonable technical and organizational measures to protect service integrity and data.
        You are responsible for maintaining credential security and promptly reporting unauthorized access.
      </p>

      <h2 className="pt-2 text-base font-semibold text-slate-900">10. Suspension and Termination</h2>
      <p>
        We may suspend or terminate access if you violate this License, create legal or security risk, or fail
        to meet payment obligations. Upon termination, license rights end immediately.
      </p>

      <h2 className="pt-2 text-base font-semibold text-slate-900">11. Disclaimer of Warranties</h2>
      <p className="uppercase">
        The services are provided "as is" and "as available" without warranties of any kind, whether express,
        implied, statutory, or otherwise.
      </p>

      <h2 className="pt-2 text-base font-semibold text-slate-900">12. Limitation of Liability</h2>
      <p className="uppercase">
        To the maximum extent permitted by law, shur.click is not liable for indirect, incidental, special,
        consequential, or punitive damages, or loss of profits, data, goodwill, or business interruption.
      </p>

      <h2 className="pt-2 text-base font-semibold text-slate-900">13. Changes to This License</h2>
      <p>
        We may update this License from time to time. Material changes are effective when posted, unless a
        later effective date is stated.
      </p>

      <h2 className="pt-2 text-base font-semibold text-slate-900">14. Contact</h2>
      <p>
        For licensing, enterprise usage, or redistribution permissions, contact{" "}
        <a className="text-teal-700 hover:text-teal-800" href="mailto:jaychothiyawala04@gmail.com">
          jaychothiyawala04@gmail.com
        </a>.
      </p>
    </InfoPageShell>
  );
}
