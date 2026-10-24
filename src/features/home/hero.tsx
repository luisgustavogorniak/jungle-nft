import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { cn } from 'cn'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { art } from './art'

const slides = [
  { image: art.gorillaPurple.large, alt: 'Gorila roxo em arte digital' },
  { image: art.apeGreen.large, alt: 'Macaco com óculos e tons de esmeralda' },
  { image: art.orangutan.large, alt: 'Orangotango dourado em arte digital' },
]

/** Three slides, no autoplay: the user decides when the artwork changes. */
function HeroSlides({ className }: { className?: string }) {
  const [index, setIndex] = useState(0)
  const slide = slides[index]
  return (
    <div role="group" aria-roledescription="carrossel" aria-label="Destaques" className={cn('grid justify-items-center gap-4', className)}>
      <img
        src={slide.image}
        alt={slide.alt}
        width={450}
        height={450}
        fetchPriority="high"
        className="aspect-square w-full rounded-2xl object-cover"
      />
      <div className="flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Slide ${i + 1} de ${slides.length}`}
            aria-current={i === index}
            onClick={() => setIndex(i)}
            className="flex size-6 items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring"
          >
            <span className={cn('size-2 rounded-full', i === index ? 'bg-primary' : 'bg-primary/35')} />
          </button>
        ))}
      </div>
    </div>
  )
}

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="py-6 md:py-12">
      <Container className="grid items-center gap-8 md:grid-cols-[1fr_minmax(0,450px)]">
        <div className="grid justify-items-start gap-8 max-md:order-2">
          <div className="grid gap-1">
            <p className="text-sm font-medium tracking-[0.1em] text-copy">Bem-vindo à Kurio</p>
            <h1 id="hero-title" className="text-[28px] leading-tight font-bold md:text-[43px] md:leading-[70px]">
              SEJA DONO DO FUTURO DA ARTE DIGITAL
            </h1>
          </div>
          <p className="max-w-xl text-sm leading-6 text-copy">
            Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e
            tenha uma parte da cultura da internet.
          </p>
          <Button asChild className="h-10 w-[140px] gap-2">
            <Link to="/" hash="catalogo">
              EXPLORAR
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <HeroSlides className="max-md:order-1" />
      </Container>
    </section>
  )
}
