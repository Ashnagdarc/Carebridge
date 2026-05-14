"use client";
// CareBridge: Patient PWA route/layout implementation.

import { HoverExpand } from "@/components/unlumen-ui/hover-expand";

const items = [
  {
    label: "Kyoto",
    sublabel: "Japan",
    description: "Ancient temples hidden among bamboo groves",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&h=600&fit=crop",
  },
];

export default function HoverExpandPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">HoverExpand Demo</h1>
      <HoverExpand items={items} />
    </div>
  );
}