import Link from 'next/link';

export default function PoliticaPrivacidadePage() {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4 lg:px-12 bg-futvar-darker">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">Política de Privacidade</h1>
        <p className="text-futvar-light text-sm mb-8">
          Última atualização: {new Date().toLocaleDateString('pt-BR')}
        </p>

        <div className="space-y-6 text-futvar-light">
          <section>
            <h2 className="text-lg font-semibold text-white">1. Introdução</h2>
            <p>
              Esta Política de Privacidade explica como a Fly Games coleta, utiliza, armazena e protege os dados
              pessoais dos usuários da plataforma, em conformidade com a legislação brasileira aplicável, em
              especial a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">2. Dados Pessoais Coletados</h2>
            <p>Podemos coletar as seguintes categorias de dados pessoais:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>dados de cadastro: nome, e-mail, senha (armazenada de forma criptografada);</li>
              <li>
                dados de navegação: páginas acessadas, data e hora de acesso, endereço IP, tipo de dispositivo e
                navegador;
              </li>
              <li>
                dados de pagamento: informações de transações (valor, plano/jogo adquirido, status de pagamento). Os
                dados completos de cartão são processados por provedores externos (como Stripe), não sendo
                armazenados integralmente pela Fly Games;
              </li>
              <li>
                dados relacionados a clubes, times ou patrocínios, quando você atua como responsável ou patrocinador.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">3. Finalidades do Tratamento</h2>
            <p>Utilizamos seus dados pessoais para as seguintes finalidades principais:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>criar e gerenciar sua conta na plataforma;</li>
              <li>processar pagamentos, assinaturas e compras avulsas;</li>
              <li>liberar acesso a jogos, lives e demais conteúdos contratados;</li>
              <li>enviar comunicações transacionais (confirmação de cadastro, reset de senha, recibos, etc.);</li>
              <li>cumprir obrigações legais e regulatórias;</li>
              <li>melhorar a experiência de uso, segurança e desempenho da plataforma;</li>
              <li>
                realizar análises estatísticas e de uso (analytics), sempre de forma agregada e sem identificação
                individual na apresentação de relatórios.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">4. Compartilhamento de Dados</h2>
            <p>
              Podemos compartilhar seus dados pessoais com terceiros estritamente necessários à prestação dos
              serviços, tais como:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>provedores de pagamento (por exemplo, Stripe, Woovi);</li>
              <li>provedores de infraestrutura de hospedagem e banco de dados;</li>
              <li>serviços de envio de e-mail transacional;</li>
              <li>
                parceiros de marketing e analytics, sempre em conformidade com a legislação de proteção de dados.
              </li>
            </ul>
            <p className="mt-2">
              Não vendemos seus dados pessoais. Qualquer compartilhamento é feito com base em contratos que
              estabelecem obrigações de confidencialidade e segurança das informações.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">5. Cookies e Tecnologias de Rastreamento</h2>
            <p>
              Utilizamos cookies e tecnologias semelhantes para lembrar suas preferências, manter sua sessão ativa e
              entender como a plataforma é utilizada. Você pode gerenciar cookies diretamente nas configurações do
              seu navegador. Alguns cookies são essenciais para o funcionamento da plataforma e não podem ser
              desabilitados sem impactar a experiência de uso.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">6. Segurança da Informação</h2>
            <p>
              Adotamos medidas técnicas e organizacionais para proteger seus dados pessoais contra acessos não
              autorizados, perda, uso indevido ou divulgação indevida. Ainda assim, nenhum sistema é totalmente
              imune a riscos, e não é possível garantir segurança absoluta das informações transmitidas pela internet.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">7. Retenção de Dados</h2>
            <p>
              Os dados pessoais são mantidos pelo tempo necessário para cumprir as finalidades descritas nesta
              Política ou para cumprimento de obrigações legais e regulatórias. Após esse período, poderão ser
              anonimizados ou excluídos, observadas eventuais necessidades de guarda previstas em lei.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">8. Direitos do Titular de Dados</h2>
            <p>Nos termos da LGPD, você possui, entre outros, os seguintes direitos:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>confirmar a existência de tratamento de dados pessoais;</li>
              <li>acessar os dados pessoais que mantemos sobre você;</li>
              <li>corrigir dados incompletos, inexatos ou desatualizados;</li>
              <li>solicitar a anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos;</li>
              <li>solicitar a portabilidade de dados, quando aplicável;</li>
              <li>revogar o consentimento, quando o tratamento se basear nessa hipótese.</li>
            </ul>
            <p className="mt-2">
              Para exercer seus direitos, entre em contato pelos canais informados abaixo.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">9. Contato</h2>
            <p>
              Em caso de dúvidas sobre esta Política de Privacidade ou para exercer seus direitos como titular de
              dados, envie uma mensagem para{' '}
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
