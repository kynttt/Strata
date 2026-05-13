// NOTE: This project uses an in-memory queue (src/lib/queue.ts).
// Jobs are processed inside the queue itself with concurrency: 2.
// A separate worker process is not required.
//
// If you switch to BullMQ + Redis later, replace queue.ts with the BullMQ
// implementation and uncomment the worker code below.

console.log("[Worker] In-memory queue active — no separate worker needed.");
console.log("[Worker] Jobs are processed automatically when added to the queue.");
