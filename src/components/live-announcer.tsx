import { useState } from 'react'
import { X } from 'lucide-react'
import { useAnnouncement } from '@/realtime/announcements'

/**
 * Realtime changes that affect the user (e.g. a price change of a cart item).
 * The live region stays mounted even when empty: a region inserted together
 * with its text is not reliably announced by screen readers.
 */
export function LiveAnnouncer() {
  const announcement = useAnnouncement()
  const [dismissedId, setDismissedId] = useState<number | null>(null)
  const visible = announcement !== null && announcement.id !== dismissedId

  return (
    // Top of the screen, below the desktop header: at the bottom right it covered the
    // checkout's "Aceitar novo valor", which appears together with the notice.
    <div className="pointer-events-none fixed inset-x-4 top-4 z-50 flex justify-center md:inset-x-auto md:top-24 md:right-6">
      <div
        className={
          visible
            ? 'pointer-events-auto flex max-w-sm items-start gap-3 rounded-md border border-highlight bg-popover p-4 text-sm text-popover-foreground shadow-lg'
            : 'sr-only'
        }
      >
        <p role="status" aria-live="polite" aria-label="Atualizações em tempo real">
          {visible ? announcement.message : ''}
        </p>
        {visible && (
          <button type="button" aria-label="Fechar aviso" onClick={() => setDismissedId(announcement.id)}>
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>
    </div>
  )
}
