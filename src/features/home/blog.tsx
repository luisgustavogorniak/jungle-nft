import { ArrowRight } from 'lucide-react'
import { Container } from '@/components/layout/container'
import { OutOfScopeLink } from '@/components/layout/out-of-scope'
import { art } from './art'

const posts = [
  { date: '12 de setembro', read: 6, title: 'Como funciona a propriedade de NFTs', text: 'Aprenda a colecionar, negociar e verificar ativos digitais.', image: art.apeGreen.small },
  { date: '13 de setembro', read: 2, title: '10 artistas digitais para acompanhar', text: 'Conheça criadores que moldam a cultura digital.', image: art.gorillaPurple.small },
  { date: '15 de setembro', read: 3, title: 'Raridade, atributos e procedência', text: 'Entenda raridade, procedência, direitos autorais e utilidade.', image: art.gorillaDark.small },
  { date: '15 de setembro', read: 2, title: 'Como proteger sua carteira', text: 'Proteja sua carteira, seus ativos e sua identidade.', image: art.orangutan.small },
]

export function Blog() {
  return (
    <section aria-labelledby="blog-title" className="hidden py-12 md:block">
      <Container className="grid gap-8">
        <div className="grid gap-2 text-center">
          <h2 id="blog-title" className="text-[28px] font-bold">
            Diário da Cunhagem
          </h2>
          <p className="text-sm text-copy">Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.</p>
        </div>
        <ul className="grid grid-cols-2 gap-6 xl:grid-cols-4">
          {posts.map((post) => (
            <li key={post.title}>
              <article className="grid h-full overflow-hidden rounded-lg bg-card">
                <img src={post.image} alt="" width={268} height={195} loading="lazy" className="h-[195px] w-full object-cover" />
                <div className="grid content-start gap-2 p-4 pt-3">
                  <p className="text-xs font-medium text-copy">
                    {post.date} | Leitura de {post.read} min
                  </p>
                  <h3 className="font-bold">{post.title}</h3>
                  <p className="text-xs leading-5 text-copy">{post.text}</p>
                  <OutOfScopeLink className="flex w-fit items-center gap-1 text-xs font-bold text-highlight hover:underline">
                    Ler mais <ArrowRight className="size-3" aria-hidden="true" />
                  </OutOfScopeLink>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
