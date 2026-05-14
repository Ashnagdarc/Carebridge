// CareBridge: Patient PWA route/layout implementation.
export default function PrivacyPage() {
  const sections = [
    {
      title: "What Carebridge Handles",
      body: "Carebridge helps patients control hospital access to selected health data. The PWA shows your patient ID, pending consent requests, active consents, consent history, access logs, notification settings, and account security controls.",
    },
    {
      title: "Information We Collect",
      body: "We collect account details such as your name, email address, patient identifier, authentication sessions, notification preferences, consent decisions, and audit events generated when a healthcare provider requests or accesses approved data.",
    },
    {
      title: "How Information Is Used",
      body: "Your information is used to authenticate you, display consent requests, record approvals or denials, show access history, support account recovery, secure active sessions, and notify you about consent-related activity.",
    },
    {
      title: "Healthcare Data Access",
      body: "Hospitals only receive access after a consent request is approved. You can choose a fixed expiry period or access until revoked, and you can revoke active consent from the consent history screen.",
    },
    {
      title: "Security And Audit Logs",
      body: "Carebridge records consent and access activity so you can review when data was requested or accessed. Session controls let you view signed-in devices and sign out devices you no longer recognize.",
    },
    {
      title: "Your Choices",
      body: "You can deny requests, revoke active consent, manage notification preferences, change your password, sign out sessions, or delete your account from Settings. Some actions may be retained in audit logs where required for security and compliance.",
    },
  ];

  return (
    <div className="container-safe mx-auto max-w-2xl py-10">
      <div className="space-y-3 border-b border-tertiary pb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Carebridge Patient PWA
        </p>
        <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
        <p className="text-sm leading-6 text-gray-600">
          Last updated April 23, 2026. This product draft explains the data
          flows currently supported by Carebridge and should be reviewed by
          legal counsel before production use.
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
          <h2 className="text-lg font-semibold text-foreground">Questions</h2>
          <p className="text-sm leading-6 text-gray-700">
            For privacy requests or corrections, contact the Carebridge support
            team using the support channel provided by your healthcare
            organization.
          </p>
        </section>
      </div>
    </div>
  );
}
