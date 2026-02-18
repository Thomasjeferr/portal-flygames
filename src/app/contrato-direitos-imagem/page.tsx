import Link from 'next/link';
import { CONTRACT_VERSION } from '@/lib/pre-sale/enums';

export default function ContratoDireitosImagemPage() {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4 lg:px-12 bg-futvar-darker">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">
          Contrato de Cessão de Direitos de Imagem – Pré-estreia Clubes
        </h1>
        <p className="text-futvar-light text-sm mb-8">Versão {CONTRACT_VERSION}</p>

        <div className="space-y-6 text-futvar-light">
          <section>
            <h2 className="text-lg font-semibold text-white">1. Objeto</h2>
            <p>
              O presente contrato tem por objeto a autorização, pelo clube participante, para captação, gravação,
              edição, armazenamento, reprodução e transmissão das imagens referentes às partidas e eventos
              vinculados ao programa Pré-estreia Clubes da plataforma Fly Games, incluindo jogadores, comissão
              técnica, torcedores e demais elementos do ambiente do jogo.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">2. Aceitação</h2>
            <p>
              Ao clicar em &quot;Li e aceito&quot; no fluxo de contratação da pré-estreia, o responsável pelo clube
              declara, em nome do clube que representa, ter lido, compreendido e concordado com todos os termos
              deste contrato, autorizando o uso de imagem na forma aqui prevista.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">3. Alcance da Autorização</h2>
            <p>A autorização concedida compreende, a título gratuito ou oneroso conforme acordado entre as partes:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>
                captação das imagens das partidas por meio de drones, câmeras em campo e outros equipamentos
                audiovisuais;
              </li>
              <li>
                transmissão ao vivo ou sob demanda das partidas e replays na plataforma Fly Games e canais digitais
                oficiais;
              </li>
              <li>
                utilização de trechos dos jogos em materiais promocionais, chamadas, campanhas institucionais e
                conteúdos de divulgação relacionados ao projeto;
              </li>
              <li>
                armazenamento das gravações em ambiente seguro para fins de disponibilização aos usuários,
                reexibição, auditoria ou cumprimento de obrigações legais.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">4. Responsabilidade do Clube</h2>
            <p>
              O clube declara ser responsável por informar e obter, quando necessário, as autorizações individuais de
              atletas, comissão técnica e demais participantes cujos direitos de imagem possam ser afetados, isentando
              a Fly Games de reclamações decorrentes da ausência de tais autorizações perante terceiros.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">5. Prazo e Revogação</h2>
            <p>
              A autorização concedida é válida por prazo indeterminado, limitada ao contexto do projeto Pré-estreia
              Clubes e às partidas contratadas. A eventual revogação da autorização por parte do clube não terá
              efeitos retroativos sobre transmissões, replays, conteúdos promocionais ou materiais já produzidos e
              divulgados até a data da solicitação.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">6. Disposições Gerais</h2>
            <p>
              Este contrato não estabelece vínculo empregatício ou societário entre as partes, limitando-se à cessão
              de direitos de imagem nos termos aqui descritos. Eventuais dúvidas ou casos omissos serão tratados de
              boa-fé, observando-se a legislação brasileira aplicável.
            </p>
          </section>
        </div>

        <p className="mt-10 text-futvar-light text-sm">
          <Link href="/" className="text-futvar-green hover:underline">
            Voltar ao início
          </Link>
        </p>
      </div>
    </div>
  );
}
