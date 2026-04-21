"use client";

import { Header, Button, Card, CardBody } from "@/components";
import { HeartIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

export default function Home() {
  return (
    <div className="pb-24">
      <Header
        title="CareBridge Patient"
        subtitle="Secure healthcare data sharing"
      />

      <main className="container-safe max-w-2xl mx-auto py-6">
        {/* Hero Section */}
        <section className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-6 bg-secondary rounded-2xl flex items-center justify-center">
            <HeartIcon className="w-12 h-12 text-foreground" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Welcome to CareBridge</h1>
          <p className="text-gray-600 text-lg">
            Take control of your healthcare data and share it securely with
            hospitals and healthcare providers.
          </p>
        </section>

        {/* Features Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Key Features</h2>
          <div className="space-y-3">
            <Card>
              <CardBody>
                <div className="flex items-start gap-4">
                  <CheckCircleIcon className="w-6 h-6 text-success flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-foreground">
                      Secure Sharing
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Your medical records are encrypted and shared only with
                      your consent.
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className="flex items-start gap-4">
                  <CheckCircleIcon className="w-6 h-6 text-success flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-foreground">
                      Full Control
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Approve or deny data requests from healthcare providers in
                      real-time.
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className="flex items-start gap-4">
                  <CheckCircleIcon className="w-6 h-6 text-success flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-foreground">
                      Always Available
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Access your data anytime with offline support through our
                      PWA.
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </section>

        {/* CTA Buttons */}
        <section className="space-y-3">
          <Button variant="primary" size="lg" fullWidth>
            Get Started
          </Button>
          <Button variant="secondary" size="lg" fullWidth>
            Learn More
          </Button>
        </section>

        {/* Footer Info */}
        <section className="mt-12 pt-6 border-t border-tertiary text-center text-sm text-gray-600">
          <p>
            CareBridge is your secure healthcare data management platform.{" "}
            <a href="/privacy" className="text-info hover:underline">
              Privacy Policy
            </a>
          </p>
        </section>
      </main>
    </div>
  );
}
