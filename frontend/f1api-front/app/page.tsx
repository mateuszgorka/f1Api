'use client';

import { useState, useEffect } from 'react';
import { Trophy, Clock, Flag, MessageCircle, Loader2, Car, Users, TrendingUp, Zap, Timer, Target, BarChart3, GitCompare, ChevronRight, X, Play, Pause, Calendar, MapPin, TrendingDown, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { API_BASE_URL } from '@/src/config';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface Race {
  year: number;
  round: number;
  name: string;
  circuit: string;
  country: string;
  startDate: string;
  endDate: string;
}

interface Session {
  name: string;
  date: string;
  status: 'completed' | 'upcoming' | 'ongoing';
  results?: RaceResult[];
}

interface RaceResult {
  position: number;
  driverCode: string;
  driverName: string;
  team: string;
  time: string;
  gap: string;
  status: string;
  points: number;
  gridPosition: number;
}

interface DriverDetails {
  driverCode: string;
  driverName: string;
  number: number;
  team: string;
  gridPosition: number;
  finishPosition: number;
  fastestLap: string;
  averageLapTime: string;
  totalLaps: number;
  pitStops: {
    lap: number;
    compound: 'SOFT' | 'MEDIUM' | 'HARD' | 'INTERMEDIATE' | 'WET';
    duration: string;
  }[];
  sectors: {
    sector1: string;
    sector2: string;
    sector3: string;
    lapTime: string;
  };
  deltaToLeader: string;
  status: string;
  lapTimes: { lap: number; time: number }[];
}

interface TelemetryData {
  driverCode: string;
  driverName: string;
  bestLapTime: string;
  averageLapTime: string;
  sector1: string;
  sector2: string;
  sector3: string;
  lapTimes: { lap: number; time: number }[];
  sectorComparison: { [key: string]: number[] };
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface Prediction {
  position: string;
  driver: string;
}

export default function F1AIAssistantPro() {
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [raceResults, setRaceResults] = useState<RaceResult[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<DriverDetails | null>(null);
  const [telemetryData, setTelemetryData] = useState<TelemetryData | null>(null);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [isTelemetryModalOpen, setIsTelemetryModalOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [isLoadingRaces, setIsLoadingRaces] = useState(true);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [isLoadingDriver, setIsLoadingDriver] = useState(false);
  const [isLoadingTelemetry, setIsLoadingTelemetry] = useState(false);
  
  // Prediction state
  const [predictions, setPredictions] = useState<Prediction[]>([
    { position: '1', driver: '' },
    { position: '2', driver: '' },
    { position: '3', driver: '' }
  ]);
  const [availableDrivers, setAvailableDrivers] = useState<string[]>([]);
  const [showPredictionForm, setShowPredictionForm] = useState(false);

  useEffect(() => {
    // Initialize messages after component mounts to avoid hydration issues
    setMessages([
      {
        id: '1',
        text: 'Jestem ekspertem F1. Analizuję dane FastF1, strategie, porównuję kierowców i odpowiadam na pytania o wyścigi.',
        isUser: false,
        timestamp: new Date()
      }
    ]);
    fetchRaces();
  }, []);

  const fetchRaces = async () => {
    try {
      setIsLoadingRaces(true);
      const response = await fetch(`${API_BASE_URL}/races`);
      if (!response.ok) throw new Error('Failed to fetch races');
      
      const data = await response.json();
      setRaces(data);
      
      if (data.length > 0) {
        setSelectedRace(data[data.length - 1]); // Select latest race
        fetchSessions(data[data.length - 1].round);
      }
    } catch (error) {
      console.error('Error fetching races:', error);
    } finally {
      setIsLoadingRaces(false);
    }
  };

  const fetchSessions = async (round: number) => {
    try {
      setIsLoadingSessions(true);
      const response = await fetch(`${API_BASE_URL}/races/${round}/sessions`);
      if (!response.ok) throw new Error('Failed to fetch sessions');
      
      const data = await response.json();
      setSessions(data);
      
      // Select the first available session
      if (data.length > 0) {
        setSelectedSession(data[0]);
        if (data[0].results) {
          setRaceResults(data[0].results);
          setAvailableDrivers(data[0].results.map((r: RaceResult) => r.driverCode));
        }
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleRaceSelect = (race: Race) => {
    setSelectedRace(race);
    fetchSessions(race.round);
  };

  const handleSessionSelect = (session: Session) => {
    setSelectedSession(session);
    if (session.results) {
      setRaceResults(session.results);
      setAvailableDrivers(session.results.map(r => r.driverCode));
    } else {
      setRaceResults([]);
      setAvailableDrivers([]);
    }
  };

  const fetchDriverDetails = async (driverCode: string) => {
    try {
      setIsLoadingDriver(true);
      const response = await fetch(`${API_BASE_URL}/driver/${driverCode}`);
      if (!response.ok) throw new Error('Failed to fetch driver details');
      
      const driverDetails: DriverDetails = await response.json();
      setSelectedDriver(driverDetails);
      setIsDriverModalOpen(true);
    } catch (error) {
      console.error('Error fetching driver details:', error);
    } finally {
      setIsLoadingDriver(false);
    }
  };

  const fetchTelemetry = async (driverCode: string) => {
    if (!selectedRace) return;
    
    try {
      setIsLoadingTelemetry(true);
      const response = await fetch(`${API_BASE_URL}/races/${selectedRace.round}/telemetry/${driverCode}`);
      if (!response.ok) throw new Error('Failed to fetch telemetry');
      
      const telemetry: TelemetryData = await response.json();
      setTelemetryData(telemetry);
      setIsTelemetryModalOpen(true);
    } catch (error) {
      console.error('Error fetching telemetry:', error);
    } finally {
      setIsLoadingTelemetry(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoadingChat) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoadingChat(true);

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: inputMessage }),
      });

      if (!response.ok) throw new Error('Network response was not ok');
      
      const data = await response.json();
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.reply || 'Przepraszam, wystąpił błąd podczas analizy danych.',
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Nie mogę się połączyć z serwerem analitycznym. Sprawdź czy backend działa na localhost:8000.',
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  const handlePredictionChange = (position: string, driver: string) => {
    setPredictions(prev => 
      prev.map(p => p.position === position ? { ...p, driver } : p)
    );
  };

  const savePrediction = async () => {
    if (!selectedRace) return;
    
    try {
      const predictionData = {
        round: selectedRace.round,
        predictions: predictions,
        timestamp: new Date().toISOString()
      };
      
      const response = await fetch(`${API_BASE_URL}/races/${selectedRace.round}/prediction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(predictionData),
      });
      
      if (response.ok) {
        // Save to localStorage as backup
        localStorage.setItem(`prediction_${selectedRace.round}`, JSON.stringify(predictionData));
        setShowPredictionForm(false);
      }
    } catch (error) {
      console.error('Error saving prediction:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'Finished': 'default',
      'DNF': 'destructive',
      'DSQ': 'destructive',
      '+1 Lap': 'secondary'
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || 'outline'}>{status}</Badge>;
  };

  const getSessionStatusBadge = (status: string) => {
    const variants = {
      'completed': 'default',
      'ongoing': 'secondary',
      'upcoming': 'outline'
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || 'outline'}>{status}</Badge>;
  };

  const formatChartData = (lapTimes: { lap: number; time: number }[]) => {
    return lapTimes.map(lt => ({
      lap: lt.lap,
      time: Math.round(lt.time * 1000) / 1000
    }));
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🏎️</div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                  F1 AI Assistant Pro
                </h1>
                <p className="text-sm text-muted-foreground">Profesjonalna analiza danych FastF1 + OpenAI</p>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto p-4 space-y-4">
          {/* Recent Races Section - Horizontal Scroll */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Trophy className="w-5 h-5 text-red-500" />
                Najnowsze wyścigi
              </CardTitle>
              <CardDescription>
                Przewiń w poziomie aby zobaczyć więcej wyścigów
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingRaces ? (
                <div className="flex gap-3 overflow-hidden">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-64 flex-shrink-0" />
                  ))}
                </div>
              ) : (
                <ScrollArea className="w-full">
                  <div className="flex gap-3 pb-2 overflow-x-auto">
                    {races.map((race) => (
                      <div
                        key={race.round}
                        className={`p-3 rounded-lg border cursor-pointer transition-all hover:bg-accent/50 min-w-[250px] flex-shrink-0 ${
                          selectedRace?.round === race.round ? 'bg-accent border-red-500' : ''
                        }`}
                        onClick={() => handleRaceSelect(race)}
                      >
                        <div className="space-y-2">
                          <h3 className="font-semibold text-sm">{race.name}</h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            {race.circuit}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {race.startDate}
                          </div>
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-xs">Runda {race.round}</Badge>
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Race Sessions Tabs */}
          {selectedRace && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Flag className="w-5 h-5 text-red-500" />
                  {selectedRace.name}
                </CardTitle>
                <CardDescription>
                  {selectedRace.circuit} • {selectedRace.country}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingSessions ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <Tabs value={selectedSession?.name || 'Free Practice 1'} onValueChange={(value) => {
                    const session = sessions.find(s => s.name === value);
                    if (session) handleSessionSelect(session);
                  }}>
                    <TabsList className="grid w-full grid-cols-5">
                      <TabsTrigger value="Free Practice 1" className="text-xs">FP1</TabsTrigger>
                      <TabsTrigger value="Free Practice 2" className="text-xs">FP2</TabsTrigger>
                      <TabsTrigger value="Free Practice 3" className="text-xs">FP3</TabsTrigger>
                      <TabsTrigger value="Qualifying" className="text-xs">Quali</TabsTrigger>
                      <TabsTrigger value="Race" className="text-xs">Race</TabsTrigger>
                    </TabsList>
                    
                    {sessions.map((session) => (
                      <TabsContent key={session.name} value={session.name} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{session.name}</span>
                            {getSessionStatusBadge(session.status)}
                          </div>
                          <span className="text-sm text-muted-foreground">{session.date}</span>
                        </div>
                        
                        {session.status === 'upcoming' ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>Sesja rozpocznie się {session.date}</p>
                          </div>
                        ) : (session.name === 'Race' && session.status !== 'completed' && session.status !== 'ongoing') ? (
                          <div className="space-y-4">
                            <div className="text-center py-4">
                              <p className="text-muted-foreground mb-4">Typuj TOP3 przed wyścigiem!</p>
                              <Button onClick={() => setShowPredictionForm(true)}>
                                <Award className="w-4 h-4 mr-2" />
                                Typuj wyniki
                              </Button>
                            </div>
                            
                            {showPredictionForm && (
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg">Typowanie TOP3</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                  {predictions.map((pred, index) => (
                                    <div key={pred.position} className="flex items-center gap-3">
                                      <Badge variant="outline" className="w-12">
                                        {pred.position}
                                      </Badge>
                                      <Select value={pred.driver} onValueChange={(value) => handlePredictionChange(pred.position, value)}>
                                        <SelectTrigger className="flex-1">
                                          <SelectValue placeholder="Wybierz kierowcę" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {availableDrivers.map((driver) => (
                                            <SelectItem key={driver} value={driver}>
                                              {driver}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  ))}
                                  <div className="flex gap-2">
                                    <Button onClick={savePrediction} className="flex-1">
                                      Zapisz typowanie
                                    </Button>
                                    <Button variant="outline" onClick={() => setShowPredictionForm(false)}>
                                      Anuluj
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </div>
                        ) : session.results ? (
                          <div className="space-y-3">
                            {session.results.map((result) => (
                              <div
                                key={result.driverCode}
                                className="p-3 rounded-lg border cursor-pointer hover:bg-accent/50"
                                onClick={() => fetchDriverDetails(result.driverCode)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <Badge variant={result.position <= 3 ? 'default' : 'outline'} className="w-8 h-8 flex items-center justify-center">
                                      {result.position}
                                    </Badge>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="font-mono text-xs">
                                          {result.driverCode}
                                        </Badge>
                                        <span className="font-medium text-sm">{result.driverName}</span>
                                      </div>
                                      <p className="text-xs text-muted-foreground">{result.team}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-mono text-sm">{result.time}</p>
                                    <p className="text-xs text-muted-foreground">{result.gap}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <p>Brak wyników dla tej sesji</p>
                          </div>
                        )}
                      </TabsContent>
                    ))}
                  </Tabs>
                )}
              </CardContent>
            </Card>
          )}

          {/* Telemetry Section */}
          {selectedRace && raceResults.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="w-5 h-5 text-red-500" />
                  Telemetria
                </CardTitle>
                <CardDescription>
                  Porównaj czasy okrążeń i sektory kierowców
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="w-full">
                  <div className="flex gap-3 pb-2 min-w-max overflow-x-auto">
                    {raceResults.slice(0, 10).map((result) => (
                      <Button
                        key={result.driverCode}
                        variant="outline"
                        size="sm"
                        onClick={() => fetchTelemetry(result.driverCode)}
                        className="flex-shrink-0"
                      >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        {result.driverCode}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* AI Chat Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageCircle className="w-5 h-5 text-red-500" />
                AI Analyst
              </CardTitle>
              <CardDescription>
                Zadaj pytanie o strategie, analizy FastF1 lub porównania
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScrollArea className="h-64 w-full rounded-md border p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                          message.isUser
                            ? 'bg-red-600 text-white'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        <p>{message.text}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString('pl-PL', { 
                            hour: '2-digit', 
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isLoadingChat && (
                    <div className="flex justify-start">
                      <div className="bg-muted text-foreground px-3 py-2 rounded-lg flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Analizuję dane...</span>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="space-y-2">
                <Textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Jakie strategie miały Red Bull i Ferrari w GP Monako?"
                  disabled={isLoadingChat}
                  className="min-h-[60px]"
                />
                <Button
                  onClick={sendMessage}
                  disabled={isLoadingChat || !inputMessage.trim()}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  {isLoadingChat ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Zap className="w-4 h-4 mr-2" />
                  )}
                  Zadaj pytanie AI
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Driver Details Modal */}
        <Dialog open={isDriverModalOpen} onOpenChange={setIsDriverModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Car className="w-5 h-5 text-red-500" />
                Szczegóły kierowcy - FastF1 Data
              </DialogTitle>
              <DialogDescription>
                Kompletna analiza danych telemetrycznych z wyścigu
              </DialogDescription>
            </DialogHeader>
            
            {isLoadingDriver ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
            ) : selectedDriver && (
              <div className="space-y-6">
                {/* Driver Header */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Kierowca</p>
                    <p className="font-bold text-lg">{selectedDriver.driverCode}</p>
                    <p className="text-sm">{selectedDriver.driverName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Numer</p>
                    <p className="font-bold text-lg">#{selectedDriver.number}</p>
                    <p className="text-sm">{selectedDriver.team}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pozycje</p>
                    <p className="font-bold text-lg">
                      {selectedDriver.gridPosition} → {selectedDriver.finishPosition}
                    </p>
                    <p className="text-sm">Start → Koniec</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-bold text-lg">{selectedDriver.status}</p>
                    <p className="text-sm">{selectedDriver.deltaToLeader}</p>
                  </div>
                </div>

                {/* Tabs with detailed data */}
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Przegląd</TabsTrigger>
                    <TabsTrigger value="tempo">Tempo</TabsTrigger>
                    <TabsTrigger value="strategy">Strategia</TabsTrigger>
                    <TabsTrigger value="sectors">Sektory</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Timer className="w-4 h-4" />
                            Najlepszy czas
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold font-mono">{selectedDriver.fastestLap}</p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <BarChart3 className="w-4 h-4" />
                            Średni czas
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold font-mono">{selectedDriver.averageLapTime}</p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            Okrążenia
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold">{selectedDriver.totalLaps}</p>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="tempo" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Wykres tempa (czas vs okrążenie)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={formatChartData(selectedDriver.lapTimes)}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="lap" />
                              <YAxis />
                              <RechartsTooltip />
                              <Line type="monotone" dataKey="time" stroke="#ef4444" strokeWidth={2} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="strategy" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Pit stopy i strategia opon</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {selectedDriver.pitStops.map((stop, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                              <div className="flex items-center gap-3">
                                <Badge variant="outline">Okrążenie {stop.lap}</Badge>
                                <div className={`w-4 h-4 rounded-full ${
                                  stop.compound === 'SOFT' ? 'bg-red-500' :
                                  stop.compound === 'MEDIUM' ? 'bg-yellow-500' :
                                  stop.compound === 'HARD' ? 'bg-gray-300' :
                                  stop.compound === 'INTERMEDIATE' ? 'bg-green-500' :
                                  'bg-blue-500'
                                }`} />
                                <span className="font-medium">{stop.compound}</span>
                              </div>
                              <span className="font-mono">{stop.duration}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="sectors" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Najlepsze okrążenie - czasy sektorów</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-4 gap-4">
                          <div className="text-center p-4 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">Sektor 1</p>
                            <p className="text-xl font-bold font-mono">{selectedDriver.sectors.sector1}</p>
                          </div>
                          <div className="text-center p-4 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">Sektor 2</p>
                            <p className="text-xl font-bold font-mono">{selectedDriver.sectors.sector2}</p>
                          </div>
                          <div className="text-center p-4 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">Sektor 3</p>
                            <p className="text-xl font-bold font-mono">{selectedDriver.sectors.sector3}</p>
                          </div>
                          <div className="text-center p-4 bg-red-600 text-white rounded-lg">
                            <p className="text-sm opacity-90">Czas okrążenia</p>
                            <p className="text-xl font-bold font-mono">{selectedDriver.sectors.lapTime}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Telemetry Modal */}
        <Dialog open={isTelemetryModalOpen} onOpenChange={setIsTelemetryModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-red-500" />
                Telemetria kierowcy
              </DialogTitle>
              <DialogDescription>
                Szczegółowa analiza czasów okrążeń i sektorów
              </DialogDescription>
            </DialogHeader>
            
            {isLoadingTelemetry ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
            ) : telemetryData && (
              <div className="space-y-6">
                {/* Driver Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Kierowca</p>
                    <p className="font-bold text-lg">{telemetryData.driverCode}</p>
                    <p className="text-sm">{telemetryData.driverName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Najlepszy czas</p>
                    <p className="font-bold text-lg font-mono">{telemetryData.bestLapTime}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Średni czas</p>
                    <p className="font-bold text-lg font-mono">{telemetryData.averageLapTime}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Okrążeń</p>
                    <p className="font-bold text-lg">{telemetryData.lapTimes.length}</p>
                  </div>
                </div>

                {/* Sector Times */}
                <Card>
                  <CardHeader>
                    <CardTitle>Czasy sektorów najlepszego okrążenia</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Sektor 1</p>
                        <p className="text-xl font-bold font-mono">{telemetryData.sector1}</p>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Sektor 2</p>
                        <p className="text-xl font-bold font-mono">{telemetryData.sector2}</p>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Sektor 3</p>
                        <p className="text-xl font-bold font-mono">{telemetryData.sector3}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Lap Times Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Wykres czasów okrążeń</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={formatChartData(telemetryData.lapTimes)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="lap" />
                          <YAxis />
                          <RechartsTooltip />
                          <Line type="monotone" dataKey="time" stroke="#ef4444" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Sector Comparison */}
                <Card>
                  <CardHeader>
                    <CardTitle>Porównanie sektorów</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { sector: 'Sektor 1', time: telemetryData.sectorComparison.sector1[0] || 0 },
                          { sector: 'Sektor 2', time: telemetryData.sectorComparison.sector2[0] || 0 },
                          { sector: 'Sektor 3', time: telemetryData.sectorComparison.sector3[0] || 0 }
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="sector" />
                          <YAxis />
                          <RechartsTooltip />
                          <Bar dataKey="time" fill="#ef4444" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
