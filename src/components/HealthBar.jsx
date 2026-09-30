export default function HealthBar({ hp, maxHp }) {
    // Limita o valor visual ao intervalo da barra e evita divisão por zero.
    const hpPercentage = maxHp > 0 ? Math.min(100, Math.max(0, (hp / maxHp) * 100)) : 0;

    // Define a cor da barra com base na porcentagem da vida
    let barColor = '#4caf50'; // Verde (Saudável)
    if (hpPercentage <= 20) {
        barColor = '#f44336'; //Vermelho (Perigo)
    } else if (hpPercentage <= 50) {
        barColor = '#ffc107'; //Amarelo (Atenção)
    }

    return (
        <div className='health-bar-container' style={styles.container}>
            {/* Texto do HP */}
            <div style={styles.text}>
                HP: {hp} / {maxHp}
            </div>
            {/* O fundo cinza da barra */}
            <div
                role="progressbar"
                aria-label="Pontos de vida"
                aria-valuemin={0}
                aria-valuemax={maxHp}
                aria-valuenow={Math.min(maxHp, Math.max(0, hp))}
                style={styles.background}
            >
                {/* A barra colorida que diminui*/}
                <div
                    style={{
                        ...styles.fill,
                        width: `${hpPercentage}%`,
                        backgroundColor: barColor
                    }}
                    />
        </div>
        </div>
    );
}

// Estilos inline (preferência minha de colocar aqui)
const styles = {
    container: {
        width: 'min(100%, 250px)',
        margin: '10px 0',
        fontFamily: 'monospace'
    },
    text: {
        fontSize: '14px',
        fontWeight: 'bold',
        marginBottom: '4px',
        textAlign: 'right'
    },
    background: {
        width: '100%',
        height: '16px',
        backgroundColor: '#e0e0e0',
        border: '2px solid #333',
        borderRadius: '8px',
        overflow: 'hidden'
    },
    fill: {
        height: '100%',
        transition: 'width 0.4s ease-in-out, background-color 0.4s ease-in-out'
    }
};