// CareBridge: Test coverage for this module behavior.
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConsentRequestCard } from "@/components/ConsentRequestCard";
import { ConsentRequest } from "@/types/consent";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe("ConsentRequestCard", () => {
  const mockRequest: ConsentRequest = {
    id: "req-1",
    patientId: "patient-1",
    hospitalId: "hospital-1",
    hospital: {
      id: "hospital-1",
      name: "City Hospital",
      address: "123 Main St",
      phone: "555-0100",
    },
    scopes: [
      {
        id: "scope-1",
        name: "allergies",
        description: "Allergy information",
      },
      {
        id: "scope-2",
        name: "medications",
        description: "Current medications",
      },
    ],
    clinicalReason: "Emergency room consultation",
    requestedAt: new Date().toISOString(),
    status: "pending",
  };

  it("renders hospital name and request details", () => {
    const handleApprove = jest.fn();
    const handleDeny = jest.fn();

    render(
      <ConsentRequestCard
        request={mockRequest}
        onApprove={handleApprove}
        onDeny={handleDeny}
        isLoading={false}
      />,
    );

    expect(screen.getByText("City Hospital")).toBeInTheDocument();
    expect(screen.getByText(/Emergency room consultation/)).toBeInTheDocument();
  });

  it("displays scopes correctly", () => {
    const handleApprove = jest.fn();
    const handleDeny = jest.fn();

    render(
      <ConsentRequestCard
        request={mockRequest}
        onApprove={handleApprove}
        onDeny={handleDeny}
        isLoading={false}
      />,
    );

    // Scopes should be displayed as comma-separated list
    const scopesText = screen.getByText(/allergies.*medications/);
    expect(scopesText).toBeInTheDocument();
  });

  it("calls onApprove when Approve button is clicked", () => {
    const handleApprove = jest.fn();
    const handleDeny = jest.fn();

    render(
      <ConsentRequestCard
        request={mockRequest}
        onApprove={handleApprove}
        onDeny={handleDeny}
        isLoading={false}
      />,
    );

    const approveButton = screen.getByText("Approve");
    fireEvent.click(approveButton);

    expect(handleApprove).toHaveBeenCalledWith("req-1");
  });

  it("calls onDeny when Deny button is clicked", () => {
    const handleApprove = jest.fn();
    const handleDeny = jest.fn();

    render(
      <ConsentRequestCard
        request={mockRequest}
        onApprove={handleApprove}
        onDeny={handleDeny}
        isLoading={false}
      />,
    );

    const denyButton = screen.getByText("Deny");
    fireEvent.click(denyButton);

    expect(handleDeny).toHaveBeenCalledWith("req-1");
  });

  it("disables buttons when isLoading is true", () => {
    const handleApprove = jest.fn();
    const handleDeny = jest.fn();

    render(
      <ConsentRequestCard
        request={mockRequest}
        onApprove={handleApprove}
        onDeny={handleDeny}
        isLoading={true}
      />,
    );

    const approveButton = screen.getByText("Processing...");
    const denyButton = screen.getByRole("button", { name: "Deny" });

    expect(approveButton).toBeDisabled();
    expect(denyButton).toBeDisabled();
  });
});
