import { useEffect, useState } from 'react';
import { getRandomPokemon } from '../services/pokeService';
import { resolveTurn } from '../utils/battleEngine';
import HealthBar from './HealthBar';
import { playSound } from '../utils/soundEffects';

const STATUS_LABELS = {
    burn: 'Queimado',
    poison: 'Envenenado',
    paralysis: 'Paralisado'
};

const STAT_LABELS = [
    ['attack', 'ATQ'],
    ['defense', 'DEF'],
    ['specialAttack', 'ATQ ESP'],
    ['specialDefense', 'DEF ESP'],
    ['speed', 'VEL']
];

async function createBattle() {
    // Carregar em sequência permite excluir o ID do jogador ao sortear o oponente.
    const player = await getRandomPokemon();
    const enemy = await getRandomPokemon([player.id]);
    return { player, enemy };
}

function PokemonPanel({ pokemon, side, label }) {
    return (
        <section className={`pokemon-panel pokemon-panel-${side}`} aria-label={label}>
            <div className="pokemon-heading">
                <div>
                    <p className="pokemon-role">{label}</p>
                    <h2>{pokemon.name}</h2>
                    <p className="pokemon-level">Nível {pokemon.level}</p>
                </div>
                <div className="pokemon-types">
                    {pokemon.types.map((type) => (
                        <span className={`pokemon-type type-${type}`} key={type}>{type}</span>
                    ))}
                </div>
            </div>

            <HealthBar hp={pokemon.hp} maxHp={pokemon.maxHp} />

            <div className="pokemon-artwork">
                <img
                    src={side === 'player' ? pokemon.spriteBack : pokemon.sprite}
                    alt={pokemon.name}
                />
                {pokemon.status && (
                    <span className={`status-badge status-${pokemon.status}`}>
                        {STATUS_LABELS[pokemon.status]}
                    </span>
                )}
            </div>

            <dl className="pokemon-stats">
                {STAT_LABELS.map(([stat, labelText]) => (
                    <div key={stat}>
                        <dt>{labelText}</dt>
                        <dd>{pokemon.stats[stat]}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}

export default function BattleArena() {
    const [battle, setBattle] = useState({
        player: null,
        enemy: null,
        messages: ['Preparando a batalha...'],
        loading: true,
        winner: null,
        error: ''
    });

    useEffect(() => {
        // O cleanup evita atualizar estado caso o componente seja desmontado durante a busca.
        let isCurrent = true;
        createBattle()
            .then(({ player, enemy }) => {
                if (isCurrent) {
                    setBattle({
                        player,
                        enemy,
                        messages: [`Um ${enemy.name} selvagem apareceu!`],
                        loading: false,
                        winner: null,
                        error: ''
                    });
                }
            })
            .catch((error) => {
                if (isCurrent) {
                    setBattle((current) => ({
                        ...current,
                        loading: false,
                        error: error instanceof Error ? error.message : 'Não foi possível iniciar a batalha.'
                    }));
                }
            });

        return () => {
            isCurrent = false;
        };
    }, []);

    async function handleNewBattle() {
        setBattle({
            player: null,
            enemy: null,
            messages: ['Preparando a batalha...'],
            loading: true,
            winner: null,
            error: ''
        });

        try {
            const { player, enemy } = await createBattle();
            setBattle({
                player,
                enemy,
                messages: [`Um ${enemy.name} selvagem apareceu!`],
                loading: false,
                winner: null,
                error: ''
            });
        } catch (error) {
            setBattle((current) => ({
                ...current,
                loading: false,
                error: error instanceof Error ? error.message : 'Não foi possível iniciar a batalha.'
            }));
        }
    }

    function handleMove(move) {
        if (!battle.player || !battle.enemy || battle.winner) return;

        // O adversário escolhe sem considerar a jogada do jogador; o motor decide a ordem real.
        const enemyMove = battle.enemy.moves[Math.floor(Math.random() * battle.enemy.moves.length)];
        const result = resolveTurn(battle.player, battle.enemy, move, enemyMove);
        if (result.messages.some((message) => message.includes('sofreu') && message.includes('dano'))) {
            playSound('/audio/sfx-hit.wav', 0.6);
        }

        setBattle({
            ...battle,
            ...result,
            messages: result.messages
        });
    };

    if (battle.loading) return <p role="status">{battle.messages[0]}</p>;
    if (battle.error) {
        return (
            <div className="battle-error" role="alert">
                <p>{battle.error}</p>
                <button type="button" onClick={handleNewBattle}>Tentar novamente</button>
            </div>
        );
    }
    if (!battle.player || !battle.enemy) return null;

    return (
        <section className="battle-arena" aria-label="Arena de batalha">
            <header className="battle-header">
                <h1>Batalha Pokémon</h1>
                <button type="button" onClick={handleNewBattle}>
                    Nova batalha
                </button>
            </header>

            <div className="battle-sides">
                <PokemonPanel pokemon={battle.player} side="player" label="Seu Pokémon" />
                <PokemonPanel pokemon={battle.enemy} side="enemy" label="Oponente" />
            </div>

            <section className="battle-controls" aria-labelledby="moves-title">
                <h2 id="moves-title">Escolha um golpe</h2>
                <div className="moves-box">
                    {battle.player.moves.map((move) => (
                        <button
                            className="move-button"
                            type="button"
                            key={move.id}
                            onClick={() => handleMove(move)}
                            disabled={Boolean(battle.winner)}
                        >
                            <span className="move-name">{move.name.replaceAll('-', ' ')}</span>
                            <span className={`move-type type-${move.type}`}>{move.type}</span>
                            <span className="move-details">
                                {move.category === 'status'
                                    ? 'Efeito'
                                    : `${move.damageClass === 'physical' ? 'Físico' : 'Especial'} · Poder ${move.power}`}
                                {' · '}{move.accuracy ?? 100}% precisão
                            </span>
                        </button>
                    ))}
                </div>
            </section>

            <section className="battle-log" aria-labelledby="battle-log-title" aria-live="polite">
                <h2 id="battle-log-title">Log da batalha</h2>
                {battle.messages.map((message, index) => <p key={`${index}-${message}`}>{message}</p>)}
            </section>

            {battle.winner && (
                <p className="battle-result" role="status">
                    {battle.winner === 'player' ? 'Vitória!' : battle.winner === 'enemy' ? 'Derrota!' : 'Empate!'}
                </p>
            )}
        </section>
    );
}