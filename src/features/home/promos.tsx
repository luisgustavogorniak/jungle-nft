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
    text: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura da internet.',
    image: art.apeGreen.small,
    search: { categories: ['digital-art' as const] },
  },
]

export function Promos() {
  return (
    <section aria-label="Promoções" className="hidden py-12 md:block">
      <Container className="grid grid-cols-2 gap-6">
        {promos.map((promo) => (
          <article key={promo.title} className="grid min-h-[250px] grid-cols-[200px_1fr] items-center gap-6 bg-card p-6">
            <img src={promo.image} alt="" width={200} height={200} loading="lazy" className="aspect-square w-full rounded-[15px] object-cover" />
            <div className="grid justify-items-end gap-3 text-right">
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
