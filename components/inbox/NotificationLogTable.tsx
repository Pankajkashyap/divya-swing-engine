'use client'

import { NotificationLog } from '@/app/inbox/page'

type Props = {
  notifications: NotificationLog[]
}

export function NotificationLogTable({ notifications }: Props) {
  if (notifications.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
        No notifications sent yet.
      </div>
    )
  }

  return (
    <div className="ui-table-wrap">
      <table className="ui-table">
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Trigger type</th>
            <th>Trigger state</th>
            <th>Sent at</th>
            <th>Resolved at</th>
          </tr>
        </thead>
        <tbody>
          {notifications.map((notification) => (
            <tr key={notification.id}>
              <td>{notification.ticker ?? '—'}</td>
              <td>{notification.trigger_type}</td>
              <td>{notification.trigger_state}</td>
              <td>{new Date(notification.sent_at).toLocaleString()}</td>
              <td>
                {notification.resolved_at
                  ? new Date(notification.resolved_at).toLocaleString()
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}