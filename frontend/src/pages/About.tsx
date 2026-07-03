import InfoPageShell from "../components/InfoPageShell";

export default function About() {
  return (
    <InfoPageShell
      title="About shur.click"
      subtitle="A simple URL shortener designed for clean links and practical analytics."
    >
      <p>
        shur.click helps you create short links, share them faster, and
        understand how they perform. The goal is to keep link management
        straightforward without bloated tools.
      </p>
      <p>
        Features include custom aliases, click tracking, geo analytics, and
        dashboard access for signed-in users. During beta launch, we are focused
        on stability, speed, and better UX.
      </p>
      <p>
        Contact:{" "}
        <a
          className="text-teal-700 hover:text-teal-800"
          href="mailto:jaychothiyawala04@gmail.com"
        >
          jay@antiz.xyz
        </a>
      </p>
    </InfoPageShell>
  );
}
