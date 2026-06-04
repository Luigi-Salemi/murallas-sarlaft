---
name: gitlab-mr-activity-states
description: Activity-state model (Active, Idle, Dormant) for MR-monitoring agents that delegate polling to a status-poll worker. Defines polling cadence and state transitions.
---
# Activity States

The agent tracks MR activity to avoid wasting resources on stale MRs. The status-poll worker manages the polling schedule and reports state transitions. The agent operates in one of three states:

| State | Polling interval | Entry condition |
|---|---|---|
| **Active** | Every 1 hour (worker) | Default on initialization. Also entered when a new note is received while in Idle or Dormant state. |
| **Idle** | Every 3 hours (worker) | No activity for 12 hours. |
| **Dormant** | No polling | No activity for 168 hours. Agent posts a note explaining the MR appears inactive. |

State transitions are reported by the status-poll worker. Receiving a new note in any state resets to **Active** (handled in the comment-answering phase).
