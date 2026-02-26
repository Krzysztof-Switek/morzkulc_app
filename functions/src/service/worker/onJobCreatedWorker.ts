import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { processJobDoc } from "./jobProcessor";

export const onServiceJobCreated = onDocumentWritten(
  { document: "service_jobs/{jobId}" },
  async (event) => {
    const jobId = event.params.jobId as string;

    // Ignore deletes
    if (!event.data?.after?.exists) return;

    const ref = event.data.after.ref;
    if (!ref) return;

    const lockOwner = `event:${process.env.K_REVISION || "local"}:${jobId}`;
    console.log("service job written -> process", { jobId });

    await processJobDoc(ref, lockOwner);
  }
);
