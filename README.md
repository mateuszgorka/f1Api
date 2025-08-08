# F1 API Assistant Pro

Aplikacja do analizy danych Formuły 1 z integracją AI, wykorzystująca FastF1, Flask, React i OpenAI.

## Struktura projektu

```
f1Api/
├── backend/          # Backend Flask + FastF1 + OpenAI
├── frontend/         # Frontend React + TypeScript + shadcn/ui
└── README.md
```

## Wymagania

### Backend
- Python 3.8+
- Klucz OpenAI API

### Frontend
- Node.js 18+
- npm

## Instalacja i uruchomienie

### 1. Backend

```bash
cd backend

# Zainstaluj zależności
pip install -r requirements.txt

# Utwórz plik .env z kluczem OpenAI
echo "OPENAI_API_KEY=your_openai_api_key_here" > .env

# Uruchom serwer
python app.py
```

Backend będzie dostępny na `http://localhost:5000`

### 2. Frontend

```bash
cd frontend/f1api-front

# Zainstaluj zależności
npm install

# Uruchom aplikację
npm run dev
```

Frontend będzie dostępny na `http://localhost:3000`

## Endpointy API

### GET /results
Zwraca wyniki ostatniego wyścigu F1 z FastF1.

### GET /driver/<code>
Zwraca szczegółowe statystyki kierowcy:
- Pozycja startowa i końcowa
- Najlepsze okrążenie
- Średni czas okrążenia
- Liczba okrążeń
- Liczba pit stopów
- Czasy sektorów najlepszego okrążenia
- Stinty i ich czasy

### POST /chat
Wysyła wiadomość do AI i zwraca odpowiedź.

## Funkcjonalności

- **Najnowsze wyniki**: Pobiera dane z FastF1 API
- **Szczegóły kierowcy**: Kliknięcie kierowcy pokazuje szczegółowe statystyki
- **Czat AI**: Integracja z OpenAI GPT-4o-mini do analizy danych F1
- **Responsywny design**: Działa na mobile i desktop
- **Fallback data**: Mock dane gdy API nie jest dostępne

## Technologie

### Backend
- Flask
- FastF1 3.6.0
- OpenAI API
- Flask-CORS
- pandas, numpy

### Frontend
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui
- Next.js 14
