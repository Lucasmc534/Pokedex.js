function Pokemon(pokemonName) { // FUNÇÃO RESPONSÁVEL POR BUSCAR OS DADOS NA API
    const url = `https://pokeapi.co/api/v2/pokemon/${pokemonName}`;
    return fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error("Erro ao buscar o Pokémon");
            }
            return response.json();
        })
        .catch(error => {
            console.error("Erro:", error);
            throw error;
        });
    }
    //=============================================================================
    //Capitura o nome do Pokémon digitado no input e o botão de pesquisa

    // Captura o input e o botão de pesquisa do HTML
    const pokemonInput = 
    document.querySelector("#pokemonName");

    // Captura o botão de pesquisa do HTML
    const searchButton = 
    document.querySelector("#searchButton");

    // Capiturar a div do HTML onde será exibido o resultado da pesquisa
    const pokemonResult = document.querySelector("#pokemonResult");

    //quando o botão de pesquisa for clicado, chama a função Pokemon com o nome do Pokémon digitado no input
    searchButton.addEventListener("click", function() {

        const pokemonName = pokemonInput.value.toLowerCase();

        pokemonResult.innerHTML = ""; // Limpa o resultado anterior

        // Chama a função Pokemon com o nome do Pokémon digitado no input
        Pokemon(pokemonName)
            .then(data => {
                const image = document.createElement("img");
                image.src = data.sprites.front_default;
                pokemonResult.appendChild(image);

                const nome = document.createElement("h2");
                nome.textContent = `Nome: ${data.name}`;
                pokemonResult.appendChild(nome);

                const id = document.createElement("h2");
                id.textContent = `ID: ${data.id}`;
                pokemonResult.appendChild(id);

                const type = document.createElement("h2");
                type.textContent = `Tipo: ${data.types.map(type => type.type.name).join(", ")}`;
                pokemonResult.appendChild(type);

                

                return fetch(data.species.url);
            })
                .then(response => {
            return response.json(); // Converte a resposta para JSON
        })
            .then(speciesData => {
            return fetch(speciesData.evolution_chain.url);
        })
            .then(response => {
            return response.json(); // Converte a resposta para JSON
        })
            .then(evolutionData => {
            console.log(evolutionData.chain); 
            return evolutionData; // Retorna a cadeia de evolução para a próxima etapa
        })
            .then(evolutionData => {

                let atual = evolutionData.chain; // Inicia com a cadeia de evolução
                let estagio = 1; // Contador de estágios de evolução

                // Enquanto houver evolução verifica se o nome do Pokémon atual é igual ao nome pesquisado
                while (atual) {
                    if (atual.species.name === pokemonName) {
                        const evolucao = document.createElement("h2");
                        evolucao.textContent = `Estágio de evolução: ${estagio}`;
                        pokemonResult.appendChild(evolucao);
                        break;
                    }
                    if (atual.evolves_to.length === 0) {
                        break;
                    }
                    atual = atual.evolves_to[0];
                    estagio++;
                }
                    
        });

    });