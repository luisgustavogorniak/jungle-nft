import { useNavigate, useRouterState } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { useSession } from '@/features/auth/session'
import { useIsFavorite, useToggleFavorite } from './queries'

type Props = {
  nftId: string
  name: string
  /** card: 28px on mobile tiles · floating: 35px over the detail artwork · text: "Favoritar" button. */
  variant: 'card' | 'floating' | 'text'
  className?: string
}

export function FavoriteButton({ nftId, name, variant, className }: Props) {
  const { isAuthenticated } = useSession()
  const favorite = useIsFavorite(nftId)
  const toggle = useToggleFavorite()
  const navigate = useNavigate()
  const href = useRouterState({ select: (state) => state.location.href })

  const onClick = () => {
    // Favorites need a session: send the visitor to login and bring them back here.
    if (!isAuthenticated) {
      void navigate({ to: '/login', search: { redirect: href, reason: undefined } })
      return
    }
    toggle.mutate({ nftId, favorite: !favorite })
  }

  const icon = <Heart aria-hidden="true" className={cn(favorite && 'fill-current')} />

  if (variant === 'text') {
    return (
      <Button type="button" variant="outline" aria-pressed={favorite} onClick={onClick} className={cn('gap-2', className)}>
        <Heart aria-hidden="true" className={cn('size-4', favorite && 'fill-current')} />
        Favoritar
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="circle"
      aria-pressed={favorite}
      aria-label={`Favoritar ${name}`}
      onClick={onClick}
      className={cn(variant === 'card' ? 'size-7! px-0! [&_svg]:size-4' : 'size-[35px]! px-0! [&_svg]:size-5', favorite && 'text-highlight', className)}
    >
      {icon}
    </Button>
  )
}
