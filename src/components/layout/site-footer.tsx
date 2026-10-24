import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Gem, Mail, Phone, ShieldCheck, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Container } from './container'
import { OutOfScopeLink } from './out-of-scope'

const linkClass = 'text-left text-sm leading-[30px] text-foreground hover:text-highlight'

const features = [
  { icon: ShieldCheck, title: 'Propriedade verificada', text: 'Cada NFT tem procedência registrada na rede e metadados imutáveis.' },
  { icon: Zap, title: 'Compra rápida', text: 'Conecte sua carteira e finalize em poucos cliques, com taxas claras.' },
  { icon: Gem, title: 'Edições selecionadas', text: 'Obras de criadores emergentes e consagrados, em edições limitadas.' },
]

const socials = [
  { label: 'Facebook', abbr: 'FB', href: 'https://www.facebook.com' },
  { label: 'Instagram', abbr: 'IG', href: 'https://www.instagram.com' },
  { label: 'X', abbr: 'X', href: 'https://x.com' },
  { label: 'LinkedIn', abbr: 'IN', href: 'https://www.linkedin.com' },
  { label: 'YouTube', abbr: 'YT', href: 'https://www.youtube.com' },
]

const collections = [
  ['Arte digital', 'digital-art'],
  ['Fotografia', 'photography'],
  ['Música', 'music'],
  ['Arte 3D', '3d-art'],
  ['Utilidade', 'utility'],
] as const

function Newsletter() {
  const [email, setEmail] = useState('')
  return (
    <form
      noValidate
      className="grid gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        // The newsletter is outside the scope of the challenge: validate, then be honest.
        if (!/^\S+@\S+\.\S+$/.test(email)) return void toast.error('Informe um e-mail válido.', { id: 'newsletter' })
        toast.info('A newsletter não está disponível na demonstração.', { id: 'newsletter' })
      }}
    >
      <label htmlFor="newsletter-email" className="text-lg font-bold">
        Antecipe-se ao próximo lançamento
      </label>
      <div className="flex shadow-card">
        <Input
          id="newsletter-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Seu melhor e-mail"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-10 rounded-r-none rounded-l-md border-0 bg-deep"
        />
        <Button type="submit" className="rounded-l-none">
          Enviar
        </Button>
      </div>
      <p className="text-[13px] leading-[22px] text-copy">Receba avisos de lançamentos e coleções. Sem spam.</p>
    </form>
  )
}

export function SiteFooter() {
  return (
    <footer className="mt-24 hidden md:block">
      <section className="bg-card py-8">
        <Container className="grid grid-cols-[1fr_1fr_1fr_1.3fr] gap-8">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="grid content-start justify-items-start gap-3 border-r border-primary/40 pr-6">
              <span className="flex size-[74px] items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Icon className="size-8" aria-hidden="true" />
              </span>
              <h2 className="text-[17px] font-bold">{title}</h2>
              <p className="text-sm leading-[22px] text-copy">{text}</p>
            </div>
          ))}
          <Newsletter />
        </Container>
      </section>

      <section className="bg-deep py-8">
        <Container className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
          <span className="text-sm font-bold tracking-[0.1em]">KURIO</span>
          <p className="text-sm text-copy">Feito para colecionadores, criadores e cultura</p>
          <a href="mailto:contato@email.com" className="flex items-center gap-2 text-sm hover:text-highlight">
            <Mail className="size-4" aria-hidden="true" /> contato@email.com
          </a>
          <a href="tel:+551140028922" className="flex items-center gap-2 text-sm hover:text-highlight">
            <Phone className="size-4" aria-hidden="true" /> +55 11 4002 8922
          </a>
        </Container>
      </section>

      <section className="bg-card py-8">
        <Container className="grid grid-cols-4 gap-8">
          <nav aria-label="Meu perfil" className="grid content-start">
            <h2 className="mb-2 text-lg font-bold">Meu perfil</h2>
            <Link to="/profile" className={linkClass}>
              Meu perfil
            </Link>
            {['Minha coleção', 'Atividade', 'Estúdio do criador'].map((label) => (
              <OutOfScopeLink key={label} className={linkClass}>
                {label}
              </OutOfScopeLink>
            ))}
            <Link to="/favorites" className={linkClass}>
              Lista de interesse
            </Link>
          </nav>
          <nav aria-label="Central de ajuda" className="grid content-start">
            <h2 className="mb-2 text-lg font-bold">Central de ajuda</h2>
            {['Central de ajuda', 'Como comprar NFTs', 'Carteira e segurança', 'Política do mercado', 'Denunciar item'].map(
              (label) => (
                <OutOfScopeLink key={label} className={linkClass}>
                  {label}
                </OutOfScopeLink>
              ),
            )}
          </nav>
          <nav aria-label="Coleções" className="grid content-start">
            <h2 className="mb-2 text-lg font-bold">Coleções</h2>
            {collections.map(([label, id]) => (
              <Link key={id} to="/" search={{ categories: [id] }} hash="catalogo" className={linkClass}>
                {label}
              </Link>
            ))}
          </nav>
          <div className="grid content-start gap-3">
            <h2 className="text-lg font-bold">Redes sociais</h2>
            <ul className="flex gap-2">
              {socials.map(({ label, abbr, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${label} (abre em nova aba)`}
                    className="flex size-[30px] items-center justify-center rounded-sm border border-primary text-[10px] font-bold text-highlight hover:bg-primary/10"
                  >
                    {abbr}
                  </a>
                </li>
              ))}
            </ul>
            <h3 className="text-sm font-bold">Carteiras compatíveis</h3>
            <p className="w-fit rounded-sm border border-primary px-2 py-1 text-[9px] font-bold tracking-[0.1px] text-highlight">
              METAMASK • WALLETCONNECT • COINBASE
            </p>
          </div>
        </Container>
        <p className="mt-6 text-center text-sm leading-[30px]">© 2026 Kurio. Propriedade digital para todos.</p>
      </section>
    </footer>
  )
}
