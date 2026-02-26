import Link from 'next/link';

const CADASTRAR_LINK = '/times/cadastrar';

export const metadata = {
  title: 'Para times | Portal Futvar',
  description: 'Cadastre seu time no Portal Futvar e receba apoio de torcedores e patrocinadores.',
};

export default function ParaTimesPage() {
  return (
    <div className="min-h-screen bg-futvar-darker pt-24 pb-16 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">Para times</h1>
        <p className="text-futvar-light mb-6">
          Seu time ainda não está no Portal Futvar? O responsável pelo time (direção, comissão ou gestor) pode cadastrar o clube aqui. 
          Depois do cadastro e da aprovação, torcedores poderão escolher seu time como &quot;time do coração&quot; e parte do valor das assinaturas e patrocínios pode ser repassada ao time.
        </p>

        <div className="rounded-2xl border border-futvar-green/30 bg-futvar-dark p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-2">Cadastrar meu time</h2>
          <p className="text-futvar-light text-sm mb-4">
            Você é responsável por um time? Faça login (ou crie uma conta), verifique seu e-mail e acesse o formulário de cadastro.
          </p>
          <Link
            href={CADASTRAR_LINK}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-futvar-green text-futvar-darker font-semibold hover:bg-futvar-green-light transition-colors"
          >
            Ir para cadastro do time
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <p className="text-futvar-light text-sm">
          Torcedor e não encontrou seu time na lista? Compartilhe esta página com o responsável pelo seu time para que ele possa cadastrar o clube.
        </p>
        <Link href="/planos" className="text-futvar-green hover:underline text-sm mt-2 inline-block">
          ← Voltar aos planos
        </Link>
      </div>
    </div>
  );
}
