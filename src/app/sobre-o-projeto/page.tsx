import { redirect } from 'next/navigation';

/**
 * Rota para validação (estrutura do site: Home, Sobre o projeto, Política de privacidade, Contato).
 * Redireciona para a página "Sobre nós", que contém o conteúdo do projeto.
 */
export default function SobreOProjetoPage() {
  redirect('/sobre-nos');
}
