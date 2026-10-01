# Pokédex

Projeto acadêmico para praticar React, JavaScript moderno e consumo de APIs públicas. A aplicação reúne uma Pokédex pesquisável e uma batalha Pokémon simplificada, usando a [PokéAPI](https://pokeapi.co/) como fonte de dados.

## Funcionalidades

- Pesquisar Pokémon por nome ou número e consultar imagem, tipos, estágio evolutivo e descrição da espécie.
- Exibir descrições em inglês quando disponíveis; a PokéAPI não fornece uma descrição em português para todas as espécies.
- Navegar por rotas próprias (`/`, `/pokedex` e `/batalha`), cada tela com sua própria trilha sonora.
- Sortear espécies com IDs de 1 a 1025 para as batalhas.
- Jogar batalhas no nível 50, com atributos calculados, IVs aleatórios e quatro golpes compatíveis.
- Resolver turnos com velocidade, prioridade, categorias física/especial, precisão, tipos, STAB, críticos e efeitos suportados.

## Tecnologias

- React e React DOM para componentes e estado da interface.
- React Router para navegação SPA e URLs independentes.
- Vite para desenvolvimento local e build de produção.
- JavaScript modules e Fetch API para separar serviços, interface e regras.
- PokéAPI para espécies, atributos, golpes, descrições e tipos.
- Node.js test runner para testes do motor de batalha.

## Requisitos

- Node.js 20 LTS ou mais recente.
- Acesso à internet para consultar a PokéAPI e carregar recursos remotos.

## Executar localmente

No PowerShell, na pasta do projeto:

```powershell
npm.cmd install
npm.cmd run dev
```

O Vite imprime o endereço local no terminal, normalmente `http://localhost:5173`.

Para executar os testes e criar um build de produção:

```powershell
npm.cmd test
npm.cmd run build
```

Em terminais que não bloqueiam scripts PowerShell, os comandos também podem ser executados como `npm install`, `npm test` e `npm run build`.

## Publicação na Vercel

O projeto usa o preset Vite, o comando `npm run build` e o diretório de saída `dist`. Na Vercel, mantenha a raiz do projeto como `./` e a branch de produção como `main`. O arquivo `vercel.json` reescreve as rotas da aplicação para `index.html`, permitindo abrir ou atualizar diretamente `/pokedex` e `/batalha`.

## Organização do código

```text
src/
  App.jsx                   Rotas SPA, navegação e seleção de música
  main.jsx                  Inicialização do React e BrowserRouter
  components/
    BackgroundMusic.jsx     Ciclo de vida do áudio
    BattleArena.jsx         Interface e estado da batalha
    HealthBar.jsx           Barra de HP acessível
    Pokedex.jsx             Pesquisa e apresentação dos dados
  services/
    pokeService.js          Requisições e adaptação da PokéAPI
  utils/
    battleEngine.js         Regras puras da batalha
    battleEngine.test.js    Testes determinísticos das regras
    soundEffects.js         Efeitos sonoros
public/
  audio/                    Músicas e efeitos locais
  css/style.css             Estilos da Pokédex
vercel.json                 Fallback SPA para URLs de rota
```

`pokeService.js` converte respostas da API em dados de domínio. `battleEngine.js` não depende de React: recebe dois combatentes e os golpes escolhidos, calcula o resultado em cópias e devolve o novo estado junto do registro textual. `BattleArena.jsx` apresenta esse resultado e atualiza a tela.

## Conceitos para estudar

- `useState`: controla estados locais, como o formulário de pesquisa, o som e a partida. As telas são escolhidas pelo caminho atual do React Router.
- `useEffect`: inicia o carregamento da batalha e executa cleanup se a tela for desmontada.
- `useRef`: mantém uma instância de áudio entre renderizações sem colocá-la no estado visual.
- Componentes: `Pokedex`, `BattleArena`, `HealthBar` e `BackgroundMusic` dividem responsabilidades de interface.
- Funções puras: o motor recebe os dados do turno e devolve cópias atualizadas; isso facilita testar regras sem navegador.
- Injeção de aleatoriedade: os testes fornecem números controlados para reproduzir críticos, erros e ordem de turno.
- `async`/`await` e `fetch`: o serviço isola as chamadas HTTP e converte respostas em objetos usados pela aplicação.

## Regras e limites da batalha V1

Os atributos de combate usam os atributos-base da espécie no nível 50, IVs aleatórios entre 0 e 31, natureza neutra e zero EVs. Os golpes são selecionados a partir de conjuntos de jogos disponíveis para a espécie, mas apenas categorias e efeitos compreendidos pelo motor entram na seleção.

A V1 inclui dano físico e especial, prioridade e velocidade, efetividade de tipos, STAB, crítico, variação de dano, precisão/evasão, alterações de atributos, golpes múltiplos, recuo, dreno, flinch, proteção, cura e queimadura, veneno e paralisia.

Ainda não são simulados EVs, naturezas, habilidades, itens, clima, troca de Pokémon, sono, congelamento, confusão, golpes de carga/recarga ou regras competitivas completas. Golpes que dependem dessas mecânicas são excluídos da seleção quando identificados.

## Testes

Os testes do motor usam valores aleatórios controlados para que a mesma regra produza resultados repetíveis. Isso permite verificar fórmulas e turnos sem depender da PokéAPI ou do navegador.

## Programado por

- Lucas Cordeiro
- Lucas Kauan
