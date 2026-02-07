import React, { useState, useEffect } from 'react';
import { Upload, TrendingUp, DollarSign, BarChart3, Calendar, Download, Plus, X, Filter as FilterIcon, TrendingDown, Edit2, Tag, Target, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Cell } from 'recharts';

const TradingJournal = () => {
  const [trades, setTrades] = useState([]);
  const [filteredTrades, setFilteredTrades] = useState([]);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [uploadNotification, setUploadNotification] = useState(null);
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [dateRange, setDateRange] = useState('all');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const tradesPerPage = 25;
  const [availableTags, setAvailableTags] = useState(['Breakout', 'Reversal', 'Trend Following', 'Scalp', 'Swing', 'News']);
  const [selectedTags, setSelectedTags] = useState([]);
  const [editingTrade, setEditingTrade] = useState(null);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [dailyGoals, setDailyGoals] = useState({ maxLoss: 500, targetProfit: 1000, maxTrades: 10 });
  const [showImageModal, setShowImageModal] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('tradingJournalData');
    if (stored) {
      const parsed = JSON.parse(stored);
      setTrades(parsed);
      setFilteredTrades(parsed);
    }
    
    const storedTags = localStorage.getItem('availableTags');
    if (storedTags) {
      setAvailableTags(JSON.parse(storedTags));
    }

    const storedGoals = localStorage.getItem('dailyGoals');
    if (storedGoals) {
      setDailyGoals(JSON.parse(storedGoals));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('tradingJournalData', JSON.stringify(trades));
  }, [trades]);

  useEffect(() => {
    localStorage.setItem('availableTags', JSON.stringify(availableTags));
  }, [availableTags]);

  useEffect(() => {
    localStorage.setItem('dailyGoals', JSON.stringify(dailyGoals));
  }, [dailyGoals]);

  const parseCSV = (text) => {
    const lines = text.replace(/\r\n/g, '\n').split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\r/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/\r/g, ''));
      const trade = {};
      
      headers.forEach((header, index) => {
        trade[header] = values[index] || '';
      });

      const parsePnL = (pnlStr) => {
        if (!pnlStr) return 0;
        let cleanStr = pnlStr.replace(/\$/g, '').replace(/\s/g, '');
        if (cleanStr.startsWith('(') && cleanStr.endsWith(')')) {
          cleanStr = '-' + cleanStr.slice(1, -1);
        }
        return parseFloat(cleanStr) || 0;
      };

      const formatDate = (timestamp) => {
        if (!timestamp) return '';
        return timestamp.split(' ')[0] || timestamp;
      };

      let side = 'unknown';
      if (trade.boughttimestamp && trade.soldtimestamp) {
        const buyId = parseInt(trade.buyfillid || 0);
        const sellId = parseInt(trade.sellfillid || 0);
        side = buyId < sellId ? 'long' : 'short';
      }

      const normalizedTrade = {
        id: trade.id || trade.trade_id || trade.buyfillid || `trade_${Date.now()}_${i}`,
        date: formatDate(trade.boughttimestamp || trade.soldtimestamp || trade.date || trade.entry_date || trade.trade_date || ''),
        symbol: trade.symbol || trade.ticker || trade.stock || '',
        side: trade.side || side,
        quantity: parseFloat(trade.quantity || trade.qty || trade.shares || trade.size || 0),
        entryPrice: parseFloat(trade.entry_price || trade.buyprice || trade.entry || trade.buy_price || 0),
        exitPrice: parseFloat(trade.exit_price || trade.sellprice || trade.exit || trade.sell_price || 0),
        pnl: parsePnL(trade.pnl || trade.profit_loss || trade.profit || '0'),
        fees: parseFloat(trade.fees || trade.commission || 0),
        notes: trade.notes || trade.comments || trade.duration || '',
        strategy: trade.strategy || trade.setup || '',
        duration: trade.duration || '',
        tags: trade.tags ? trade.tags.split(';') : [],
        tradeNotes: '',
        screenshots: []
      };

      if (!normalizedTrade.pnl && normalizedTrade.entryPrice && normalizedTrade.exitPrice && normalizedTrade.quantity) {
        if (normalizedTrade.side === 'long' || normalizedTrade.side === 'buy') {
          normalizedTrade.pnl = (normalizedTrade.exitPrice - normalizedTrade.entryPrice) * normalizedTrade.quantity;
        } else {
          normalizedTrade.pnl = (normalizedTrade.entryPrice - normalizedTrade.exitPrice) * normalizedTrade.quantity;
        }
        normalizedTrade.pnl -= normalizedTrade.fees;
      }

      data.push(normalizedTrade);
    }

    return data;
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const parsedTrades = parseCSV(text);
      
      const existingIds = new Set(trades.map(t => t.id));
      const newTrades = parsedTrades.filter(trade => !existingIds.has(trade.id));
      const duplicates = parsedTrades.length - newTrades.length;
      
      if (newTrades.length === 0) {
        setUploadNotification({
          type: 'warning',
          message: `No new trades found. All ${parsedTrades.length} trades already exist in your journal.`
        });
        setTimeout(() => setUploadNotification(null), 5000);
        return;
      }
      
      setUploadNotification({
        type: 'confirm',
        newCount: newTrades.length,
        duplicateCount: duplicates,
        totalCount: parsedTrades.length,
        onConfirm: () => {
          setTrades(prev => [...prev, ...newTrades]);
          applyAllFilters([...trades, ...newTrades]);
          setUploadNotification({
            type: 'success',
            message: `Successfully added ${newTrades.length} new trades to your journal!`
          });
          setTimeout(() => setUploadNotification(null), 5000);
        },
        onCancel: () => setUploadNotification(null)
      });
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleManualTradeSubmit = (tradeData) => {
    const newTrade = {
      id: `manual_${Date.now()}`,
      ...tradeData,
      pnl: tradeData.side === 'long' 
        ? (tradeData.exitPrice - tradeData.entryPrice) * tradeData.quantity - (tradeData.fees || 0)
        : (tradeData.entryPrice - tradeData.exitPrice) * tradeData.quantity - (tradeData.fees || 0),
      tags: tradeData.tags || [],
      tradeNotes: tradeData.tradeNotes || '',
      screenshots: []
    };
    
    setTrades(prev => [...prev, newTrade]);
    applyAllFilters([...trades, newTrade]);
    setShowTradeForm(false);
    setUploadNotification({
      type: 'success',
      message: 'Trade added successfully!'
    });
    setTimeout(() => setUploadNotification(null), 3000);
  };

  const handleTradeUpdate = (updatedTrade) => {
    setTrades(prev => prev.map(t => t.id === updatedTrade.id ? updatedTrade : t));
    applyAllFilters(trades.map(t => t.id === updatedTrade.id ? updatedTrade : t));
    setEditingTrade(null);
    setUploadNotification({
      type: 'success',
      message: 'Trade updated successfully!'
    });
    setTimeout(() => setUploadNotification(null), 3000);
  };

  const calculateAdvancedMetrics = () => {
    if (filteredTrades.length === 0) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalPnL: 0,
        averageWin: 0,
        averageLoss: 0,
        profitFactor: 0,
        largestWin: 0,
        largestLoss: 0,
        maxDrawdown: 0,
        maxDrawdownPercent: 0,
        expectancy: 0,
        winStreak: 0,
        loseStreak: 0,
        avgRMultiple: 0
      };
    }

    const winning = filteredTrades.filter(t => t.pnl > 0);
    const losing = filteredTrades.filter(t => t.pnl < 0);
    const totalPnL = filteredTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalWins = winning.reduce((sum, t) => sum + t.pnl, 0);
    const totalLosses = Math.abs(losing.reduce((sum, t) => sum + t.pnl, 0));

    const sorted = [...filteredTrades].sort((a, b) => new Date(a.date) - new Date(b.date));
    let peak = 0;
    let maxDD = 0;
    let cumulative = 0;
    
    sorted.forEach(trade => {
      cumulative += trade.pnl;
      if (cumulative > peak) peak = cumulative;
      const drawdown = peak - cumulative;
      if (drawdown > maxDD) maxDD = drawdown;
    });

    let currentStreak = 0;
    let maxWinStreak = 0;
    let maxLoseStreak = 0;
    
    sorted.forEach(trade => {
      if (trade.pnl > 0) {
        currentStreak = currentStreak > 0 ? currentStreak + 1 : 1;
        maxWinStreak = Math.max(maxWinStreak, currentStreak);
      } else if (trade.pnl < 0) {
        currentStreak = currentStreak < 0 ? currentStreak - 1 : -1;
        maxLoseStreak = Math.max(maxLoseStreak, Math.abs(currentStreak));
      }
    });

    const winRate = winning.length / filteredTrades.length;
    const avgWin = winning.length > 0 ? totalWins / winning.length : 0;
    const avgLoss = losing.length > 0 ? totalLosses / losing.length : 0;
    const expectancy = (winRate * avgWin) - ((1 - winRate) * avgLoss);

    const rMultiples = filteredTrades
      .filter(t => t.pnl !== 0)
      .map(t => Math.abs(t.pnl / (t.entryPrice * t.quantity * 0.02)));
    const avgRMultiple = rMultiples.length > 0 
      ? rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length 
      : 0;

    return {
      totalTrades: filteredTrades.length,
      winningTrades: winning.length,
      losingTrades: losing.length,
      winRate: (winning.length / filteredTrades.length) * 100,
      totalPnL,
      averageWin: avgWin,
      averageLoss: avgLoss,
      profitFactor: totalLosses > 0 ? totalWins / totalLosses : totalWins,
      largestWin: winning.length > 0 ? Math.max(...winning.map(t => t.pnl)) : 0,
      largestLoss: losing.length > 0 ? Math.min(...losing.map(t => t.pnl)) : 0,
      maxDrawdown: maxDD,
      maxDrawdownPercent: peak > 0 ? (maxDD / peak) * 100 : 0,
      expectancy,
      winStreak: maxWinStreak,
      loseStreak: maxLoseStreak,
      avgRMultiple
    };
  };

  const getStrategyPerformance = () => {
    const strategyMap = {};
    
    filteredTrades.forEach(trade => {
      trade.tags.forEach(tag => {
        if (!strategyMap[tag]) {
          strategyMap[tag] = { strategy: tag, pnl: 0, trades: 0, wins: 0, losses: 0 };
        }
        strategyMap[tag].pnl += trade.pnl;
        strategyMap[tag].trades += 1;
        if (trade.pnl > 0) strategyMap[tag].wins += 1;
        else if (trade.pnl < 0) strategyMap[tag].losses += 1;
      });
    });
    
    return Object.values(strategyMap).map(s => ({
      ...s,
      winRate: s.trades > 0 ? (s.wins / s.trades) * 100 : 0,
      avgPnL: s.trades > 0 ? s.pnl / s.trades : 0
    })).sort((a, b) => b.pnl - a.pnl);
  };

  const getTodayStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayTrades = trades.filter(t => t.date === today);
    const todayPnL = todayTrades.reduce((sum, t) => sum + t.pnl, 0);
    
    return {
      trades: todayTrades.length,
      pnl: todayPnL,
      maxLossHit: todayPnL <= -dailyGoals.maxLoss,
      targetHit: todayPnL >= dailyGoals.targetProfit,
      maxTradesHit: todayTrades.length >= dailyGoals.maxTrades
    };
  };

  const getCalendarHeatmap = () => {
    const dailyPnL = {};
    
    trades.forEach(trade => {
      if (!dailyPnL[trade.date]) {
        dailyPnL[trade.date] = 0;
      }
      dailyPnL[trade.date] += trade.pnl;
    });
    
    // Get last 90 days
    const days = [];
    const today = new Date();
    for (let i = 89; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      days.push({
        date: dateStr,
        pnl: dailyPnL[dateStr] || 0,
        day: date.getDay(),
        week: Math.floor(i / 7)
      });
    }
    
    return days;
  };

  const getCumulativePnL = () => {
    const sorted = [...filteredTrades].sort((a, b) => new Date(a.date) - new Date(b.date));
    let cumulative = 0;
    let peak = 0;
    
    return sorted.map(trade => {
      cumulative += trade.pnl;
      if (cumulative > peak) peak = cumulative;
      const drawdown = peak - cumulative;
      
      return {
        date: trade.date,
        pnl: cumulative,
        drawdown: -drawdown
      };
    });
  };

  const getSymbolBreakdown = () => {
    const symbolMap = {};
    filteredTrades.forEach(trade => {
      if (!symbolMap[trade.symbol]) {
        symbolMap[trade.symbol] = { symbol: trade.symbol, pnl: 0, trades: 0 };
      }
      symbolMap[trade.symbol].pnl += trade.pnl;
      symbolMap[trade.symbol].trades += 1;
    });
    return Object.values(symbolMap).sort((a, b) => b.pnl - a.pnl);
  };

  const getPerformanceByDayOfWeek = () => {
    const dayMap = {
      0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat'
    };
    
    const dayStats = {};
    
    filteredTrades.forEach(trade => {
      const date = new Date(trade.date);
      const day = dayMap[date.getDay()];
      
      if (!dayStats[day]) {
        dayStats[day] = { day, pnl: 0, trades: 0, wins: 0 };
      }
      
      dayStats[day].pnl += trade.pnl;
      dayStats[day].trades += 1;
      if (trade.pnl > 0) dayStats[day].wins += 1;
    });
    
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => 
      dayStats[day] || { day, pnl: 0, trades: 0, wins: 0 }
    );
  };

  const applyAllFilters = (tradeList = trades) => {
    let filtered = [...tradeList];
    
    if (filter === 'winners') {
      filtered = filtered.filter(t => t.pnl > 0);
    } else if (filter === 'losers') {
      filtered = filtered.filter(t => t.pnl < 0);
    } else if (filter === 'long') {
      filtered = filtered.filter(t => t.side === 'long' || t.side === 'buy');
    } else if (filter === 'short') {
      filtered = filtered.filter(t => t.side === 'short' || t.side === 'sell');
    }
    
    // Tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(t => 
        selectedTags.some(tag => t.tags && t.tags.includes(tag))
      );
    }
    
    if (dateRange !== 'all') {
      const now = new Date();
      let startDate = new Date();
      
      if (dateRange === '7days') {
        startDate.setDate(now.getDate() - 7);
      } else if (dateRange === '30days') {
        startDate.setDate(now.getDate() - 30);
      } else if (dateRange === '90days') {
        startDate.setDate(now.getDate() - 90);
      } else if (dateRange === 'custom' && customDateStart && customDateEnd) {
        startDate = new Date(customDateStart);
        const endDate = new Date(customDateEnd);
        filtered = filtered.filter(t => {
          const tradeDate = new Date(t.date);
          return tradeDate >= startDate && tradeDate <= endDate;
        });
        setFilteredTrades(filtered);
        return;
      }
      
      filtered = filtered.filter(t => new Date(t.date) >= startDate);
    }
    
    setFilteredTrades(filtered);
  };

  const applyFilters = (filterType) => {
    setFilter(filterType);
    applyAllFilters();
  };

  const handleDateRangeChange = (range) => {
    setDateRange(range);
    applyAllFilters();
  };

  const toggleTagFilter = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  useEffect(() => {
    applyAllFilters();
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, dateRange, customDateStart, customDateEnd, selectedTags]);

  const sortTrades = (field) => {
    const newOrder = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortBy(field);
    setSortOrder(newOrder);

    const sorted = [...filteredTrades].sort((a, b) => {
      let aVal = a[field];
      let bVal = b[field];

      if (field === 'date') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      if (newOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredTrades(sorted);
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Symbol', 'Side', 'Quantity', 'Entry Price', 'Exit Price', 'P&L', 'Fees', 'Duration', 'Tags', 'Notes'];
    const rows = filteredTrades.map(t => [
      t.date,
      t.symbol,
      t.side,
      t.quantity,
      t.entryPrice,
      t.exitPrice,
      t.pnl,
      t.fees || 0,
      t.duration || '',
      (t.tags || []).join(';'),
      t.tradeNotes || t.notes || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trades_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const clearData = () => {
    if (window.confirm('Are you sure you want to clear all trading data?')) {
      setTrades([]);
      setFilteredTrades([]);
      localStorage.removeItem('tradingJournalData');
    }
  };

  const metrics = calculateAdvancedMetrics();
  const cumulativePnL = getCumulativePnL();
  const symbolBreakdown = getSymbolBreakdown();
  const dayOfWeekPerformance = getPerformanceByDayOfWeek();
  const strategyPerformance = getStrategyPerformance();
  const todayStats = getTodayStats();
  const calendarData = getCalendarHeatmap();

  const totalPages = Math.ceil(filteredTrades.length / tradesPerPage);
  const indexOfLastTrade = currentPage * tradesPerPage;
  const indexOfFirstTrade = indexOfLastTrade - tradesPerPage;
  const currentTrades = filteredTrades.slice(indexOfFirstTrade, indexOfLastTrade);

  const goToPage = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Upload Notification */}
        {uploadNotification && (
          <div className="fixed top-6 right-6 z-50 max-w-md">
            {uploadNotification.type === 'confirm' ? (
              <div className="bg-gray-900 border border-cyan-500/50 rounded-xl p-6 shadow-2xl">
                <div className="flex items-start gap-3 mb-4">
                  <Upload className="w-6 h-6 text-cyan-400 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-lg mb-2">Import Trades</h4>
                    <p className="text-gray-400 text-sm mb-3">
                      Found {uploadNotification.totalCount} trades in CSV
                    </p>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-cyan-400">✓</span>
                        <span className="text-gray-300">{uploadNotification.newCount} new trades will be added</span>
                      </div>
                      {uploadNotification.duplicateCount > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500">⊗</span>
                          <span className="text-gray-400">{uploadNotification.duplicateCount} duplicates will be skipped</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={uploadNotification.onConfirm}
                    className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg font-medium transition"
                  >
                    Import {uploadNotification.newCount} Trades
                  </button>
                  <button
                    onClick={uploadNotification.onCancel}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className={`rounded-xl p-4 shadow-2xl border ${
                uploadNotification.type === 'success' 
                  ? 'bg-cyan-500/10 border-cyan-500/50' 
                  : 'bg-yellow-500/10 border-yellow-500/50'
              }`}>
                <div className="flex items-center gap-3">
                  {uploadNotification.type === 'success' ? (
                    <div className="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs">!</span>
                    </div>
                  )}
                  <p className={`text-sm ${
                    uploadNotification.type === 'success' ? 'text-cyan-100' : 'text-yellow-100'
                  }`}>
                    {uploadNotification.message}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modals */}
        {showTradeForm && <ManualTradeForm onSubmit={handleManualTradeSubmit} onClose={() => setShowTradeForm(false)} availableTags={availableTags} />}
        {editingTrade && <TradeEditModal trade={editingTrade} onUpdate={handleTradeUpdate} onClose={() => setEditingTrade(null)} availableTags={availableTags} />}
        {showGoalsModal && <GoalsModal goals={dailyGoals} onSave={(goals) => { setDailyGoals(goals); setShowGoalsModal(false); }} onClose={() => setShowGoalsModal(false)} />}
        {showImageModal && <ImageModal trade={showImageModal} onClose={() => setShowImageModal(null)} />}

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Trading Journal
            </h1>
            <p className="text-gray-400">Track, analyze, and improve your trading performance</p>
          </div>
          {trades.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowGoalsModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition"
              >
                <Target className="w-4 h-4" />
                Goals
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={() => setShowTradeForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition"
              >
                <Plus className="w-4 h-4" />
                Add Trade
              </button>
            </div>
          )}
        </div>

        {/* Daily Goals Alert */}
        {trades.length > 0 && (todayStats.maxLossHit || todayStats.maxTradesHit) && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <div>
              <h4 className="font-semibold text-red-400">Daily Limit Reached!</h4>
              <p className="text-sm text-red-300">
                {todayStats.maxLossHit && `Max loss limit reached ($${Math.abs(todayStats.pnl).toFixed(2)})`}
                {todayStats.maxLossHit && todayStats.maxTradesHit && ' | '}
                {todayStats.maxTradesHit && `Max trades limit reached (${todayStats.trades} trades)`}
              </p>
            </div>
          </div>
        )}

        {trades.length > 0 && todayStats.targetHit && !todayStats.maxLossHit && (
          <div className="bg-cyan-500/10 border border-cyan-500/50 rounded-xl p-4 mb-6 flex items-center gap-3">
            <Target className="w-6 h-6 text-cyan-400" />
            <div>
              <h4 className="font-semibold text-cyan-400">Daily Target Hit! 🎯</h4>
              <p className="text-sm text-cyan-300">
                You've reached your daily profit target of ${dailyGoals.targetProfit.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {/* Upload Section */}
        <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-800">
          <label className="flex flex-col items-center justify-center cursor-pointer hover:bg-gray-800/50 rounded-lg p-8 border-2 border-dashed border-gray-700 transition">
            <Upload className="w-12 h-12 mb-3 text-cyan-400" />
            <span className="text-lg font-medium mb-1">Upload CSV File</span>
            <span className="text-sm text-gray-400">Click to browse or drag and drop</span>
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </label>
          {trades.length > 0 && (
            <button
              onClick={clearData}
              className="mt-4 px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition text-sm"
            >
              Clear All Data
            </button>
          )}
        </div>

        {trades.length === 0 ? (
          <div className="bg-gray-900 rounded-xl p-12 text-center border border-gray-800">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-700" />
            <h3 className="text-xl font-semibold mb-2 text-gray-300">No trades yet</h3>
            <p className="text-gray-400 mb-4">Upload a CSV file or add trades manually to get started.</p>
            <button
              onClick={() => setShowTradeForm(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition font-medium"
            >
              <Plus className="w-5 h-5" />
              Add Your First Trade
            </button>
          </div>
        ) : (
          <>
            {/* Tag Management */}
            <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-lg font-semibold">Filter by Strategy Tags</h3>
                </div>
                <TagManager tags={availableTags} onUpdate={setAvailableTags} />
              </div>
              <div className="flex gap-2 flex-wrap">
                {availableTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTagFilter(tag)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition ${
                      selectedTags.includes(tag)
                        ? 'bg-cyan-500 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <FilterIcon className="w-5 h-5 text-gray-400" />
                <span className="text-gray-400 font-medium">Filters</span>
              </div>
              
              <div className="flex gap-2 mb-3 flex-wrap">
                <button
                  onClick={() => applyFilters('all')}
                  className={`px-4 py-2 rounded-lg transition ${filter === 'all' ? 'bg-cyan-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                >
                  All Trades
                </button>
                <button
                  onClick={() => applyFilters('winners')}
                  className={`px-4 py-2 rounded-lg transition ${filter === 'winners' ? 'bg-cyan-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                >
                  Winners
                </button>
                <button
                  onClick={() => applyFilters('losers')}
                  className={`px-4 py-2 rounded-lg transition ${filter === 'losers' ? 'bg-cyan-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                >
                  Losers
                </button>
                <button
                  onClick={() => applyFilters('long')}
                  className={`px-4 py-2 rounded-lg transition ${filter === 'long' ? 'bg-cyan-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                >
                  Long
                </button>
                <button
                  onClick={() => applyFilters('short')}
                  className={`px-4 py-2 rounded-lg transition ${filter === 'short' ? 'bg-cyan-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                >
                  Short
                </button>
              </div>

              <div className="flex gap-2 flex-wrap items-center">
                <Calendar className="w-4 h-4 text-gray-500" />
                <button
                  onClick={() => handleDateRangeChange('all')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition ${dateRange === 'all' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                >
                  All Time
                </button>
                <button
                  onClick={() => handleDateRangeChange('7days')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition ${dateRange === '7days' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => handleDateRangeChange('30days')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition ${dateRange === '30days' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                >
                  Last 30 Days
                </button>
                <button
                  onClick={() => handleDateRangeChange('90days')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition ${dateRange === '90days' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                >
                  Last 90 Days
                </button>
                <button
                  onClick={() => handleDateRangeChange('custom')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition ${dateRange === 'custom' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                >
                  Custom Range
                </button>
                
                {dateRange === 'custom' && (
                  <div className="flex gap-2 items-center ml-2">
                    <input
                      type="date"
                      value={customDateStart}
                      onChange={(e) => setCustomDateStart(e.target.value)}
                      className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-300"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="date"
                      value={customDateEnd}
                      onChange={(e) => setCustomDateEnd(e.target.value)}
                      className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-300"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-xs">Total P&L</span>
                  <DollarSign className="w-4 h-4 text-cyan-400" />
                </div>
                <div className={`text-xl font-bold ${metrics.totalPnL >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                  ${metrics.totalPnL.toFixed(2)}
                </div>
              </div>

              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-xs">Win Rate</span>
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-xl font-bold text-blue-400">
                  {metrics.winRate.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {metrics.winningTrades}W / {metrics.losingTrades}L
                </div>
              </div>

              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-xs">Profit Factor</span>
                  <BarChart3 className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-xl font-bold text-indigo-400">
                  {metrics.profitFactor.toFixed(2)}
                </div>
              </div>

              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-xs">Max Drawdown</span>
                  <TrendingDown className="w-4 h-4 text-red-400" />
                </div>
                <div className="text-xl font-bold text-red-400">
                  ${metrics.maxDrawdown.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {metrics.maxDrawdownPercent.toFixed(1)}%
                </div>
              </div>

              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-xs">Expectancy</span>
                  <DollarSign className="w-4 h-4 text-purple-400" />
                </div>
                <div className={`text-xl font-bold ${metrics.expectancy >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                  ${metrics.expectancy.toFixed(2)}
                </div>
              </div>

              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-xs">Total Trades</span>
                  <Calendar className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-xl font-bold text-cyan-400">
                  {metrics.totalTrades}
                </div>
              </div>
            </div>

            {/* Strategy Performance */}
            {strategyPerformance.length > 0 && (
              <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-800">
                <h3 className="text-lg font-semibold mb-4">Strategy Performance</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Strategy</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Trades</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Win Rate</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Total P&L</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Avg P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {strategyPerformance.map((strat, index) => (
                        <tr key={index} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-gray-800 rounded text-sm">{strat.strategy}</span>
                          </td>
                          <td className="py-3 px-4 text-sm">{strat.trades}</td>
                          <td className="py-3 px-4 text-sm">
                            <span className={strat.winRate >= 50 ? 'text-cyan-400' : 'text-red-400'}>
                              {strat.winRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className={`py-3 px-4 font-medium ${strat.pnl >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                            ${strat.pnl.toFixed(2)}
                          </td>
                          <td className={`py-3 px-4 ${strat.avgPnL >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                            ${strat.avgPnL.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Calendar Heatmap */}
            <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-800">
              <h3 className="text-lg font-semibold mb-4">90-Day Performance Calendar</h3>
              <CalendarHeatmap data={calendarData} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <h3 className="text-lg font-semibold mb-4">Equity Curve & Drawdown</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={cumulativePnL}>
                    <defs>
                      <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorDD" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px' }}
                      labelStyle={{ color: '#9ca3af' }}
                    />
                    <Area type="monotone" dataKey="pnl" stroke="#06b6d4" fillOpacity={1} fill="url(#colorPnl)" />
                    <Area type="monotone" dataKey="drawdown" stroke="#ef4444" fillOpacity={1} fill="url(#colorDD)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <h3 className="text-lg font-semibold mb-4">Performance by Day of Week</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dayOfWeekPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px' }}
                      labelStyle={{ color: '#9ca3af' }}
                    />
                    <Bar dataKey="pnl" fill="#06b6d4" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <h3 className="text-lg font-semibold mb-4">Top Symbols by P&L</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={symbolBreakdown.slice(0, 6)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="symbol" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px' }}
                      labelStyle={{ color: '#9ca3af' }}
                    />
                    <Bar dataKey="pnl" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <h3 className="text-lg font-semibold mb-4">Streak Analysis</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Longest Win Streak</span>
                    <span className="text-xl font-bold text-cyan-400">{metrics.winStreak} trades</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Longest Lose Streak</span>
                    <span className="text-xl font-bold text-red-400">{metrics.loseStreak} trades</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Avg R-Multiple</span>
                    <span className="text-xl font-bold text-indigo-400">{metrics.avgRMultiple.toFixed(2)}R</span>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                    <span className="text-gray-400">Average Win</span>
                    <span className="text-lg font-bold text-cyan-400">${metrics.averageWin.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Average Loss</span>
                    <span className="text-lg font-bold text-red-400">${metrics.averageLoss.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Trade List */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Trade History ({filteredTrades.length} trades)</h3>
                {filteredTrades.length > 0 && (
                  <span className="text-sm text-gray-400">
                    Showing {indexOfFirstTrade + 1}-{Math.min(indexOfLastTrade, filteredTrades.length)} of {filteredTrades.length}
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium cursor-pointer hover:text-gray-300" onClick={() => sortTrades('date')}>
                        Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium cursor-pointer hover:text-gray-300" onClick={() => sortTrades('symbol')}>
                        Symbol {sortBy === 'symbol' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Side</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium cursor-pointer hover:text-gray-300" onClick={() => sortTrades('quantity')}>
                        Qty {sortBy === 'quantity' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Entry</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Exit</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium cursor-pointer hover:text-gray-300" onClick={() => sortTrades('pnl')}>
                        P&L {sortBy === 'pnl' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Tags</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentTrades.map((trade, index) => (
                      <tr key={trade.id || index} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="py-3 px-4 text-sm">{trade.date}</td>
                        <td className="py-3 px-4 font-medium">{trade.symbol}</td>
                        <td className="py-3 px-4">
                          <span className={`text-xs px-2 py-1 rounded ${trade.side === 'long' || trade.side === 'buy' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-red-500/20 text-red-400'}`}>
                            {trade.side.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">{trade.quantity}</td>
                        <td className="py-3 px-4 text-sm">${trade.entryPrice.toFixed(2)}</td>
                        <td className="py-3 px-4 text-sm">${trade.exitPrice.toFixed(2)}</td>
                        <td className={`py-3 px-4 font-medium ${trade.pnl >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                          ${trade.pnl.toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-1 flex-wrap">
                            {(trade.tags || []).map((tag, i) => (
                              <span key={i} className="text-xs px-2 py-0.5 bg-gray-800 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => setEditingTrade(trade)}
                            className="text-gray-400 hover:text-cyan-400 transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-800">
                  <button
                    onClick={prevPage}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 rounded-lg transition ${
                      currentPage === 1
                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Previous
                  </button>

                  <div className="flex gap-2">
                    {currentPage > 3 && (
                      <>
                        <button
                          onClick={() => goToPage(1)}
                          className="px-3 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition"
                        >
                          1
                        </button>
                        {currentPage > 4 && <span className="px-2 py-2 text-gray-500">...</span>}
                      </>
                    )}

                    {[...Array(totalPages)].map((_, index) => {
                      const pageNumber = index + 1;
                      if (
                        pageNumber === currentPage ||
                        (pageNumber >= currentPage - 2 && pageNumber <= currentPage + 2)
                      ) {
                        return (
                          <button
                            key={pageNumber}
                            onClick={() => goToPage(pageNumber)}
                            className={`px-3 py-2 rounded-lg transition ${
                              currentPage === pageNumber
                                ? 'bg-cyan-500 text-white'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                            }`}
                          >
                            {pageNumber}
                          </button>
                        );
                      }
                      return null;
                    })}

                    {currentPage < totalPages - 2 && (
                      <>
                        {currentPage < totalPages - 3 && <span className="px-2 py-2 text-gray-500">...</span>}
                        <button
                          onClick={() => goToPage(totalPages)}
                          className="px-3 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition"
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                  </div>

                  <button
                    onClick={nextPage}
                    disabled={currentPage === totalPages}
                    className={`px-4 py-2 rounded-lg transition ${
                      currentPage === totalPages
                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Manual Trade Entry Form Component
const ManualTradeForm = ({ onSubmit, onClose, availableTags }) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    symbol: '',
    side: 'long',
    quantity: '',
    entryPrice: '',
    exitPrice: '',
    fees: '',
    notes: '',
    duration: '',
    tags: [],
    tradeNotes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      quantity: parseFloat(formData.quantity),
      entryPrice: parseFloat(formData.entryPrice),
      exitPrice: parseFloat(formData.exitPrice),
      fees: parseFloat(formData.fees || 0)
    });
  };

  const toggleTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Add Trade Manually</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Symbol</label>
              <input
                type="text"
                value={formData.symbol}
                onChange={(e) => setFormData({...formData, symbol: e.target.value.toUpperCase()})}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                placeholder="AAPL, TSLA, etc."
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Side</label>
              <select
                value={formData.side}
                onChange={(e) => setFormData({...formData, side: e.target.value})}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              >
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Quantity</label>
              <input
                type="number"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                placeholder="100"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Entry Price</label>
              <input
                type="number"
                step="0.01"
                value={formData.entryPrice}
                onChange={(e) => setFormData({...formData, entryPrice: e.target.value})}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                placeholder="150.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Exit Price</label>
              <input
                type="number"
                step="0.01"
                value={formData.exitPrice}
                onChange={(e) => setFormData({...formData, exitPrice: e.target.value})}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                placeholder="155.00"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Fees (optional)</label>
            <input
              type="number"
              step="0.01"
              value={formData.fees}
              onChange={(e) => setFormData({...formData, fees: e.target.value})}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Strategy Tags</label>
            <div className="flex gap-2 flex-wrap">
              {availableTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition ${
                    formData.tags.includes(tag)
                      ? 'bg-cyan-500 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Trade Notes (optional)</label>
            <textarea
              value={formData.tradeNotes}
              onChange={(e) => setFormData({...formData, tradeNotes: e.target.value})}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              rows="3"
              placeholder="What was your thesis? How did you feel? What happened?"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              Add Trade
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Trade Edit Modal Component
const TradeEditModal = ({ trade, onUpdate, onClose, availableTags }) => {
  const [formData, setFormData] = useState({
    ...trade,
    tags: trade.tags || [],
    tradeNotes: trade.tradeNotes || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate({
      ...formData,
      quantity: parseFloat(formData.quantity),
      entryPrice: parseFloat(formData.entryPrice),
      exitPrice: parseFloat(formData.exitPrice),
      fees: parseFloat(formData.fees || 0),
      pnl: formData.side === 'long'
        ? (parseFloat(formData.exitPrice) - parseFloat(formData.entryPrice)) * parseFloat(formData.quantity) - parseFloat(formData.fees || 0)
        : (parseFloat(formData.entryPrice) - parseFloat(formData.exitPrice)) * parseFloat(formData.quantity) - parseFloat(formData.fees || 0)
    });
  };

  const toggleTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Edit Trade</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Symbol</label>
              <input
                type="text"
                value={formData.symbol}
                onChange={(e) => setFormData({...formData, symbol: e.target.value.toUpperCase()})}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Side</label>
              <select
                value={formData.side}
                onChange={(e) => setFormData({...formData, side: e.target.value})}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              >
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Quantity</label>
              <input
                type="number"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Entry Price</label>
              <input
                type="number"
                step="0.01"
                value={formData.entryPrice}
                onChange={(e) => setFormData({...formData, entryPrice: e.target.value})}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Exit Price</label>
              <input
                type="number"
                step="0.01"
                value={formData.exitPrice}
                onChange={(e) => setFormData({...formData, exitPrice: e.target.value})}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Fees</label>
            <input
              type="number"
              step="0.01"
              value={formData.fees}
              onChange={(e) => setFormData({...formData, fees: e.target.value})}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Strategy Tags</label>
            <div className="flex gap-2 flex-wrap">
              {availableTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition ${
                    formData.tags.includes(tag)
                      ? 'bg-cyan-500 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Trade Notes</label>
            <textarea
              value={formData.tradeNotes}
              onChange={(e) => setFormData({...formData, tradeNotes: e.target.value})}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              rows="4"
              placeholder="Add notes about this trade..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              Update Trade
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Tag Manager Component
const TagManager = ({ tags, onUpdate }) => {
  const [showModal, setShowModal] = useState(false);
  const [newTag, setNewTag] = useState('');

  const handleAdd = () => {
    if (newTag && !tags.includes(newTag)) {
      onUpdate([...tags, newTag]);
      setNewTag('');
    }
  };

  const handleRemove = (tag) => {
    onUpdate(tags.filter(t => t !== tag));
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="text-sm px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition"
      >
        Manage Tags
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Manage Strategy Tags</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
                  placeholder="New tag name..."
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
                <button
                  onClick={handleAdd}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition"
                >
                  Add
                </button>
              </div>

              <div className="space-y-2">
                {tags.map(tag => (
                  <div key={tag} className="flex items-center justify-between px-3 py-2 bg-gray-800 rounded-lg">
                    <span>{tag}</span>
                    <button
                      onClick={() => handleRemove(tag)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Goals Modal Component
const GoalsModal = ({ goals, onSave, onClose }) => {
  const [formData, setFormData] = useState(goals);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Daily Trading Goals</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Max Daily Loss ($)</label>
            <input
              type="number"
              step="10"
              value={formData.maxLoss}
              onChange={(e) => setFormData({...formData, maxLoss: parseFloat(e.target.value)})}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
            />
            <p className="text-xs text-gray-500 mt-1">Stop trading when you hit this loss</p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Daily Profit Target ($)</label>
            <input
              type="number"
              step="10"
              value={formData.targetProfit}
              onChange={(e) => setFormData({...formData, targetProfit: parseFloat(e.target.value)})}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
            />
            <p className="text-xs text-gray-500 mt-1">Your daily profit goal</p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Max Daily Trades</label>
            <input
              type="number"
              value={formData.maxTrades}
              onChange={(e) => setFormData({...formData, maxTrades: parseInt(e.target.value)})}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
            />
            <p className="text-xs text-gray-500 mt-1">Maximum number of trades per day</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => onSave(formData)}
              className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              Save Goals
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Image Modal Component (placeholder for future implementation)
const ImageModal = ({ trade, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-2xl w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Trade Screenshots - {trade.symbol}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="text-center py-12 text-gray-400">
          <ImageIcon className="w-16 h-16 mx-auto mb-4" />
          <p>Screenshot upload coming soon!</p>
          <p className="text-sm mt-2">Capture and attach chart images to your trades</p>
        </div>
      </div>
    </div>
  );
};

// Calendar Heatmap Component
const CalendarHeatmap = ({ data }) => {
  const getColor = (pnl) => {
    if (pnl === 0) return '#1f2937';
    if (pnl > 0) {
      if (pnl > 500) return '#10b981';
      if (pnl > 200) return '#34d399';
      if (pnl > 50) return '#6ee7b7';
      return '#a7f3d0';
    } else {
      if (pnl < -500) return '#ef4444';
      if (pnl < -200) return '#f87171';
      if (pnl < -50) return '#fca5a5';
      return '#fecaca';
    }
  };

  const weeks = [];
  for (let i = 0; i < 13; i++) {
    weeks.push(data.filter(d => d.week === i));
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="flex flex-col gap-1">
            {week.map((day, dayIdx) => (
              <div
                key={dayIdx}
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: getColor(day.pnl) }}
                title={`${day.date}: $${day.pnl.toFixed(2)}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
        <span>Less</span>
        <div className="flex gap-1">
          {['#1f2937', '#fecaca', '#fca5a5', '#f87171', '#ef4444'].map(color => (
            <div key={color} className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
          ))}
        </div>
        <span>Loss</span>
        <div className="flex gap-1">
          {['#a7f3d0', '#6ee7b7', '#34d399', '#10b981'].map(color => (
            <div key={color} className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
          ))}
        </div>
        <span>Profit</span>
      </div>
    </div>
  );
};

export default TradingJournal;