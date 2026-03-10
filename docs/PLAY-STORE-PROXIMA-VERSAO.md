# Play Store – ajustes para a próxima versão

Itens anotados para tratar no próximo release do app (após a primeira versão em teste interno).

---

## 1. Arquivo de desofuscação (mapping)

**Aviso na Play Console:** *"Não há um arquivo de desofuscação associado a este App Bundle. Se você usar o código ofuscado (R8/proguard), o upload de um arquivo de desofuscação facilitará a análise e depuração de falhas e ANRs."*

**Por que fazer:** Com o mapping, os relatórios de crash e ANR da Play Console mostram stack traces legíveis em vez de nomes ofuscados. Não é obrigatório para publicar; é boa prática para debug.

**Passos para a próxima versão:**

1. **Ativar R8/minify no release**  
   Em `android/app/build.gradle`, no bloco `buildTypes` → `release`:
   - `minifyEnabled true`
   - (opcional) `shrinkResources true`
   - Manter `proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'`

2. **ProGuard / Capacitor**  
   Se o build ou o app quebrar (ex.: plugins que usam reflexão), adicionar regras em `android/app/proguard-rules.pro`. Exemplo genérico para manter classes do Capacitor:
   ```proguard
   -keep class com.getcapacitor.** { *; }
   ```
   Consultar documentação do Capacitor e dos plugins usados para regras específicas.

3. **Gerar o AAB**  
   Build → Generate Signed Bundle / APK → Android App Bundle → release. O mapping é gerado junto.

4. **Onde está o mapping**  
   `android/app/build/outputs/mapping/release/mapping.txt`

5. **Upload na Play Console**  
   Na página da versão (teste interno ou produção), na seção do App Bundle daquela versão, usar a opção de enviar “Arquivo de desofuscação” / “Mapping file” e fazer upload do `mapping.txt`.

**Referência:** [Documentação Android – R8/ProGuard](https://developer.android.com/studio/build/shrink-code) e link “Saiba mais” do aviso na Play Console.

---

## 2. Outros itens (se aplicável)

- **AGP Upgrade Assistant:** se o Android Studio continuar sugerindo atualização do Android Gradle Plugin, avaliar rodar o assistente em um branch de teste antes da próxima release.
- **Pré-estreia no app (?app=1):** se quiser esconder também o checkout de pré-estreia no app lojas, adicionar redirecionamento em `/pre-estreia/[id]/checkout` quando `isStoreApp` (ver `docs/RAIO-X-FUNCIONALIDADE-E-PLAY-STORE.md`).
