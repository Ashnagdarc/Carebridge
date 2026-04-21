"use client";

import React from "react";
import { ConsentRequest } from "@/types/consent";
import { Button } from "./Button";
import { Card, CardBody } from "./Card";

interface ConsentRequestCardProps {
  request: ConsentRequest;
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
  isLoading?: boolean;
}

export function ConsentRequestCard({
  request,
  onApprove,
  onDeny,
  isLoading = false,
}: ConsentRequestCardProps) {
  const scopesText = request.scopes.map((scope) => scope.name).join(", ");

  return (
    <Card className="mb-4">
      <CardBody>
        <div className="mb-3">
          <h3 className="text-lg font-bold text-foreground">
            {request.hospital.name}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Requested on {new Date(request.requestedAt).toLocaleDateString()}
          </p>
        </div>

        <div className="mb-4 pb-4 border-b border-tertiary">
          <p className="text-sm font-semibold text-gray-700 mb-1">
            Requesting Access To:
          </p>
          <p className="text-sm text-foreground">{scopesText}</p>
        </div>

        <div className="mb-4">
          <p className="text-sm font-semibold text-gray-700 mb-1">
            Clinical Reason:
          </p>
          <p className="text-sm text-foreground">{request.clinicalReason}</p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => onApprove(request.id)}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? "Processing..." : "Approve"}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onDeny(request.id)}
            disabled={isLoading}
            className="flex-1"
          >
            Deny
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
