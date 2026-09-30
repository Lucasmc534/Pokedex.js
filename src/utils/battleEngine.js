const STAT_NAMES = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];

// Cada grupo descreve como um tipo de golpe afeta o tipo defensor.
// Em Pokémon com dois tipos, os multiplicadores dos dois tipos são combinados.
const TYPE_CHART = {
    normal: { resisted: ['rock', 'steel'], immune: ['ghost'] },
    fire: { super: ['grass', 'ice', 'bug', 'steel'], resisted: ['fire', 'water', 'rock', 'dragon'] },
    water: { super: ['fire', 'ground', 'rock'], resisted: ['water', 'grass', 'dragon'] },
    electric: { super: ['water', 'flying'], resisted: ['electric', 'grass', 'dragon'], immune: ['ground'] },
    grass: { super: ['water', 'ground', 'rock'], resisted: ['fire', 'grass', 'poison', 'flying', 'bug', 'dragon', 'steel'] },
    ice: { super: ['grass', 'ground', 'flying', 'dragon'], resisted: ['fire', 'water', 'ice', 'steel'] },
    fighting: { super: ['normal', 'ice', 'rock', 'dark', 'steel'], resisted: ['poison', 'flying', 'psychic', 'bug', 'fairy'], immune: ['ghost'] },
    poison: { super: ['grass', 'fairy'], resisted: ['poison', 'ground', 'rock', 'ghost'], immune: ['steel'] },
    ground: { super: ['fire', 'electric', 'poison', 'rock', 'steel'], resisted: ['grass', 'bug'], immune: ['flying'] },
    flying: { super: ['grass', 'fighting', 'bug'], resisted: ['electric', 'rock', 'steel'] },
    psychic: { super: ['fighting', 'poison'], resisted: ['psychic', 'steel'], immune: ['dark'] },
    bug: { super: ['grass', 'psychic', 'dark'], resisted: ['fire', 'fighting', 'poison', 'flying', 'ghost', 'steel', 'fairy'] },
    rock: { super: ['fire', 'ice', 'flying', 'bug'], resisted: ['fighting', 'ground', 'steel'] },
    ghost: { super: ['psychic', 'ghost'], resisted: ['dark'], immune: ['normal'] },
    dragon: { super: ['dragon'], resisted: ['steel'], immune: ['fairy'] },
    dark: { super: ['psychic', 'ghost'], resisted: ['fighting', 'dark', 'fairy'] },
    steel: { super: ['ice', 'rock', 'fairy'], resisted: ['fire', 'water', 'electric', 'steel'] },
    fairy: { super: ['fighting', 'dragon', 'dark'], resisted: ['fire', 'poison', 'steel'] }
};

const STAT_ALIASES = {
    'special-attack': 'specialAttack',
    'special-defense': 'specialDefense'
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function calculateBattleStats(baseStats, ivs, level = 50) {
    const stats = {};

    // A V1 usa natureza neutra e 0 EVs. IVs são individuais e já vêm do gerador.
    // Esta é a fórmula de nível dos jogos modernos, separando HP dos outros atributos.
    for (const statName of STAT_NAMES) {
        const base = baseStats[statName];
        const iv = ivs[statName] ?? 0;
        const core = Math.floor(((2 * base + iv) * level) / 100);
        const key = STAT_ALIASES[statName] ?? statName;
        stats[key] = statName === 'hp' ? core + level + 10 : core + 5;
    }

    return stats;
}

function getStageMultiplier(stage = 0) {
    return stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage);
}

function getAccuracyMultiplier(stage = 0) {
    return stage >= 0 ? (3 + stage) / 3 : 3 / (3 - stage);
}

function getModifiedStat(pokemon, statName, options = {}) {
    const stage = pokemon.statStages?.[statName] ?? 0;
    const effectiveStage = options.ignoreNegative && stage < 0
        ? 0
        : options.ignorePositive && stage > 0
            ? 0
            : stage;
    let value = pokemon.stats[statName] * getStageMultiplier(effectiveStage);

    // Queimadura reduz o Ataque físico e paralisia reduz a Velocidade nesta versão.
    if (statName === 'attack' && pokemon.status === 'burn') value *= 0.5;
    if (statName === 'speed' && pokemon.status === 'paralysis') value *= 0.5;

    return Math.max(1, Math.floor(value));
}

export function getTypeEffectiveness(moveType, defenderTypes) {
    const matchup = TYPE_CHART[moveType];
    if (!matchup) return 1;

    // Multiplicar cada tipo defensor trata imunidades e Pokémon de tipo duplo.
    return defenderTypes.reduce((multiplier, defenderType) => {
        if (matchup.immune?.includes(defenderType)) return 0;
        if (matchup.super?.includes(defenderType)) return multiplier * 2;
        if (matchup.resisted?.includes(defenderType)) return multiplier * 0.5;
        return multiplier;
    }, 1);
}

export function getTurnOrder(player, enemy, playerMove, enemyMove, random = Math.random) {
    // Prioridade do golpe é comparada antes da Velocidade; empates são aleatórios.
    if (playerMove.priority !== enemyMove.priority) {
        return playerMove.priority > enemyMove.priority ? ['player', 'enemy'] : ['enemy', 'player'];
    }

    const playerSpeed = getModifiedStat(player, 'speed');
    const enemySpeed = getModifiedStat(enemy, 'speed');
    if (playerSpeed !== enemySpeed) {
        return playerSpeed > enemySpeed ? ['player', 'enemy'] : ['enemy', 'player'];
    }

    return random() < 0.5 ? ['player', 'enemy'] : ['enemy', 'player'];
}

export function calculateDamage(attacker, defender, move, random = Math.random) {
    if (move.category !== 'damage' || !move.power) {
        return { damage: 0, critical: false, effectiveness: 1 };
    }

    // Estágios críticos seguem as quatro faixas usadas nos jogos recentes.
    const criticalThresholds = [1 / 24, 1 / 8, 1 / 2, 1];
    const criticalRate = clamp(move.criticalRate ?? 0, 0, criticalThresholds.length - 1);
    const critical = random() < criticalThresholds[criticalRate];
    const isPhysical = move.damageClass === 'physical';
    const attackStat = isPhysical ? 'attack' : 'specialAttack';
    const defenseStat = isPhysical ? 'defense' : 'specialDefense';
    const attack = getModifiedStat(attacker, attackStat, { ignoreNegative: critical });
    const defense = getModifiedStat(defender, defenseStat, { ignorePositive: critical });
    // Primeiro calcula o dano-base; depois aplica crítico, STAB, tipo e variação.
    const levelFactor = Math.floor((2 * attacker.level) / 5) + 2;
    let damage = Math.floor(((levelFactor * move.power * attack) / defense) / 50) + 2;

    if (critical) damage = Math.floor(damage * 1.5);
    if (attacker.types.includes(move.type)) damage = Math.floor(damage * 1.5);

    const effectiveness = getTypeEffectiveness(move.type, defender.types);
    damage = Math.floor(damage * effectiveness);
    if (effectiveness > 0) {
        damage = Math.floor(damage * (85 + Math.floor(random() * 16)) / 100);
        damage = Math.max(1, damage);
    } else {
        damage = 0;
    }

    return { damage, critical, effectiveness };
}

function canReceiveAilment(pokemon, ailment) {
    if (pokemon.status) return false;
    if (ailment === 'burn' && pokemon.types.includes('fire')) return false;
    if (ailment === 'poison' && pokemon.types.some((type) => ['poison', 'steel'].includes(type))) return false;
    if (ailment === 'paralysis' && pokemon.types.includes('electric')) return false;
    return true;
}

function applyStatChanges(target, changes) {
    const messages = [];

    for (const change of changes) {
        const stat = STAT_ALIASES[change.stat] ?? change.stat;
        if (!Object.hasOwn(target.statStages, stat)) continue;

        const previousStage = target.statStages[stat];
        target.statStages[stat] = clamp(previousStage + change.change, -6, 6);
        if (target.statStages[stat] !== previousStage) {
            const direction = change.change > 0 ? 'aumentou' : 'diminuiu';
            messages.push(`${target.name} ${direction} ${stat} ${Math.abs(target.statStages[stat] - previousStage)} estágio(s).`);
        }
    }

    return messages;
}

function rollHitCount(hitRange, random) {
    if (hitRange.min === 2 && hitRange.max === 5) {
        // Nos jogos modernos, 2/3 acertos têm 35% cada; 4/5 têm 15% cada.
        const roll = random();
        if (roll < 0.35) return 2;
        if (roll < 0.7) return 3;
        if (roll < 0.85) return 4;
        return 5;
    }

    if (hitRange.min === hitRange.max) return hitRange.min;
    return hitRange.min + Math.floor(random() * (hitRange.max - hitRange.min + 1));
}

function useMove(user, target, move, random) {
    const messages = [];
    let damageDealt = 0;

    // Proteção dura apenas este turno e bloqueia golpes direcionados ao oponente.
    if (target.protected && move.target !== 'user') {
        messages.push(`${target.name} se protegeu do ataque!`);
        return { messages, damageDealt };
    }

    if (move.accuracy !== null && move.accuracy !== undefined) {
        const accuracyStage = user.statStages.accuracy ?? 0;
        const evasionStage = target.statStages.evasion ?? 0;
        // Precisão e evasão se somam como estágios antes de consultar o multiplicador.
        const effectiveAccuracy = move.accuracy
            * getAccuracyMultiplier(clamp(accuracyStage - evasionStage, -6, 6));
        if (random() * 100 >= effectiveAccuracy) {
            messages.push(`${user.name} usou ${move.name}, mas errou!`);
            return { messages, damageDealt };
        }
    }

    messages.push(`${user.name} usou ${move.name}.`);

    if (move.protect) {
        user.protected = true;
        messages.push(`${user.name} se protegeu neste turno.`);
    }

    const effectTarget = move.target === 'user' ? user : target;
    if (move.category === 'damage') {
        const hitRange = move.hitCount ?? { min: 1, max: 1 };
        const hitCount = rollHitCount(hitRange, random);
        let actualHits = 0;
        let critical = false;
        const effectiveness = getTypeEffectiveness(move.type, target.types);

        for (let hit = 0; hit < hitCount && target.hp > 0; hit++) {
            const result = calculateDamage(user, target, move, random);
            target.hp = Math.max(0, target.hp - result.damage);
            damageDealt += result.damage;
            actualHits++;
            critical ||= result.critical;
        }

        if (effectiveness === 0) messages.push('Não teve efeito.');
        else if (effectiveness > 1) messages.push('Foi super efetivo!');
        else if (effectiveness < 1) messages.push('Não foi muito efetivo.');
        if (critical) messages.push('Golpe crítico!');
        if (actualHits > 1) messages.push(`Atingiu ${actualHits} vezes.`);
        messages.push(`${target.name} sofreu ${damageDealt} de dano.`);

        if (damageDealt > 0 && move.flinchChance > 0 && random() * 100 < move.flinchChance) {
            target.flinched = true;
        }
    }

    if (effectTarget.hp > 0 && move.ailment && canReceiveAilment(effectTarget, move.ailment)
        && random() * 100 < (move.ailmentChance ?? 100)) {
        effectTarget.status = move.ailment;
        messages.push(`${effectTarget.name} ficou ${move.ailment === 'paralysis' ? 'paralisado' : move.ailment === 'burn' ? 'queimado' : 'envenenado'}!`);
    }

    if (move.statChanges?.length && random() * 100 < (move.statChance ?? 100)) {
        messages.push(...applyStatChanges(effectTarget, move.statChanges));
    }

    if (move.healing > 0) {
        const healed = Math.min(effectTarget.maxHp - effectTarget.hp, Math.max(1, Math.floor(effectTarget.maxHp * move.healing / 100)));
        effectTarget.hp += healed;
        if (healed > 0) messages.push(`${effectTarget.name} recuperou ${healed} HP.`);
    }

    if (move.drain > 0 && damageDealt > 0) {
        const healed = Math.min(user.maxHp - user.hp, Math.max(1, Math.floor(damageDealt * move.drain / 100)));
        user.hp += healed;
        if (healed > 0) messages.push(`${user.name} recuperou ${healed} HP.`);
    }

    if (move.recoil > 0 && damageDealt > 0) {
        const recoilDamage = Math.max(1, Math.floor(damageDealt * move.recoil / 100));
        user.hp = Math.max(0, user.hp - recoilDamage);
        messages.push(`${user.name} sofreu ${recoilDamage} de dano de recuo.`);
    }

    return { messages, damageDealt };
}

function cloneCombatant(pokemon) {
    // O motor trabalha em cópias para não mutar diretamente o estado do React.
    return {
        ...pokemon,
        stats: { ...pokemon.stats },
        types: [...pokemon.types],
        moves: [...pokemon.moves],
        statStages: {
            attack: 0,
            defense: 0,
            specialAttack: 0,
            specialDefense: 0,
            speed: 0,
            accuracy: 0,
            evasion: 0,
            ...(pokemon.statStages ?? {})
        },
        status: pokemon.status ?? null,
        flinched: false,
        protected: false
    };
}

function applyEndOfTurnStatus(pokemon, messages) {
    if (pokemon.hp <= 0 || !['burn', 'poison'].includes(pokemon.status)) return;
    // Queimadura tira 1/16 do HP e veneno normal tira 1/8 ao fim do turno.
    const fraction = pokemon.status === 'burn' ? 16 : 8;
    const damage = Math.max(1, Math.floor(pokemon.maxHp / fraction));
    pokemon.hp = Math.max(0, pokemon.hp - damage);
    messages.push(`${pokemon.name} sofreu ${damage} de dano por ${pokemon.status === 'burn' ? 'queimadura' : 'veneno'}.`);
}

export function resolveTurn(player, enemy, playerMove, enemyMove, random = Math.random) {
    const combatants = {
        player: cloneCombatant(player),
        enemy: cloneCombatant(enemy)
    };
    const messages = [];
    const order = getTurnOrder(combatants.player, combatants.enemy, playerMove, enemyMove, random);
    const moves = { player: playerMove, enemy: enemyMove };

    // A ordem é calculada uma vez no início do turno; o segundo golpe pode ser cancelado por nocaute.
    for (const side of order) {
        const actor = combatants[side];
        const target = combatants[side === 'player' ? 'enemy' : 'player'];
        if (actor.hp <= 0 || target.hp <= 0) continue;

        if (actor.flinched) {
            messages.push(`${actor.name} recuou e perdeu o turno.`);
            continue;
        }

        if (actor.status === 'paralysis' && random() < 0.25) {
            messages.push(`${actor.name} está paralisado e não conseguiu se mover.`);
            continue;
        }

        messages.push(...useMove(actor, target, moves[side], random).messages);
    }

    // Dano residual acontece depois dos dois golpes e também pode encerrar a batalha.
    applyEndOfTurnStatus(combatants.player, messages);
    applyEndOfTurnStatus(combatants.enemy, messages);

    const playerFainted = combatants.player.hp <= 0;
    const enemyFainted = combatants.enemy.hp <= 0;
    const winner = playerFainted && enemyFainted ? 'draw'
        : playerFainted ? 'enemy'
            : enemyFainted ? 'player' : null;

    if (winner === 'draw') messages.push('Os dois Pokémon foram derrotados.');
    else if (winner === 'player') messages.push(`Você venceu! ${combatants.enemy.name} foi derrotado.`);
    else if (winner === 'enemy') messages.push(`${combatants.player.name} foi derrotado.`);

    return {
        player: combatants.player,
        enemy: combatants.enemy,
        messages,
        winner
    };
}
