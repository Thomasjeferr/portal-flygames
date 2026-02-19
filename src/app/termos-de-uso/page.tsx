import Link from 'next/link';

export default function TermosDeUsoPage() {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4 lg:px-12 bg-futvar-darker">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">Termos de Uso da Plataforma Fly Games</h1>
        <p className="text-futvar-light text-sm mb-8">
          Última atualização: {new Date().toLocaleDateString('pt-BR')}
        </p>
        <div className="space-y-6 text-futvar-light">
          <section>
            <h2 className="text-lg font-semibold text-white">1. Aceitação dos Termos</h2>
            <p>
              Ao utilizar a plataforma Fly Games (site, aplicativos e demais canais oficiais), você declara que leu,
              entendeu e concorda integralmente com estes Termos de Uso e com a nossa Política de Privacidade. Caso
              não concorde com qualquer condição aqui descrita, você não deve utilizar a plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">2. Serviços Oferecidos</h2>
            <p>
              A Fly Games oferece, dentre outros serviços, a transmissão e o replay de jogos de futebol de várzea,
              incluindo filmagens com drones e câmeras em campo, planos de assinatura e compras avulsas de conteúdos
              digitais. A disponibilidade de funcionalidades, planos e conteúdos pode variar ao longo do tempo, a
              critério exclusivo da Fly Games.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">3. Cadastro, Conta e Responsabilidades</h2>
            <p>
              Para acessar determinadas áreas e funcionalidades, é necessário criar uma conta, fornecendo informações
              verdadeiras, completas e atualizadas. Você é responsável por:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>manter a confidencialidade de seu login e senha;</li>
              <li>todas as ações realizadas a partir de sua conta, ainda que por terceiros;</li>
              <li>notificar a Fly Games em caso de uso não autorizado ou suspeita de violação de segurança.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">4. Planos, Pagamentos e Renovação</h2>
            <p>
              As condições de cada plano ou compra avulsa (preço, período de acesso, forma de renovação e benefícios)
              são apresentadas de forma clara na própria plataforma, antes da confirmação do pagamento. Ao concluir a
              compra, você autoriza a cobrança pelo meio de pagamento selecionado.
            </p>
            <p className="mt-2">
              Nos planos recorrentes, a renovação automática será realizada até que você cancele o plano, seguindo as
              instruções disponíveis na área &quot;Minha conta&quot; ou pelos canais de suporte. Compras avulsas não
              são renovadas automaticamente.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">5. Uso Adequado e Proibições</h2>
            <p>O usuário compromete-se a utilizar a plataforma de forma legal, ética e em conformidade com estes Termos, sendo vedado:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>compartilhar credenciais de acesso com terceiros não autorizados;</li>
              <li>copiar, gravar, retransmitir ou distribuir conteúdos da plataforma sem autorização;</li>
              <li>tentar burlar mecanismos de segurança ou controle de acesso;</li>
              <li>utilizar a plataforma para fins ilícitos, ofensivos, discriminatórios ou que violem direitos de terceiros.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">6. Propriedade Intelectual</h2>
            <p>
              Todos os conteúdos disponibilizados na plataforma (incluindo vídeos, imagens, marcas, logotipos, textos
              e layouts) são protegidos por direitos autorais e demais normas de propriedade intelectual, sendo de
              titularidade da Fly Games ou de terceiros parceiros.
            </p>
            <p className="mt-2">
              É proibida qualquer utilização dos conteúdos além das hipóteses expressamente autorizadas, especialmente
              a reprodução, distribuição, exibição pública ou criação de obras derivadas sem autorização prévia e
              por escrito.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">7. Limitação de Responsabilidade</h2>
            <p>
              A Fly Games emprega esforços razoáveis para manter a plataforma disponível e segura, mas não garante
              funcionamento ininterrupto ou livre de falhas. Podem ocorrer indisponibilidades temporárias por motivos
              técnicos, manutenção ou fatores externos.
            </p>
            <p className="mt-2">
              Na máxima extensão permitida pela legislação aplicável, a Fly Games não se responsabiliza por danos
              indiretos, lucros cessantes ou quaisquer prejuízos decorrentes do uso ou da impossibilidade de uso da
              plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">8. Alterações destes Termos</h2>
            <p>
              Estes Termos de Uso podem ser alterados a qualquer momento, para refletir melhorias na plataforma,
              alterações de serviços ou exigências legais. Sempre que houver mudanças relevantes, poderemos comunicar
              pelos canais disponíveis. O uso continuado da plataforma após a publicação das novas versões implica
              aceitação das alterações.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">9. Contato</h2>
            <p>
              Em caso de dúvidas sobre estes Termos de Uso, você pode entrar em contato pelos canais indicados na
              página de Suporte ou pelo e-mail{' '}
              <a href="mailto:contato@flygames.app" className="text-futvar-green hover:underline">
                contato@flygames.app
              </a>
              .
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
