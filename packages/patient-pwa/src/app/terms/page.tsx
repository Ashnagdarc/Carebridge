export default function TermsPage() {
  const sections = [
    {
      title: "Using Carebridge",
      body: "Carebridge is a patient-facing consent management app. You are responsible for keeping your login credentials private and for reviewing each consent request before approving or denying it.",
    },
    {
      title: "Consent Decisions",
      body: "Approving a request grants the requesting healthcare provider access to the selected data types for the duration you choose. Denying a request prevents that access. Active consents can be revoked from the consent history screen.",
    },
    {
      title: "Account And Security",
      body: "You agree to provide accurate account information and to notify the Carebridge support team if you believe your account, patient ID, or active session has been compromised.",
    },
    {
      title: "Notifications",
      body: "Carebridge may use in-app and device notifications to alert you about consent requests, access activity, expiry reminders, and security events. Delivery depends on your device and browser permissions.",
    },
    {
      title: "Limitations",
      body: "Carebridge is not a replacement for emergency medical communication, clinical judgment, or direct contact with your healthcare provider. Some features may depend on hospital integrations and local policies.",
    },
    {
      title: "Changes",
      body: "These terms may change as the product, integrations, and compliance requirements evolve. Continued use after updates means you accept the revised terms.",
    },
  ];

  return (
    <div className="container-safe mx-auto max-w-2xl py-10">
      <div className="space-y-3 border-b border-tertiary pb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Carebridge Patient PWA
        </p>
        <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
        <p className="text-sm leading-6 text-gray-600">
          Last updated April 23, 2026. This is product-specific starter copy
          for the current Carebridge MVP and should be reviewed by legal counsel
          before launch.
        </p>
      </div>

      <div className="mt-8 space-y-7">
        {sections.map((section) => (
          <section key={section.title} className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              {section.title}
            </h2>
            <p className="text-sm leading-6 text-gray-700">{section.body}</p>
          </section>
        ))}

        <section className="space-y-2 rounded-lg border border-tertiary bg-secondary p-4">
          <h2 className="text-lg font-semibold text-foreground">Support</h2>
          <p className="text-sm leading-6 text-gray-700">
            If you have questions about your account, consent history, or a
            healthcare provider request, contact the Carebridge support channel
            provided by your healthcare organization.
          </p>
        </section>
      </div>
    </div>
  );
}
