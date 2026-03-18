import Link from 'next/link';

export default function TermosPreEstreiaPage() {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4 lg:px-12 bg-futvar-darker">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">
          Termos e Condições – Pré-estreia Clubes
        </h1>
        <p className="text-futvar-light text-sm mb-8">
          Ao participar do programa Pré-estreia Clubes, o responsável pelo clube declara ter lido e concordado com as cláusulas abaixo.
        </p>

        <div className="space-y-6 text-futvar-light">
          <section>
            <h2 className="text-lg font-semibold text-white">1. Regras de tempo e manutenção da aeronave</h2>
            <p>
              Todo time participante da pré-estreia deve cumprir as regras de tempo e de manutenção da aeronave (drone) utilizada na gravação:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>
                <strong className="text-white">Primeiro tempo:</strong> 25 (vinte e cinco) minutos, com <strong className="text-white">troca de bateria obrigatória</strong> ao término.
              </li>
              <li>
                <strong className="text-white">Segundo tempo:</strong> 25 (vinte e cinco) minutos, com <strong className="text-white">troca de bateria obrigatória</strong> ao término.
              </li>
            </ul>
            <p className="mt-2">
              Os clubes declaram estar cientes dessas regras e comprometem-se a respeitá-las no dia do evento.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">2. Pagamento</h2>
            <p>
              Todo evento de pré-estreia deve estar <strong className="text-white">quitado até 4 (quatro) dias antes</strong> da data em que o evento ocorrer. Caso o pagamento não seja confirmado dentro desse prazo, a Fly Games poderá cancelar ou adiar o evento, aplicando-se as regras de cancelamento abaixo quando cabível.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">3. Cancelamento pela Fly Games (gravação)</h2>
            <p>
              Em caso de <strong className="text-white">cancelamento da gravação por parte da Fly Games</strong> (incluindo, mas não se limitando a, condições climáticas desfavoráveis, como chuva), o clube terá direito a:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong className="text-white">reembolso integral</strong> do valor pago pelo slot, ou</li>
              <li><strong className="text-white">reagendamento</strong> para nova data, a ser definida em comum acordo com o responsável pelo time.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">4. Cancelamento pelo clube</h2>

            <p className="mb-3 font-medium text-white">4.1. Até 3 (três) dias antes do evento</p>
            <p className="mb-4">
              O clube pode cancelar e terá direito a <strong className="text-white">reembolso integral</strong> do valor pago ou a <strong className="text-white">remarcação</strong> para outra data, conforme negociado com a Fly Games.
            </p>

            <p className="mb-3 font-medium text-white">4.2. Menos de 24 (vinte e quatro) horas antes do início, sem motivo de força maior</p>
            <p className="mb-4">
              Se o cancelamento for feito pelo clube a <strong className="text-white">menos de 24 (vinte e quatro) horas</strong> do início do evento, <strong className="text-white">sem motivo de força maior</strong> (como condições climáticas, chuva ou situações análogas), <strong className="text-white">não haverá devolução</strong> do valor pago.
            </p>

            <p className="mb-3 font-medium text-white">4.3. Sem aviso prévio</p>
            <p className="mb-4">
              Em caso de <strong className="text-white">cancelamento sem aviso</strong> pelo clube (ausência no dia do evento sem comunicação prévia), <strong className="text-white">não haverá devolução</strong> do valor pago.
            </p>

            <p className="mb-3 font-medium text-white">4.4. Aviso com até 2 (dois) dias antes do evento</p>
            <p className="mb-4">
              Se o clube comunicar o cancelamento com até 2 (dois) dias antes da data do evento: será devolvida <strong className="text-white">metade do valor</strong> pago. Se a Fly Games conseguir <strong className="text-white">encaixar outro evento</strong> no mesmo horário/data, poderá optar por devolver o valor integral ou negociar nova data com o responsável pelo time.
            </p>

            <p className="mb-3 font-medium text-white">4.5. Aviso após 48 (quarenta e oito) horas antes do evento</p>
            <p>
              Se o aviso de cancelamento for dado <strong className="text-white">após as 48 (quarenta e oito) horas</strong> que antecedem o evento, as partes <strong className="text-white">entrarão em negociação</strong> para definir a melhor forma de tratamento (reembolso parcial, remarcação ou outras condições), de boa-fé.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">5. Aceitação</h2>
            <p>
              Ao concluir o pagamento do slot da pré-estreia e marcar que leu e aceitou os termos, o responsável pelo clube declara, em nome do clube, ter lido, compreendido e concordado com todas as cláusulas acima, incluindo as regras de tempo e troca de bateria da aeronave e as condições de cancelamento e pagamento.
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
