import axios from 'axios';

const NOTIFICATION_URL = process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:4005';

// Fire-and-forget: posts an event to the notification service.
// Never throws — if the notification service is down the API response still succeeds.
export async function notifyUser(event: string, userId: string, data: object): Promise<void> {
  try {
    await axios.post(
      `${NOTIFICATION_URL}/emit`,
      { event, userId, data },
      {
        headers: {
          'x-user-id':    'mission-service',
          'x-user-role':  'service',
          'x-user-email': 'mission@internal',
        },
        timeout: 2000,
      }
    );
  } catch (err) {
    console.error(`[mission] notify failed (event=${event}, userId=${userId}):`, err);
  }
}
