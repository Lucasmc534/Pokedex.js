import { useEffect, useRef } from 'react';

export default function BackgroundMusic({ audioSrc, isPlaying, volume = 0.2 }) {
    const audioRef = useRef(null);

        useEffect(() => {
            // O elemento Audio vive fora do DOM React e é criado apenas na primeira renderização.
            if (!audioRef.current) {
                audioRef.current = new Audio(audioSrc);
                audioRef.current.loop = true;
            } else {
                audioRef.current.src = audioSrc;
            }

            const audio = audioRef.current;
            audio.volume = volume;

            if (isPlaying) {
                // O navegador pode bloquear autoplay; o botão de som fornece interação explícita.
                audio.play().catch((err) => {
                    if (err.name !== 'AbortError') {
                        console.warn('Não foi possível iniciar a música. O navegador pode exigir interação.', err);
                    }
                });
            } else {
                audio.pause();
            }

            // Pausar no cleanup evita duas faixas tocando ao trocar de tela ou desmontar.
            return () => {
                audio.pause();
            };
        }, [audioSrc, isPlaying, volume]);

        return null;
}