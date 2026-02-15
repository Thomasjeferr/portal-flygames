import Link from 'next/link';

export default function PoliticaPrivacidadePage() {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4 lg:px-12 bg-futvar-darker">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">Política de privacidade</h1>
        <p className="text-futvar-light text-sm mb-8">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
        <div className="space-y-6 text-futvar-light">
          <section>
            <h2 className="text-lg font-semibold text-white">1. Dados coletados</h2>
            <p>Coletamos informações necessárias para cadastro, pagamento e uso da plataforma.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">2. Uso dos dados</h2>
            <p>Os dados são utilizados para fornecer o serviço, processar pagamentos e melhorar a experiência.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">3. Seguranca</h2>
            <p>Utilizamos medidas para proteger seus dados contra acesso não autorizado.</p>
          </section>
        </div>
        <p className="mt-10 text-futvar-light text-sm">
          <Link href="/" className="text-futvar-green hover:underline">Voltar ao início</Link>
        </p>
      </div>
    </div>
  );
}
