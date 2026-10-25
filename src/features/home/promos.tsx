import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { art } from './art'

const promos = [
  {
    title: 'Lançamentos gênesis de edição limitada',
    text: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    image: art.gorillaDark.small,
    search: { tab: 'new' as const },
  },
  {
    title: 'Arte digital selecionada e muito mais',
    text: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
    image: art.apeGreen.small,
    search: { categories: ['digital-art' as const] },
  },
]

export function Promos() {
  return (
    <section aria-label="Promoções" className="hidden py-12 md:block">
      <Container className="grid grid-cols-2 gap-7">
        {promos.map((promo) => (
          <article key={promo.title} className="grid min-h-[250px] grid-cols-[287px_1fr] overflow-hidden rounded-lg bg-card">
            {/* Artwork bleeds to the card edges; the text block is right-aligned, as in the frame. */}
            <img src={promo.image} alt="" width={287} height={250} loading="lazy" className="size-full object-cover" />
            <div className="grid content-center justify-items-end gap-3 py-6 pr-7 pl-4 text-right">
              <h2 className="text-lg font-bold">{promo.title}</h2>
              <p className="line-clamp-3 text-sm leading-6 text-copy">{promo.text}</p>
              <Button asChild size="sm" className="gap-2">
                <Link to="/" search={promo.search} hash="catalogo">
                  Explorar
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </article>
        ))}
      </Container>
    </section>
  )
}
