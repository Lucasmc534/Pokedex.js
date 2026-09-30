import { useState } from 'react';
import BattleArena from './components/BattleArena.jsx';
import BackgroundMusic from './components/BackgroundMusic';
import Pokedex from './components/Pokedex.jsx';

export default function App() {
  // Estado da navegação: cada modo escolhe uma tela e sua respectiva música.
  const [mode, setMode] = useState('menu');
  // Começar sem áudio respeita a política de autoplay dos navegadores.
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Centralizar os caminhos facilita trocar uma faixa sem alterar o componente de áudio.
    const musicByMode = {
      menu: '/audio/menu-theme.mp3',
      pokedex: '/audio/pokedex-theme.mp3.mp3',
      battle: '/audio/batlle-theme.mp3'
    };

    return (
        <div className="app-container">

            {/* A música acompanha o modo ativo, enquanto o botão controla o volume globalmente. */}
            <BackgroundMusic
              audioSrc={musicByMode[mode]}
              isPlaying={soundEnabled}
              volume={0.2}
            />

            {/* Botão global on/off */}
            <button
              className="sound-toggle-btn"
              aria-pressed={soundEnabled}
              onClick={() => setSoundEnabled((enabled) => !enabled)}
              >
                {soundEnabled ? '🔊 Som ON' : '🔇Som OFF'}
              </button>

              {/* Telas do jogo */}
              {mode === 'menu' && (
                <div className="menu-container">
                    <h1>Escolha o seu Modo</h1>
                    <button onClick={() => setMode('pokedex')}> Abrir Pokédex</button>
                    <button onClick={() => {setMode('battle'); setSoundEnabled(true); }}>Batalha Aleatória</button>
                    </div>
              )}

              {mode === 'pokedex' && (
                <>
                  <button onClick={() => setMode('menu')} style={{ marginBottom: '20px' }}>
                    &larr; Voltar ao menu
                  </button>
                  <Pokedex />
                </>
              )}

              {mode === 'battle' && (
                <>
                <button onClick={() => setMode('menu')} style={{ marginBottom: '20px' }}>
                    &larr; Voltar ao Menu
                </button>
                <BattleArena />
                </>
              )}
        </div>
    );
}