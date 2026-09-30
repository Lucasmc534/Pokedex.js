export const playSound = (soundPath, volume = 0.5) => {
    const sound = new Audio(soundPath);
    sound.volume = volume;

    // Evitar erro de audio
    sound.play().catch((err) => console.log("Erro ao tocar som", err));
};