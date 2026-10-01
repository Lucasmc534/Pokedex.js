import { useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import BattleArena from './components/BattleArena.jsx';
import BackgroundMusic from './components/BackgroundMusic';
import Pokedex from './components/Pokedex.jsx';

const musicByPath = {
  '/': '/audio/menu-theme.mp3',
  '/pokedex': '/audio/pokedex-theme.mp3.mp3',
  '/batalha': '/audio/batlle-theme.mp3'
};

function BackToMenu({ children }) {
  return (
    <>
      <Link className="button-link page-back" to="/">
        &larr; Voltar ao menu
      </Link>
      {children}
    </>
  );
}

export default function App() {
  // O Router fornece o caminho atual; não duplicamos a navegação em useState.
  const { pathname } = useLocation();
  // Começar sem áudio respeita a política de autoplay dos navegadores.
  const [soundEnabled, setSoundEnabled] = useState(false);
  const currentMusic = musicByPath[pathname] ?? musicByPath['/'];

  return (
    <div className="app-container">
      {/* A música acompanha a rota ativa, e o controle permanece disponível em todas as telas. */}
      <BackgroundMusic
        audioSrc={currentMusic}
        isPlaying={soundEnabled}
        volume={0.2}
      />

      <button
        className="sound-toggle-btn"
        aria-pressed={soundEnabled}
        onClick={() => setSoundEnabled((enabled) => !enabled)}
      >
        {soundEnabled ? '🔊 Som ON' : '🔇Som OFF'}
      </button>

      <Routes>
        <Route
          path="/"
          element={(
            <main className="menu-container">
              <h1>Escolha o seu Modo</h1>
              <Link className="button-link" to="/pokedex">Abrir Pokédex</Link>
              <Link className="button-link" to="/batalha" onClick={() => setSoundEnabled(true)}>
                Batalha Aleatória
              </Link>
            </main>
          )}
        />
        <Route path="/pokedex" element={<BackToMenu><Pokedex /></BackToMenu>} />
        <Route path="/batalha" element={<BackToMenu><BattleArena /></BackToMenu>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}