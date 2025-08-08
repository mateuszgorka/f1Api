'use client';

import { useState, useEffect } from 'react';
import { Trophy, Clock, Flag, MessageCircle, Loader2, Car, Users, TrendingUp, Zap, Timer, Target, BarChart3, GitCompare, ChevronRight, X, Play, Pause } from 'lucide-react';
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

interface Race {
  id: string;
  name: string;
  circuit: string;
  date: string;
  country: string;
  round: number;
}

interface RaceResult {
  position: number;
  driverCode: string;
  driverName: string;
  team: string;
  time: string;
  gap: string;
  status: 'Finished' | 'DNF' | 'DSQ' | '+1 Lap';
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

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function F1AIAssistantPro() {
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);
  const [raceResults, setRaceResults] = useState<RaceResult[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<DriverDetails | null>(null);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [isLoadingRaces, setIsLoadingRaces] = useState(true);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [isLoadingDriver, setIsLoadingDriver] = useState(false);
  
  // Comparison panel state
  const [compareDriver1, setCompareDriver1] = useState<string>('');
  const [compareDriver2, setCompareDriver2] = useState<string>('');
  const [comparisonData, setComparisonData] = useState<any>(null);

  // Mock data - w prawdziwej aplikacji pobierane z API
  const mockRaces: Race[] = [
    { id: '1', name: 'Monaco Grand Prix', circuit: 'Circuit de Monaco', date: '2024-05-26', country: 'Monaco', round: 8 },
    { id: '2', name: 'Spanish Grand Prix', circuit: 'Circuit de Barcelona-Catalunya', date: '2024-06-23', country: 'Spain', round: 10 },
    { id: '3', name: 'Canadian Grand Prix', circuit: 'Circuit Gilles Villeneuve', date: '2024-06-09', country: 'Canada', round: 9 },
  ];

  const mockRaceResults: RaceResult[] = [
    { position: 1, driverCode: 'LEC', driverName: 'Charles Leclerc', team: 'Ferrari', time: '2:23:15.554', gap: '', status: 'Finished', points: 25, gridPosition: 1 },
    { position: 2, driverCode: 'PIA', driverName: 'Oscar Piastri', team: 'McLaren', time: '2:23:16.301', gap: '+0.747', status: 'Finished', points: 18, gridPosition: 2 },
    { position: 3, driverCode: 'SAI', driverName: 'Carlos Sainz', team: 'Ferrari', time: '2:23:17.892', gap: '+2.338', status: 'Finished', points: 15, gridPosition: 3 },
    { position: 4, driverCode: 'NOR', driverName: 'Lando Norris', team: 'McLaren', time: '2:23:25.847', gap: '+10.293', status: 'Finished', points: 12, gridPosition: 5 },
    { position: 5, driverCode: 'RUS', driverName: 'George Russell', team: 'Mercedes', time: '2:23:28.133', gap: '+12.579', status: 'Finished', points: 10, gridPosition: 4 },
    { position: 6, driverCode: 'VER', driverName: 'Max Verstappen', team: 'Red Bull Racing', time: '2:23:35.478', gap: '+19.924', status: 'Finished', points: 8, gridPosition: 6 },
    { position: 7, driverCode: 'HAM', driverName: 'Lewis Hamilton', team: 'Mercedes', time: '2:23:47.567', gap: '+32.013', status: 'Finished', points: 6, gridPosition: 7 },
    { position: 8, driverCode: 'GAS', driverName: 'Pierre Gasly', team: 'Alpine', time: '2:24:12.890', gap: '+57.336', status: 'Finished', points: 4, gridPosition: 8 },
    { position: 9, driverCode: 'ALO', driverName: 'Fernando Alonso', team: 'Aston Martin', time: '2:24:15.234', gap: '+59.680', status: 'Finished', points: 2, gridPosition: 9 },
    { position: 10, driverCode: 'OCO', driverName: 'Esteban Ocon', team: 'Alpine', time: '2:24:18.567', gap: '+1:03.013', status: 'Finished', points: 1, gridPosition: 10 },
  ];

  useEffect(() => {
    // Initialize messages after component mounts to avoid hydration issues
    setMessages([
      {
        id: '1',
        text: 'Witaj w F1 AI Assistant Pro! Mogę analizować dane z FastF1, porównywać kierowców i odpowiadać na pytania o strategie wyścigowe. Zadaj mi pytanie!',
        isUser: false,
        timestamp: new Date()
      }
    ]);
    fetchRaces();
  }, []);

  const fetchRaces = async () => {
    try {
      setIsLoadingRaces(true);
      const response = await fetch(`${API_BASE_URL}/results`);
      if (!response.ok) throw new Error('Failed to fetch results');
      
      const data = await response.json();
      setRaceResults(data.results);
      
      // Create race object from the response
      const race: Race = {
        id: `${data.race.year}-${data.race.round}`,
        name: data.race.name,
        circuit: data.race.circuit,
        date: new Date().toISOString().split('T')[0], // Current date as fallback
        country: data.race.circuit,
        round: data.race.round
      };
      setRaces([race]);
      setSelectedRace(race);
    } catch (error) {
      console.error('Error fetching results:', error);
      // Fallback to mock data
      setRaces(mockRaces);
    } finally {
      setIsLoadingRaces(false);
    }
  };

  const fetchRaceResults = async (raceId: string) => {
    try {
      setIsLoadingResults(true);
      const response = await fetch(`${API_BASE_URL}/results`);
      if (!response.ok) throw new Error('Failed to fetch results');
      
      const data = await response.json();
      setRaceResults(data.results);
    } catch (error) {
      console.error('Error fetching race results:', error);
      // Fallback to mock data
      setRaceResults(mockRaceResults);
    } finally {
      setIsLoadingResults(false);
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
      // Fallback to mock data
      const mockDriverDetails: DriverDetails = {
        driverCode: driverCode,
        driverName: mockRaceResults.find(r => r.driverCode === driverCode)?.driverName || '',
        number: driverCode === 'LEC' ? 16 : driverCode === 'VER' ? 1 : 4,
        team: mockRaceResults.find(r => r.driverCode === driverCode)?.team || '',
        gridPosition: mockRaceResults.find(r => r.driverCode === driverCode)?.gridPosition || 1,
        finishPosition: mockRaceResults.find(r => r.driverCode === driverCode)?.position || 1,
        fastestLap: '1:12.345',
        averageLapTime: '1:14.567',
        totalLaps: 78,
        pitStops: [
          { lap: 18, compound: 'MEDIUM', duration: '2.3s' },
          { lap: 42, compound: 'HARD', duration: '2.1s' },
        ],
        sectors: {
          sector1: '23.456',
          sector2: '28.789',
          sector3: '20.100',
          lapTime: '1:12.345'
        },
        deltaToLeader: driverCode === 'LEC' ? '0.000' : '+0.747',
        status: 'Finished',
        lapTimes: Array.from({ length: 78 }, (_, i) => ({
          lap: i + 1,
          time: 72.5 + Math.random() * 3 - 1.5
        }))
      };
      
      setSelectedDriver(mockDriverDetails);
      setIsDriverModalOpen(true);
    } finally {
      setIsLoadingDriver(false);
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
        text: 'Nie mogę się połączyć z serwerem analitycznym. Sprawdź czy backend działa na localhost:5000.',
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  const handleRaceSelect = (race: Race) => {
    setSelectedRace(race);
    fetchRaceResults(race.id);
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

  const getCompoundColor = (compound: string) => {
    const colors = {
      'SOFT': 'bg-red-500',
      'MEDIUM': 'bg-yellow-500',
      'HARD': 'bg-gray-300',
      'INTERMEDIATE': 'bg-green-500',
      'WET': 'bg-blue-500'
    };
    return colors[compound as keyof typeof colors] || 'bg-gray-500';
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center gap-4">
              <div className="text-4xl">🏎️</div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                  F1 AI Assistant Pro
                </h1>
                <p className="text-muted-foreground">Profesjonalna analiza danych FastF1 + OpenAI</p>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto p-4 space-y-6">
          {/* Recent Races Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-red-500" />
                Najnowsze wyścigi
              </CardTitle>
              <CardDescription>
                Wybierz wyścig aby zobaczyć szczegółowe wyniki i analizy FastF1
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingRaces ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-3">
                  {races.map((race) => (
                    <div
                      key={race.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-all hover:bg-accent/50 ${
                        selectedRace?.id === race.id ? 'bg-accent border-red-500' : ''
                      }`}
                      onClick={() => handleRaceSelect(race)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{race.name}</h3>
                          <p className="text-sm text-muted-foreground">{race.circuit} • {race.country}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Runda {race.round}</Badge>
                          <span className="text-sm text-muted-foreground">{race.date}</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Race Results */}
            <div className="lg:col-span-2 space-y-6">
              {selectedRace && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Flag className="w-5 h-5 text-red-500" />
                      Wyniki: {selectedRace.name}
                    </CardTitle>
                    <CardDescription>
                      Top 10 kierowców • Kliknij kierowcę aby zobaczyć szczegóły FastF1
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingResults ? (
                      <div className="space-y-2">
                        {[...Array(10)].map((_, i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">Poz</TableHead>
                            <TableHead>Kierowca</TableHead>
                            <TableHead>Zespół</TableHead>
                            <TableHead>Czas</TableHead>
                            <TableHead>Strata</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-12">Pkt</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {raceResults.map((result) => (
                            <TableRow 
                              key={result.driverCode}
                              className="cursor-pointer hover:bg-accent/50"
                              onClick={() => fetchDriverDetails(result.driverCode)}
                            >
                              <TableCell className="font-bold">
                                <Badge variant={result.position <= 3 ? 'default' : 'outline'}>
                                  {result.position}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="font-mono">
                                    {result.driverCode}
                                  </Badge>
                                  <span className="font-medium">{result.driverName}</span>
                                </div>
                              </TableCell>
                              <TableCell>{result.team}</TableCell>
                              <TableCell className="font-mono">{result.time}</TableCell>
                              <TableCell className="font-mono text-muted-foreground">
                                {result.gap}
                              </TableCell>
                              <TableCell>{getStatusBadge(result.status)}</TableCell>
                              <TableCell className="font-bold">{result.points}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Driver Comparison Panel */}
              {selectedRace && raceResults.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GitCompare className="w-5 h-5 text-red-500" />
                      Porównanie kierowców
                    </CardTitle>
                    <CardDescription>
                      Porównaj dane FastF1 dwóch kierowców z wyścigu
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Select value={compareDriver1} onValueChange={setCompareDriver1}>
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz kierowcę 1" />
                        </SelectTrigger>
                        <SelectContent>
                          {raceResults.map((result) => (
                            <SelectItem key={result.driverCode} value={result.driverCode}>
                              {result.driverCode} - {result.driverName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select value={compareDriver2} onValueChange={setCompareDriver2}>
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz kierowcę 2" />
                        </SelectTrigger>
                        <SelectContent>
                          {raceResults.map((result) => (
                            <SelectItem key={result.driverCode} value={result.driverCode}>
                              {result.driverCode} - {result.driverName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {compareDriver1 && compareDriver2 && (
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div className="space-y-2">
                          <h4 className="font-semibold">{compareDriver1}</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Średni czas:</span>
                              <span className="font-mono">1:14.567</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Najlepszy czas:</span>
                              <span className="font-mono">1:12.345</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Pit stopy:</span>
                              <span>2</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="font-semibold">{compareDriver2}</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Średni czas:</span>
                              <span className="font-mono">1:14.892</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Najlepszy czas:</span>
                              <span className="font-mono">1:12.678</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Pit stopy:</span>
                              <span>2</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* AI Chat Section */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
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
                                minute: '2-digit', 
                                second: '2-digit' 
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
          </div>
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
                        <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                          <p className="text-muted-foreground">Wykres czasów okrążeń FastF1</p>
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
                                <div className={`w-4 h-4 rounded-full ${getCompoundColor(stop.compound)}`} />
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
      </div>
    </TooltipProvider>
  );
}
