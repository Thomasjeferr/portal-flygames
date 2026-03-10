import Link from 'next/link';
import { ParaTimesCadastroCTA } from '@/components/para-times/ParaTimesCadastroCTA';

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

        <ParaTimesCadastroCTA />

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
