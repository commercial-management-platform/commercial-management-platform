import { Injectable } from '@nestjs/common';

import type { ActivityLogPort } from '../../application/ports/activity-log.port.js';

/**
 * HU-16 (activity_log) is not implemented yet. This adapter keeps the client
 * use cases wired to the port so they can be connected without changes later.
 */
@Injectable()
export class PendingActivityLogAdapter implements ActivityLogPort {
  async record(): Promise<void> {
    // Intentionally empty until the activity-log module exists.
  }
}
