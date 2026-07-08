export async function runSettledWorkerSlot({ key, worker, onError = console.error }) {
  try {
    return { key, ...(await worker.runOnce()) };
  } catch (error) {
    onError?.(error);
    return { key, ran: false, error };
  }
}
