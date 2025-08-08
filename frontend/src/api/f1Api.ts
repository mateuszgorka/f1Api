export async function sendChatMessage(message: string) {
    const res = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
    });
    return res.json();
}

// Przykład pobierania danych z FastF1 (jeśli jest publiczne API, np. docs.fastf1.dev)
// Jeśli nie, to tutaj byłby kod do pobierania surowych danych bezpośrednio z FastF1 w JS/TS
export async function getSchedule(year: number) {
    // Przykład: fetch z zewnętrznego API FastF1
    const res = await fetch(`https://docs.fastf1.dev/api/schedule/${year}`);
    return res.json();
}

export async function getEvent(year: number, round: number) {
    const res = await fetch(`https://docs.fastf1.dev/api/event/${year}/${round}`);
    return res.json();
}
