import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { cn } from 'cn'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { useIsDesktop } from '@/lib/use-media-query'
import { art } from './art'

const slides = [
  { image: art.apeGreen.large, thumb: art.apeGreen.small, alt: 'Macaco com óculos e tons de esmeralda' },
  { image: art.gorillaPurple.large, thumb: art.gorillaPurple.small, alt: 'Gorila roxo em arte digital' },
  { image: art.orangutan.large, thumb: art.orangutan.small, alt: 'Orangotango dourado em arte digital' },
]

function SlideDots({ index, onSelect }: { index: number; onSelect: (index: number) => void }) {
  return (
    <div className="flex gap-2">
      {slides.map((_, i) => (
        <button
          key={i}
          type="button"
          aria-label={`Slide ${i + 1} de ${slides.length}`}
          aria-current={i === index}
          onClick={() => onSelect(i)}
          className="flex size-6 items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring"
        >
          <span className={cn('size-2 rounded-full', i === index ? 'bg-primary' : 'bg-primary/35')} />
        </button>
      ))}
    </div>
  )
}

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
        className="aspect-square w-full rounded-3xl object-cover"
      />
      <SlideDots index={index} onSelect={setIndex} />
    </div>
  )
}

const eyebrow = 'text-xs font-medium tracking-[0.1em] text-copy md:text-sm'

function DesktopHero() {
  return (
    <section aria-labelledby="hero-title" className="py-12">
      <Container className="grid items-center gap-8 md:grid-cols-[1fr_minmax(0,450px)]">
        <div className="grid justify-items-start gap-8">
          <div className="grid gap-1">
            <p className={eyebrow}>Bem-vindo à Kurio</p>
            <h1 id="hero-title" className="max-w-[560px] text-[43px] leading-[70px] font-bold">
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
        <HeroSlides />
      </Container>
    </section>
  )
}

/** Mobile card (366×190 in the layout): text on the left, artwork with a thumbnail of the next slide on the right. */
function MobileHero() {
  const [index, setIndex] = useState(0)
  const slide = slides[index]
  const next = slides[(index + 1) % slides.length]
  return (
    <section aria-labelledby="hero-title" className="py-4">
      <Container>
        <div className="relative overflow-hidden rounded-[20px] bg-raised p-3.5 pb-2">
          {/* Decorative circles of the layout. */}
          <div
            aria-hidden="true"
            className="absolute -top-16 left-1/3 size-64 rounded-full bg-gradient-to-b from-[#dd9a5f]/43 to-primary/5"
          />
          <div
            aria-hidden="true"
            className="absolute -right-10 -bottom-24 size-56 rounded-full bg-gradient-to-b from-[#dd9a5f]/30 to-primary/5"
          />
          <div role="group" aria-roledescription="carrossel" aria-label="Destaques" className="relative grid gap-1">
            <div className="grid grid-cols-[1fr_128px] gap-3">
              <div className="grid content-start gap-1">
                <p className="text-sm">Bem-vindo à Kurio</p>
                <h1 id="hero-title" className="text-lg leading-[29px] font-bold">
                  SEJA DONO DA CULTURA DIGITAL
                </h1>
                <p className="text-xs leading-[18px] text-copy">Descubra NFTs selecionados de criadores do mundo todo.</p>
                <Link to="/" hash="catalogo" className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-highlight">
                  EXPLORAR
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </div>
              <div className="relative">
                <img src={slide.image} alt={slide.alt} width={138} height={138} fetchPriority="high" className="aspect-square w-full rounded-2xl object-cover" />
                <img
                  src={next.thumb}
                  alt=""
                  width={56}
                  height={56}
                  className="absolute -right-1 -bottom-2 size-14 rounded-xl border-2 border-raised object-cover"
                />
              </div>
            </div>
            <div className="flex justify-center">
              <SlideDots index={index} onSelect={setIndex} />
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}

export function Hero() {
  return useIsDesktop() ? <DesktopHero /> : <MobileHero />
}
