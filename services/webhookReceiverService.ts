/**
 * Webhook Receiver Service
 * Polls backend for notifications from StorySwarm
 */

export interface PromptsReadyNotification {
  sessionTimestamp: number;
  storyUuid: string;
  episodeNumber: number;
  totalPrompts: number;
  receivedAt: Date;
}

let pollingInterval: NodeJS.Timeout | null = null;
let notificationCallback: ((notification: PromptsReadyNotification) => void) | null = null;

/**
 * Start polling for prompts-ready notifications
 * Backend stores notifications in Redis, we poll for them
 */
export function startNotificationPolling(
  onPromptsReady: (notification: PromptsReadyNotification) => void
): void {
  console.log('[Webhook Receiver] Starting notification polling...');

  notificationCallback = onPromptsReady;

  // Poll every 5 seconds
  pollingInterval = setInterval(async () => {
    await checkForNotifications();
  }, 5000);

  // Initial check
  checkForNotifications();
}

/**
 * Stop polling for notifications
 */
export function stopNotificationPolling(): void {
  console.log('[Webhook Receiver] Stopping notification polling');

  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }

  notificationCallback = null;
}

/**
 * Check backend for pending notifications
 */
async function checkForNotifications(): Promise<void> {
  try {
    const response = await fetch('http://localhost:8000/api/v1/notifications/check', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return; // Silently fail, backend might not be ready
    }

    const result = await response.json();

    if (result.notifications && result.notifications.length > 0) {
      // Process each notification
      for (const notification of result.notifications) {
        if (notification.type === 'prompts_ready' && notificationCallback) {
          console.log('[Webhook Receiver] Received prompts-ready notification:', notification);
          notificationCallback({
            sessionTimestamp: notification.sessionTimestamp,
            storyUuid: notification.storyUuid,
            episodeNumber: notification.episodeNumber,
            totalPrompts: notification.totalPrompts,
            receivedAt: new Date(notification.timestamp),
          });

          // Acknowledge notification so it's not processed again
          await acknowledgeNotification(notification.id);
        }
      }
    }
  } catch (error) {
    // Silently fail - polling will retry
  }
}

/**
 * Acknowledge notification to prevent reprocessing
 */
async function acknowledgeNotification(notificationId: string): Promise<void> {
  try {
    await fetch(`http://localhost:8000/api/v1/notifications/${notificationId}/ack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.warn('[Webhook Receiver] Failed to acknowledge notification:', error);
  }
}

/**
 * Manual check for prompts ready (for immediate polling after beats saved)
 */
export async function checkIfPromptsReady(sessionTimestamp: number): Promise<boolean> {
  try {
    const response = await fetch(
      `http://localhost:8000/api/v1/session/${sessionTimestamp}/prompts-status`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      return false;
    }

    const result = await response.json();
    return result.promptsReady === true;
  } catch (error) {
    return false;
  }
}
