# RecoverHub Worker

BullMQ background worker for payment retries and dunning emails.

## Jobs

- **Retry payments:** Check for due retries every 6 hours
- **Send dunning emails:** Scheduled email sequences
- **Daily stats:** Aggregate recovery metrics
