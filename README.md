# 🔴 Pokédex

Uma Pokédex simples e interativa desenvolvida em JavaScript, utilizando a **PokéAPI** para buscar informações sobre Pokémon em tempo real.

O projeto foi desenvolvido como atividade acadêmica com o objetivo de praticar o consumo de APIs públicas utilizando JavaScript.

---

## 📖 Sobre o projeto

A aplicação permite que o usuário pesquise pelo nome de um Pokémon e visualize algumas de suas principais informações.

Ao realizar uma pesquisa, a aplicação consulta a PokéAPI e apresenta:

- 🏷️ Nome do Pokémon
- 🔢 Número na Pokédex
- ⚡ Tipo(s)
- 🖼️ Imagem
- 🧬 Estágio de evolução

Os dados são obtidos diretamente da API, portanto não existe uma lista de Pokémon armazenada manualmente no projeto.

---

## 🛠️ Tecnologias utilizadas

- HTML5
- CSS3
- JavaScript
- Fetch API
- Promises
- PokéAPI

### API utilizada

[PokéAPI](https://pokeapi.co/)

A PokéAPI é uma API pública que fornece informações sobre Pokémon, incluindo dados de espécies, tipos, sprites e cadeias de evolução.

---

## ⚙️ Como funciona

O funcionamento básico da aplicação segue este fluxo:

```text
Usuário
   ↓
Digite o nome do Pokémon
   ↓
Clique em "Pesquisar"
   ↓
JavaScript captura o nome
   ↓
Fetch realiza uma requisição à PokéAPI
   ↓
API retorna os dados em JSON
   ↓
JavaScript processa os dados
   ↓
Informações são exibidas na página
