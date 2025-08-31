# F1 API Assistant Pro 🏎️

Profesjonalna aplikacja do analizy danych FastF1 z integracją OpenAI API. Aplikacja umożliwia analizę wyników wyścigów, szczegółowe statystyki kierowców, telemetrię w czasie rzeczywistym oraz interaktywne pytania do AI o strategie F1.

## 🚀 Szybki Start

### 1. Konfiguracja środowiska

```bash
# Skopiuj plik z przykładowymi zmiennymi środowiskowymi
cp backend/.env.example backend/.env

# Edytuj plik .env i dodaj swój klucz OpenAI API
# OPENAI_API_KEY=sk-your-actual-api-key-here
```

### 2. Uruchomienie z Docker

```bash
# Zbuduj i uruchom kontenery
docker-compose up --build

# Aplikacja będzie dostępna na:
# - PC: http://localhost:8000
# - Telefon: http://<IP_KOMPUTERA>:8000
```

### 3. Dostęp z telefonu w tej samej sieci WiFi

1. **Sprawdź IP komputera:**
   ```bash
   # Windows
   ipconfig
   
   # Linux/Mac
   ifconfig
   ```

2. **Znajdź swój lokalny adres IP** (np. `192.168.1.100`)

3. **Na telefonie** otwórz przeglądarkę i wejdź na:
   ```
   http://192.168.1.100:8000
   ```

## 🏗️ Architektura

- **Backend**: FastAPI + Uvicorn na porcie 8000
- **Frontend**: Next.js z TypeScript + Recharts dla wykresów
- **Dane**: FastF1 API (automatyczne pobieranie najnowszych danych)
- **AI**: OpenAI GPT-4o-mini dla analiz strategicznych
- **Cache**: Automatyczne czyszczenie przy starcie kontenera
- **Mobile**: Responsywny design zoptymalizowany pod telefony

## 📱 Funkcje mobilne

### Layout responsywny
- **Horizontal scroll** dla listy wyścigów
- **Karty kierowców** - łatwe do tapnięcia na telefonie
- **Zakładki sesji** - FP1, FP2, FP3, Quali, Race
- **Wykresy telemetrii** z możliwością przewijania w poziomie

### Telemetria i analiza
- **Czasy okrążeń** w czasie rzeczywistym
- **Porównanie sektorów** między kierowcami
- **Wykresy liniowe** i słupkowe (Recharts)
- **Dane FastF1** bez mocków

### System typowania
- **Predykcje TOP3** przed wyścigiem
- **Zapisywanie lokalne** w przeglądarce
- **Porównanie z wynikami** po zakończeniu

## 📁 Struktura projektu

```
f1Api-1/
├── backend/
│   ├── main.py              # FastAPI aplikacja z nowymi endpointami
│   ├── requirements.txt     # Python dependencies
│   ├── Dockerfile          # Docker image
│   ├── .env.example        # Przykład zmiennych środowiskowych
│   ├── start.sh            # Skrypt startowy
│   └── cache/              # FastF1 cache (automatycznie czyszczony)
├── frontend/
│   └── f1api-front/        # Next.js aplikacja z Recharts
├── docker-compose.yml       # Orchestracja kontenerów
├── test_api.py             # Skrypt testowy API
└── README.md               # Ten plik
```

## 🔧 Konfiguracja

### Zmienne środowiskowe (.env)

```bash
# OpenAI API Configuration
OPENAI_API_KEY=your_actual_api_key_here

# FastAPI Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=false

# FastF1 Configuration
CACHE_ENABLED=true
CACHE_DIR=cache
```

### Porty

- **Backend**: 8000 (dostępny z zewnątrz)
- **Frontend**: 3000 (tylko lokalnie)

## 🐳 Docker

### Budowanie obrazu

```bash
# Zbuduj obraz backend
docker build -t f1api-backend ./backend

# Lub użyj docker-compose
docker-compose build
```

### Uruchomienie

```bash
# Uruchom wszystkie usługi
docker-compose up

# Uruchom w tle
docker-compose up -d

# Zatrzymaj usługi
docker-compose down
```

### Zarządzanie kontenerami

```bash
# Sprawdź status
docker-compose ps

# Zobacz logi
docker-compose logs -f f1api-backend

# Restart usługi
docker-compose restart f1api-backend
```

## 📊 API Endpoints

### Podstawowe
- `GET /health` - Sprawdzenie stanu aplikacji
- `GET /races` - Lista wszystkich wyścigów w sezonie

### Sesje i wyniki
- `GET /races/{round}/sessions` - Wszystkie sesje dla wyścigu (FP1, FP2, FP3, Quali, Race)
- `GET /results` - Wyniki ostatniego wyścigu (legacy)

### Kierowcy i telemetria
- `GET /driver/{driver_code}` - Szczegóły kierowcy
- `GET /races/{round}/telemetry/{driver_code}` - **NOWE** Telemetria kierowcy (czasy, sektory, wykresy)

### Predykcje
- `POST /races/{round}/prediction` - **NOWE** Zapisz typowanie TOP3
- `GET /races/{round}/prediction` - **NOWE** Pobierz typowanie

### AI Chat
- `POST /chat` - Interaktywny chat z OpenAI AI

## 📱 Użycie na mobilu

### Telemetria i wykresy
1. **Wybierz wyścig** z poziomej listy
2. **Przejdź do zakładki Race** aby zobaczyć wyniki
3. **Kliknij przycisk telemetrii** przy kierowcy (ikona wykresu)
4. **Przewiń wykresy w poziomie** na telefonie

### Typowanie wyników
1. **Wybierz przyszły wyścig** (status "upcoming")
2. **Kliknij "Typuj wyniki"** w zakładce Race
3. **Wybierz TOP3** z dropdownów
4. **Zapisz typowanie** - będzie dostępne po zakończeniu wyścigu

### Responsywny design
- **Karty kierowców** - większe, łatwiejsze do tapnięcia
- **Poziome przewijanie** - dla list wyścigów i telemetrii
- **Zakładki sesji** - kompaktowe, zoptymalizowane pod mobile
- **Wykresy** - automatycznie dostosowują się do ekranu

## 🧹 Czyszczenie danych

### Automatyczne czyszczenie cache

Cache FastF1 jest automatycznie czyszczony przy każdym starcie kontenera, zapewniając świeże dane.

### Ręczne czyszczenie

```bash
# Wyczyść cache FastF1
docker exec f1api-backend rm -rf /app/cache/*

# Restart kontenera
docker-compose restart f1api-backend
```

## 🔍 Rozwiązywanie problemów

### Problem: Aplikacja nie startuje

```bash
# Sprawdź logi
docker-compose logs f1api-backend

# Sprawdź czy port 8000 jest wolny
netstat -an | findstr :8000  # Windows
netstat -an | grep :8000     # Linux/Mac
```

### Problem: Brak dostępu z telefonu

1. **Sprawdź firewall** - port 8000 musi być otwarty
2. **Sprawdź sieć** - telefon i komputer muszą być w tej samej sieci WiFi
3. **Sprawdź IP** - użyj `ipconfig`/`ifconfig` aby znaleźć aktualne IP

### Problem: Błąd OpenAI API

1. **Sprawdź klucz API** w pliku `.env`
2. **Sprawdź saldo** konta OpenAI
3. **Sprawdź logi** aplikacji

### Problem: Wykresy nie działają

1. **Sprawdź czy Recharts jest zainstalowane** - `npm install recharts`
2. **Sprawdź konsolę przeglądarki** pod kątem błędów JavaScript
3. **Sprawdź czy dane telemetrii** są poprawnie pobierane z API

## 🚀 Rozwój

### Lokalne uruchomienie (bez Dockera)

```bash
# Backend
cd backend
pip install -r requirements.txt
python main.py

# Frontend
cd frontend/f1api-front
npm install
npm run dev
```

### Dodawanie nowych endpointów

1. Dodaj nową funkcję w `main.py`
2. Dodaj dekorator `@app.get()` lub `@app.post()`
3. Zdefiniuj model Pydantic dla request/response
4. Przetestuj w Docker

### Dodawanie nowych wykresów

1. **Importuj komponenty** z Recharts
2. **Przygotuj dane** w formacie `{x: value, y: value}`
3. **Użyj ResponsiveContainer** dla responsywności
4. **Dodaj obsługę błędów** dla pustych danych

## 📝 Licencja

Projekt edukacyjny - do użytku osobistego i naukowego.

## 🤝 Wsparcie

W przypadku problemów:
1. Sprawdź logi Docker: `docker-compose logs`
2. Sprawdź czy wszystkie zmienne środowiskowe są ustawione
3. Upewnij się że port 8000 jest dostępny
4. Sprawdź połączenie internetowe (dla FastF1 i OpenAI API)
5. Sprawdź konsolę przeglądarki pod kątem błędów JavaScript
6. Upewnij się że Recharts jest poprawnie zainstalowane

## 🆕 Co nowego w tej wersji

- ✅ **Mobile-first design** - zoptymalizowany pod telefony
- ✅ **Zakładki sesji** - FP1, FP2, FP3, Quali, Race
- ✅ **Telemetria w czasie rzeczywistym** - czasy okrążeń i sektory
- ✅ **Wykresy interaktywne** - Recharts dla analizy danych
- ✅ **System typowania** - predykcje TOP3 przed wyścigiem
- ✅ **Poziome przewijanie** - dla list wyścigów i telemetrii
- ✅ **Responsywne karty** - łatwiejsze do tapnięcia na mobile
- ✅ **Automatyczne wiadomości systemowe** - ekspert F1 na starcie czatu
