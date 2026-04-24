-- Add consentRequestId linkage so we can resume a pending DataRequest
ALTER TABLE "DataRequest"
  ADD COLUMN "consentRequestId" TEXT;

CREATE INDEX "DataRequest_consentRequestId_idx" ON "DataRequest"("consentRequestId");

ALTER TABLE "DataRequest"
  ADD CONSTRAINT "DataRequest_consentRequestId_fkey"
  FOREIGN KEY ("consentRequestId") REFERENCES "ConsentRequest"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

