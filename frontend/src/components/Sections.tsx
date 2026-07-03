const features = [
  {
    title: "Consistent Branding",
    desc: "Use memorable aliases so every campaign link feels intentional and trustworthy.",
  },
  {
    title: "Shared Team Dashboard",
    desc: "Try 2 links before signup, then keep them in your dashboard when you create an account.",
  },
  {
    title: "Reliable Analytics",
    desc: "Track clicks and recency so performance decisions are based on real usage.",
  },
];

const steps = [
  "Create a short link from any long destination URL.",
  "Share it across social posts, docs, and campaigns.",
  "Monitor click performance and optimize from dashboard.",
];

export default function Sections() {
  return (
    <>
      <section
        id="features"
        className="mx-auto mt-14 w-full max-w-6xl sm:mt-16"
      >
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-900 sm:text-3xl">
            Why choose shur.click
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-slate-200 bg-white/80 p-5"
            >
              <h3 className="text-lg font-semibold text-slate-900">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-slate-600">{feature.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how" className="mx-auto mt-10 w-full max-w-6xl sm:mt-12">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-900 sm:text-3xl">
            How it works
          </h2>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-slate-900 sm:text-xl">
            Simple workflow, fast output
          </h3>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {steps.map((step, index) => (
              <div
                key={step}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <p className="font-mono text-xs text-teal-700">0{index + 1}</p>
                <p className="mt-2 text-sm text-slate-700">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="plans" className="mx-auto mt-10 w-full max-w-6xl sm:mt-12">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-900 sm:text-3xl">
            Plans
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white/80 p-5">
            <p className="font-mono text-xs text-slate-500">FREE</p>
            <h4 className="mt-1 text-xl font-semibold text-slate-900">
              $0 / month
            </h4>
            <p className="mt-2 text-sm text-slate-600">
              Create 2 links before signup, then keep those links when you sign
              in and continue on the free plan.
            </p>
          </article>
          <article className="rounded-2xl border border-teal-200 bg-teal-50/70 p-5">
            <p className="font-mono text-xs text-teal-700">PRO</p>
            <h4 className="mt-1 text-xl font-semibold text-slate-900">
              $5 / month
            </h4>
            <p className="mt-2 text-sm text-slate-700">
              Unlimited link creation with the same dashboard workflow and
              billing support.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
