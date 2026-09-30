import { calculateBattleStats } from '../utils/battleEngine.js';

const API_URL = 'https://pokeapi.co/api/v2';
const BATTLE_LEVEL = 50;
// Os IDs 1–1025 cobrem as espécies da Pokédex Nacional até a geração IX.
const POKEMON_SPECIES_COUNT = 1025;
// Preferimos dados de jogos mais recentes, mas voltamos a jogos anteriores
// quando aquela espécie ainda não existia na geração mais nova.
const VERSION_GROUP_PRIORITY = [
    'champions',
    'scarlet-violet',
    'legends-arceus',
    'sword-shield',
    'ultra-sun-ultra-moon',
    'sun-moon',
    'lets-go-pikachu-lets-go-eevee',
    'omega-ruby-alpha-sapphire',
    'x-y',
    'black-2-white-2',
    'black-white',
    'heartgold-soulsilver',
    'platinum',
    'diamond-pearl',
    'emerald',
    'fire-red-leaf-green',
    'ruby-sapphire',
    'crystal',
    'gold-silver',
    'red-blue'
];
const BATTLE_STAT_NAMES = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
const SUPPORTED_AILMENTS = new Set(['burn', 'poison', 'paralysis']);
const PROTECT_MOVES = new Set(['protect', 'detect']);
const UNSUPPORTED_SPECIAL_MOVES = new Set([
    'razor-wind', 'solar-beam', 'skull-bash', 'fly', 'dig', 'dive', 'bounce',
    'sky-attack', 'phantom-force', 'shadow-force', 'freeze-shock', 'ice-burn',
    'meteor-beam', 'electro-shot', 'geomancy', 'hyper-beam', 'giga-impact',
    'blast-burn', 'hydro-cannon', 'frenzy-plant', 'roar-of-time', 'rock-wrecker',
    'prismatic-laser', 'eternabeam', 'meteor-assault', 'self-destruct', 'explosion',
    'misty-explosion', 'mind-blown'
]);

function shuffle(items) {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index--) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
}

function toBattleMove(moveData) {
    if (UNSUPPORTED_SPECIAL_MOVES.has(moveData.name)) return null;

    // A resposta do endpoint /move separa dano, efeito, alvo e chance em campos próprios.
    const meta = moveData.meta ?? {};
    const damageClass = moveData.damage_class?.name;
    const category = damageClass === 'status' ? 'status' : 'damage';
    const ailmentName = meta.ailment?.name;
    const ailment = SUPPORTED_AILMENTS.has(ailmentName) ? ailmentName : null;
    const hasUnsupportedAilment = ailmentName && ailmentName !== 'none' && !ailment;
    const statChanges = (moveData.stat_changes ?? []).map(({ stat, change }) => ({
        stat: stat.name,
        change
    }));
    const target = ['user', 'user-and-allies', 'users-field'].includes(moveData.target?.name)
        ? 'user'
        : 'opponent';
    const protect = PROTECT_MOVES.has(moveData.name);
    const healing = target === 'user' ? meta.healing ?? 0 : 0;
    const hasSupportedEffect = protect || ailment || statChanges.length > 0 || healing > 0;
    const minHits = Math.max(1, meta.min_hits ?? 1);
    const maxHits = Math.max(minHits, meta.max_hits ?? minHits);
    const hasUnsupportedDuration = (meta.min_turns ?? 0) > 1 || (meta.max_turns ?? 0) > 1;

    if (!['physical', 'special', 'status'].includes(damageClass)) return null;
    if (hasUnsupportedAilment || hasUnsupportedDuration) return null;
    if (category === 'damage' && !(moveData.power > 0)) return null;
    if (category === 'status' && !hasSupportedEffect) return null;

    return {
        id: moveData.id,
        name: moveData.name,
        type: moveData.type.name,
        category,
        damageClass,
        power: moveData.power,
        accuracy: moveData.accuracy,
        priority: moveData.priority ?? 0,
        criticalRate: meta.crit_rate ?? 0,
        hitCount: { min: minHits, max: maxHits },
        ailment,
        ailmentChance: meta.ailment_chance > 0 ? meta.ailment_chance : 100,
        statChanges,
        statChance: meta.stat_chance > 0 ? meta.stat_chance : 100,
        target,
        protect,
        healing,
        drain: Math.max(0, meta.drain ?? 0),
        recoil: Math.max(0, -(meta.drain ?? 0)),
        flinchChance: meta.flinch_chance ?? 0
    };
}

async function getBattleMoves(pokemonData) {
    const movesByVersion = new Map();

    // A PokéAPI lista o histórico inteiro; só guardamos golpes que a espécie podia
    // aprender no nível 50 (ou por máquina) em cada conjunto de jogos.
    for (const entry of pokemonData.moves) {
        for (const detail of entry.version_group_details) {
            const versionGroup = detail.version_group.name;
            const isLevelUpMove = detail.move_learn_method.name === 'level-up'
                && detail.level_learned_at <= BATTLE_LEVEL;
            const isMachineMove = detail.move_learn_method.name === 'machine';
            const isChampionsMove = versionGroup === 'champions'
                && detail.move_learn_method.name === 'train';
            if (!isLevelUpMove && !isMachineMove && !isChampionsMove) continue;

            if (!movesByVersion.has(versionGroup)) movesByVersion.set(versionGroup, new Map());
            movesByVersion.get(versionGroup).set(entry.move.name, entry.move);
        }
    }

    const selectedVersion = VERSION_GROUP_PRIORITY.find((version) => movesByVersion.has(version));
    if (!selectedVersion) {
        throw new Error(`Não foi encontrado um conjunto de golpes para ${pokemonData.name}.`);
    }
    const candidates = shuffle([...movesByVersion.get(selectedVersion).values()]);
    const battleMoves = [];

    // Consultar em lotes paralelos reduz a espera sem disparar dezenas de pedidos de uma vez.
    for (let index = 0; index < candidates.length && battleMoves.length < 4; index += 8) {
        const batch = candidates.slice(index, index + 8);
        const moveDetails = await Promise.all(batch.map(async (candidate) => {
            try {
                const response = await fetch(candidate.url);
                return response.ok ? response.json() : null;
            } catch {
                return null;
            }
        }));

        for (const moveData of moveDetails) {
            if (!moveData) continue;
            const move = toBattleMove(moveData);
            if (move) battleMoves.push(move);
            if (battleMoves.length === 4) break;
        }
    }

    if (battleMoves.length === 0) {
        throw new Error(`Não foi possível encontrar golpes compatíveis para ${pokemonData.name}.`);
    }

    return battleMoves;
}

function findEvolutionStage(evolution, pokemonName, stage = 1) {
    if (evolution.species.name === pokemonName) return stage;

    for (const nextEvolution of evolution.evolves_to) {
        const foundStage = findEvolutionStage(nextEvolution, pokemonName, stage + 1);
        if (foundStage !== null) return foundStage;
    }

    return null;
}

export const getPokemonByName = async (name) => {
    const normalizedName = name.trim().toLowerCase();
    const pokemonResponse = await fetch(`${API_URL}/pokemon/${encodeURIComponent(normalizedName)}`);

    if (!pokemonResponse.ok) {
        throw new Error('Pokémon não encontrado. Confira o nome e tente novamente.');
    }

    const pokemon = await pokemonResponse.json();
    const speciesResponse = await fetch(pokemon.species.url);
    if (!speciesResponse.ok) throw new Error('Não foi possível carregar os dados da espécie.');

    const species = await speciesResponse.json();
    const evolutionResponse = await fetch(species.evolution_chain.url);
    if (!evolutionResponse.ok) throw new Error('Não foi possível carregar a cadeia evolutiva.');

    const evolutionData = await evolutionResponse.json();
    // A API não oferece descrição pt-BR para todas as espécies; a V1 usa inglês e guarda a versão.
    const descriptionEntry = species.flavor_text_entries
        .filter(({ language }) => language.name === 'en')
        .at(-1);
    const description = descriptionEntry?.flavor_text
        .replace(/[\f\n\r]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim() ?? '';

    return {
        id: pokemon.id,
        name: pokemon.name,
        sprite: pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default,
        types: pokemon.types.map(({ type }) => type.name),
        evolutionStage: findEvolutionStage(evolutionData.chain, pokemon.name),
        description,
        descriptionVersion: descriptionEntry?.version.name ?? ''
    };
};

export const getRandomPokemon = async (excludedIds = []) => {
    // O segundo participante recebe um ID diferente para evitar batalhas espelhadas.
    const availableIds = Array.from({ length: POKEMON_SPECIES_COUNT }, (_, index) => index + 1)
        .filter((id) => !excludedIds.includes(id));
    const randomId = availableIds[Math.floor(Math.random() * availableIds.length)];
    const response = await fetch(`${API_URL}/pokemon/${randomId}`);
    if (!response.ok) throw new Error('Não foi possível carregar um Pokémon para a batalha.');

    const data = await response.json();
    const baseStats = Object.fromEntries(data.stats.map(({ stat, base_stat: value }) => [stat.name, value]));
    // IVs simulam variação individual; EVs e natureza ficam neutros nesta primeira versão.
    const ivs = Object.fromEntries(BATTLE_STAT_NAMES.map((stat) => [stat, Math.floor(Math.random() * 32)]));
    const stats = calculateBattleStats(baseStats, ivs, BATTLE_LEVEL);
    const moves = await getBattleMoves(data);

    return {
        id: data.id,
        name: data.name,
        level: BATTLE_LEVEL,
        baseStats,
        ivs,
        stats,
        hp: stats.hp,
        maxHp: stats.hp,
        status: null,
        statStages: {},
        sprite: data.sprites.front_default || data.sprites.other['official-artwork'].front_default,
        spriteBack: data.sprites.back_default || data.sprites.front_default,
        types: data.types.map(({ type }) => type.name),
        moves
    };
};