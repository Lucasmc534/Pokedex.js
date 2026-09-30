import { useState } from 'react';
import { getPokemonByName } from '../services/pokeService.js';

export default function Pokedex() {
    const [query, setQuery] = useState('');
    const [pokemon, setPokemon] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSearch(event) {
        // O formulário também permite pesquisar pressionando Enter.
        event.preventDefault();
        if (!query.trim()) {
            setError('Digite o nome ou número de um Pokémon.');
            setPokemon(null);
            return;
        }

        setIsLoading(true);
        setError('');
        setPokemon(null);

        try {
            // A tela não conhece URLs nem o formato bruto da API; isso pertence ao serviço.
            const result = await getPokemonByName(query);
            setPokemon(result);
        } catch (searchError) {
            setError(searchError instanceof Error
                ? searchError.message
                : 'Não foi possível buscar o Pokémon. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <section className="pokedex" aria-labelledby="pokedex-title">
            <h1 id="pokedex-title">Pokédex</h1>
            <p>Pesquise por nome ou número</p>

            <form className="pokedex-search" onSubmit={handleSearch}>
                <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Ex.: pikachu ou 25"
                    aria-label="Nome ou número do Pokémon"
                    disabled={isLoading}
                />
                <button type="submit" disabled={isLoading}>
                    {isLoading ? 'Buscando...' : 'Pesquisar'}
                </button>
            </form>

            <div className="pokemon-result" aria-live="polite" aria-busy={isLoading}>
                {isLoading && <p className="pokedex-message">Consultando a PokéAPI...</p>}
                {error && <p className="pokedex-message" role="alert">{error}</p>}

                {pokemon && (
                    <>
                        {pokemon.sprite && <img src={pokemon.sprite} alt={pokemon.name} />}
                        <h2>#{pokemon.id} {pokemon.name}</h2>
                        <div className="pokemon-types" aria-label="Tipos">
                            {pokemon.types.map((type) => (
                                <span className={`pokemon-type type-${type}`} key={type}>{type}</span>
                            ))}
                        </div>
                        {pokemon.description && (
                            <div className="pokemon-description">
                                <h3>Descrição da Pokédex <span>(em inglês)</span></h3>
                                <p>{pokemon.description}</p>
                                {pokemon.descriptionVersion && (
                                    <small>Jogo: {pokemon.descriptionVersion.replaceAll('-', ' ')}</small>
                                )}
                            </div>
                        )}
                        <p>Estágio evolutivo: {pokemon.evolutionStage ?? 'não identificado'}</p>
                    </>
                )}
            </div>
        </section>
    );
}
