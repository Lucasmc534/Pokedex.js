import test from 'node:test';
import assert from 'node:assert/strict';
import {
    calculateBattleStats,
    calculateDamage,
    getTurnOrder,
    getTypeEffectiveness,
    resolveTurn
} from './battleEngine.js';

const alwaysHigh = () => 0.99;

function createPokemon(overrides = {}) {
    return {
        name: 'testmon',
        level: 50,
        hp: 120,
        maxHp: 120,
        stats: {
            hp: 120,
            attack: 100,
            defense: 100,
            specialAttack: 100,
            specialDefense: 100,
            speed: 100
        },
        types: ['normal'],
        moves: [],
        status: null,
        statStages: {},
        ...overrides
    };
}

function createMove(overrides = {}) {
    return {
        name: 'test strike',
        type: 'normal',
        category: 'damage',
        damageClass: 'physical',
        power: 50,
        accuracy: null,
        priority: 0,
        criticalRate: 0,
        ...overrides
    };
}

test('calculates level 50 stats from base stats and IVs', () => {
    const baseStats = {
        hp: 45,
        attack: 49,
        defense: 49,
        'special-attack': 65,
        'special-defense': 65,
        speed: 45
    };
    const ivs = Object.fromEntries(Object.keys(baseStats).map((stat) => [stat, 31]));

    assert.deepEqual(calculateBattleStats(baseStats, ivs, 50), {
        hp: 120,
        attack: 69,
        defense: 69,
        specialAttack: 85,
        specialDefense: 85,
        speed: 65
    });
});

test('calculates dual-type effectiveness and immunities', () => {
    assert.equal(getTypeEffectiveness('water', ['fire', 'ground']), 4);
    assert.equal(getTypeEffectiveness('ground', ['flying']), 0);
    assert.equal(getTypeEffectiveness('normal', ['rock']), 0.5);
});

test('priority decides turn order before speed', () => {
    const fast = createPokemon({ stats: { ...createPokemon().stats, speed: 150 } });
    const slow = createPokemon({ stats: { ...createPokemon().stats, speed: 50 } });

    assert.deepEqual(
        getTurnOrder(fast, slow, createMove({ priority: 0 }), createMove({ priority: 1 }), alwaysHigh),
        ['enemy', 'player']
    );
});

test('faster Pokemon acts first and physical damage uses STAB', () => {
    const fast = createPokemon({ types: ['normal'], stats: { ...createPokemon().stats, speed: 120 } });
    const slow = createPokemon({ types: ['fire'], stats: { ...createPokemon().stats, speed: 80 } });
    const result = calculateDamage(fast, slow, createMove({ power: 60 }), alwaysHigh);

    assert.deepEqual(getTurnOrder(fast, slow, createMove(), createMove(), alwaysHigh), ['player', 'enemy']);
    assert.deepEqual(result, { damage: 42, critical: false, effectiveness: 1 });
});

test('critical hits deal increased damage', () => {
    const attacker = createPokemon();
    const defender = createPokemon({ types: ['fire'] });
    const result = calculateDamage(attacker, defender, createMove({ power: 60 }), () => 0);

    assert.equal(result.critical, true);
    assert.equal(result.damage, 53);
});

test('protect blocks the opponent attack for the current turn', () => {
    const player = createPokemon({ moves: [createMove({ category: 'status', power: null, protect: true })] });
    const enemy = createPokemon({ name: 'opponent', stats: { ...createPokemon().stats, speed: 80 } });
    const protect = createMove({ name: 'protect', category: 'status', power: null, protect: true, priority: 4 });
    const strike = createMove({ power: 80 });
    const result = resolveTurn(player, enemy, protect, strike, alwaysHigh);

    assert.equal(result.player.hp, player.hp);
    assert.equal(result.enemy.hp, enemy.hp);
    assert.match(result.messages.join(' '), /se protegeu/);
});

test('protect blocks status moves aimed at the protected Pokemon', () => {
    const player = createPokemon({ stats: { ...createPokemon().stats, speed: 120 } });
    const enemy = createPokemon({ name: 'opponent', stats: { ...createPokemon().stats, speed: 80 } });
    const statusMove = createMove({
        name: 'thunder wave',
        category: 'status',
        power: null,
        ailment: 'paralysis',
        target: 'opponent'
    });
    const protect = createMove({ name: 'protect', category: 'status', power: null, protect: true, priority: 4 });
    const result = resolveTurn(player, enemy, statusMove, protect, alwaysHigh);

    assert.equal(result.player.status, null);
    assert.match(result.messages.join(' '), /se protegeu do ataque/);
});

test('multi-hit moves apply damage for every hit', () => {
    const attacker = createPokemon({ stats: { ...createPokemon().stats, speed: 120 } });
    const enemy = createPokemon({ name: 'opponent', stats: { ...createPokemon().stats, speed: 80 } });
    const multiHitMove = createMove({ power: 20, hitCount: { min: 2, max: 2 } });
    const enemyProtect = createMove({ category: 'status', power: null, protect: true, priority: -1 });
    const result = resolveTurn(attacker, enemy, multiHitMove, enemyProtect, alwaysHigh);

    assert.equal(result.enemy.hp, 90);
    assert.match(result.messages.join(' '), /Atingiu 2 vezes/);
});

test('two-to-five-hit moves use the modern hit-count distribution', () => {
    const attacker = createPokemon({ stats: { ...createPokemon().stats, speed: 120 } });
    const enemy = createPokemon({ name: 'opponent', stats: { ...createPokemon().stats, speed: 80 } });
    const multiHitMove = createMove({ power: 20, hitCount: { min: 2, max: 5 } });
    const harmlessMove = createMove({ category: 'status', power: null, accuracy: null, target: 'user' });
    const result = resolveTurn(attacker, enemy, multiHitMove, harmlessMove, () => 0.6);

    assert.match(result.messages.join(' '), /Atingiu 3 vezes/);
});

test('recoil moves damage their user after dealing damage', () => {
    const attacker = createPokemon({ stats: { ...createPokemon().stats, speed: 120 } });
    const enemy = createPokemon({ name: 'opponent', stats: { ...createPokemon().stats, speed: 80 } });
    const recoilMove = createMove({ power: 20, recoil: 25 });
    const enemyProtect = createMove({ category: 'status', power: null, protect: true, priority: -1 });
    const result = resolveTurn(attacker, enemy, recoilMove, enemyProtect, alwaysHigh);

    assert.equal(result.player.hp, 117);
    assert.match(result.messages.join(' '), /dano de recuo/);
});

test('a flinched Pokemon loses its action', () => {
    const attacker = createPokemon({ stats: { ...createPokemon().stats, speed: 120 } });
    const enemy = createPokemon({ name: 'opponent', stats: { ...createPokemon().stats, speed: 80 } });
    const flinchMove = createMove({ power: 20, flinchChance: 100 });
    const result = resolveTurn(attacker, enemy, flinchMove, createMove(), alwaysHigh);

    assert.equal(result.player.hp, 120);
    assert.match(result.messages.join(' '), /perdeu o turno/);
});

test('accuracy stages can cause an otherwise accurate move to miss', () => {
    const player = createPokemon({
        statStages: { accuracy: -6 },
        stats: { ...createPokemon().stats, speed: 120 }
    });
    const enemy = createPokemon({ name: 'opponent', stats: { ...createPokemon().stats, speed: 80 } });
    const result = resolveTurn(player, enemy, createMove({ accuracy: 100 }), createMove(), alwaysHigh);

    assert.equal(result.enemy.hp, enemy.hp);
    assert.match(result.messages.join(' '), /mas errou/);
});

test('accuracy and evasion stages combine before calculating accuracy', () => {
    const player = createPokemon({
        statStages: { accuracy: -1 },
        stats: { ...createPokemon().stats, speed: 120 }
    });
    const enemy = createPokemon({
        statStages: { evasion: 1 },
        stats: { ...createPokemon().stats, speed: 80 }
    });
    const harmlessMove = createMove({
        category: 'status',
        power: null,
        accuracy: null,
        target: 'user'
    });
    const accurateStrike = createMove({ accuracy: 100 });
    const result = resolveTurn(player, enemy, accurateStrike, harmlessMove, () => 0.57);

    assert.ok(result.enemy.hp < enemy.hp);
    assert.ok(result.messages.some((message) => message.includes('usou test strike.')));
});

test('paralysis lowers speed, may prevent action, and persists', () => {
    const player = createPokemon({ stats: { ...createPokemon().stats, speed: 120 } });
    const enemy = createPokemon({ name: 'opponent', stats: { ...createPokemon().stats, speed: 80 } });
    const paralyze = createMove({
        name: 'thunder wave',
        category: 'status',
        power: null,
        ailment: 'paralysis',
        ailmentChance: 100
    });
    const result = resolveTurn(player, enemy, paralyze, createMove(), alwaysHigh);

    assert.equal(result.enemy.status, 'paralysis');
    assert.match(result.messages.join(' '), /paralisado/);
});
