import React, { useState, useEffect, useMemo } from 'react';
import { Upload, TrendingUp, DollarSign, BarChart3, Calendar, Download, Plus, X, Filter as FilterIcon, TrendingDown, Edit2, Tag, Target, Image as ImageIcon, AlertCircle, Search, ChevronLeft, ChevronRight, Lightbulb, Sun, Moon, Trash2, CheckSquare } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [replayMode, setReplayMode] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [watchlist, setWatchlist] = useState([]);
  const [theme, setTheme] = useState('dark');
  const [selectedTrades, setSelectedTrades] = useState(new Set());
  const [bulkMode, setBulkMode] = useState(false);

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

    const storedWatchlist = localStorage.getItem('watchlist');
    if (storedWatchlist) {
      setWatchlist(JSON.parse(storedWatchlist));
    }

    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) {
      setTheme(storedTheme);
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

  useEffect(() => {
    localStorage.setItem('watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

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

      const getTimeOfDay = (timestamp) => {
        if (!timestamp) return '';
        const timePart = timestamp.split(' ')[1];
        if (!timePart) return '';
        return timePart.substring(0, 5);
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
        time: getTimeOfDay(trade.boughttimestamp || trade.soldtimestamp || ''),
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

  const handleBulkTag = (tag) => {
    const updated = trades.map(t => {
      if (selectedTrades.has(t.id)) {
        const newTags = t.tags || [];
        if (!newTags.includes(tag)) {
          return { ...t, tags: [...newTags, tag] };
        }
      }
      return t;
    });
    setTrades(updated);
    applyAllFilters(updated);
    setSelectedTrades(new Set());
    setBulkMode(false);
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Delete ${selectedTrades.size} selected trades?`)) {
      const updated = trades.filter(t => !selectedTrades.has(t.id));
      setTrades(updated);
      applyAllFilters(updated);
      setSelectedTrades(new Set());
      setBulkMode(false);
    }
  };

  const toggleTradeSelection = (tradeId) => {
    const newSelected = new Set(selectedTrades);
    if (newSelected.has(tradeId)) {
      newSelected.delete(tradeId);
    } else {
      newSelected.add(tradeId);
    }
    setSelectedTrades(newSelected);
  };

  const toggleWatchlist = (symbol) => {
    setWatchlist(prev => 
      prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]
    );
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
    let currentStreakType = 'none';
    
    sorted.forEach((trade, idx) => {
      if (trade.pnl > 0) {
        currentStreak = currentStreak > 0 ? currentStreak + 1 : 1;
        maxWinStreak = Math.max(maxWinStreak, currentStreak);
        if (idx === sorted.length - 1) currentStreakType = 'win';
      } else if (trade.pnl < 0) {
        currentStreak = currentStreak < 0 ? currentStreak - 1 : -1;
        maxLoseStreak = Math.max(maxLoseStreak, Math.abs(currentStreak));
        if (idx === sorted.length - 1) currentStreakType = 'loss';
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
      avgRMultiple,
      currentStreak: Math.abs(currentStreak),
      currentStreakType
    };
  };

  const getQuickStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const todayTrades = trades.filter(t => t.date === today);
    const weekTrades = trades.filter(t => t.date >= weekAgo);
    const monthTrades = trades.filter(t => t.date >= monthAgo);

    return {
      today: {
        trades: todayTrades.length,
        pnl: todayTrades.reduce((sum, t) => sum + t.pnl, 0),
      },
      week: {
        trades: weekTrades.length,
        pnl: weekTrades.reduce((sum, t) => sum + t.pnl, 0),
      },
      month: {
        trades: monthTrades.length,
        pnl: monthTrades.reduce((sum, t) => sum + t.pnl, 0),
      }
    };
  };

  const getRiskManagementMetrics = () => {
    if (filteredTrades.length === 0) {
      return {
        avgRiskPerTrade: 0,
        avgRewardPerTrade: 0,
        avgRiskRewardRatio: 0,
        rMultiples: [],
        avgRMultiple: 0,
        positiveRMultiples: 0,
        negativeRMultiples: 0,
        maxDrawdown: 0,
        maxDrawdownPercent: 0,
        currentDrawdown: 0,
        currentDrawdownPercent: 0,
        drawdownPeriods: [],
        positionSizing: {},
        riskPercentages: [],
        avgPositionSize: 0,
        largestPosition: 0,
        smallestPosition: 0,
        sharpeRatio: 0,
        kellyPercentage: 0
      };
    }

    // Calculate R-Multiples (assuming 2% account risk per trade as default)
    const rMultiples = filteredTrades.map(t => {
      // Estimate risk as 2% of position value or use stop loss if available
      const positionValue = t.entryPrice * t.quantity;
      const estimatedRisk = positionValue * 0.02; // 2% risk assumption
      const rMultiple = t.pnl / estimatedRisk;
      return {
        trade: t,
        rMultiple: rMultiple,
        risk: estimatedRisk,
        reward: t.pnl
      };
    });

    const avgRMultiple = rMultiples.reduce((sum, r) => sum + r.rMultiple, 0) / rMultiples.length;
    const positiveR = rMultiples.filter(r => r.rMultiple > 0).length;
    const negativeR = rMultiples.filter(r => r.rMultiple < 0).length;

    // Risk/Reward Ratios
    const winning = filteredTrades.filter(t => t.pnl > 0);
    const losing = filteredTrades.filter(t => t.pnl < 0);
    
    const avgReward = winning.length > 0 
      ? winning.reduce((sum, t) => sum + t.pnl, 0) / winning.length 
      : 0;
    const avgRisk = losing.length > 0 
      ? Math.abs(losing.reduce((sum, t) => sum + t.pnl, 0) / losing.length)
      : 0;
    const avgRiskRewardRatio = avgRisk > 0 ? avgReward / avgRisk : 0;

    // Drawdown Analysis
    const sorted = [...filteredTrades].sort((a, b) => new Date(a.date) - new Date(b.date));
    let peak = 0;
    let maxDD = 0;
    let maxDDPercent = 0;
    let cumulative = 0;
    let currentDD = 0;
    let currentDDPercent = 0;
    let inDrawdown = false;
    let drawdownStart = null;
    const drawdownPeriods = [];
    
    sorted.forEach((trade, idx) => {
      cumulative += trade.pnl;
      
      if (cumulative > peak) {
        // New peak - end any drawdown period
        if (inDrawdown && drawdownStart) {
          drawdownPeriods.push({
            start: drawdownStart,
            end: sorted[idx - 1].date,
            depth: currentDD,
            depthPercent: currentDDPercent
          });
          inDrawdown = false;
        }
        peak = cumulative;
        currentDD = 0;
        currentDDPercent = 0;
      } else {
        // In drawdown
        if (!inDrawdown) {
          drawdownStart = trade.date;
          inDrawdown = true;
        }
        currentDD = peak - cumulative;
        currentDDPercent = peak > 0 ? (currentDD / peak) * 100 : 0;
        
        if (currentDD > maxDD) {
          maxDD = currentDD;
          maxDDPercent = currentDDPercent;
        }
      }
    });

    // If still in drawdown at end
    if (inDrawdown) {
      drawdownPeriods.push({
        start: drawdownStart,
        end: sorted[sorted.length - 1].date,
        depth: currentDD,
        depthPercent: currentDDPercent,
        current: true
      });
    }

    // Position Sizing Analysis
    const positionSizes = filteredTrades.map(t => t.entryPrice * t.quantity);
    const avgPositionSize = positionSizes.reduce((sum, p) => sum + p, 0) / positionSizes.length;
    const largestPosition = Math.max(...positionSizes);
    const smallestPosition = Math.min(...positionSizes);

    // Risk percentages (position size relative to average)
    const riskPercentages = positionSizes.map(p => (p / avgPositionSize - 1) * 100);

    // Position sizing by symbol
    const positionSizing = {};
    filteredTrades.forEach(t => {
      const posSize = t.entryPrice * t.quantity;
      if (!positionSizing[t.symbol]) {
        positionSizing[t.symbol] = {
          avgSize: 0,
          maxSize: 0,
          minSize: Infinity,
          count: 0,
          totalSize: 0
        };
      }
      positionSizing[t.symbol].count++;
      positionSizing[t.symbol].totalSize += posSize;
      positionSizing[t.symbol].maxSize = Math.max(positionSizing[t.symbol].maxSize, posSize);
      positionSizing[t.symbol].minSize = Math.min(positionSizing[t.symbol].minSize, posSize);
    });

    // Calculate averages
    Object.keys(positionSizing).forEach(symbol => {
      positionSizing[symbol].avgSize = 
        positionSizing[symbol].totalSize / positionSizing[symbol].count;
    });

    // Sharpe Ratio (simplified - assuming risk-free rate of 0)
    const returns = sorted.map(t => t.pnl);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // Annualized

    // Kelly Criterion
    const winRate = winning.length / filteredTrades.length;
    const kellyPercentage = avgRiskRewardRatio > 0 
      ? ((avgRiskRewardRatio * winRate - (1 - winRate)) / avgRiskRewardRatio) * 100 
      : 0;

    return {
      avgRiskPerTrade: avgRisk,
      avgRewardPerTrade: avgReward,
      avgRiskRewardRatio,
      rMultiples,
      avgRMultiple,
      positiveRMultiples: positiveR,
      negativeRMultiples: negativeR,
      maxDrawdown: maxDD,
      maxDrawdownPercent: maxDDPercent,
      currentDrawdown: currentDD,
      currentDrawdownPercent: currentDDPercent,
      drawdownPeriods: drawdownPeriods.sort((a, b) => b.depth - a.depth).slice(0, 5),
      positionSizing,
      riskPercentages,
      avgPositionSize,
      largestPosition,
      smallestPosition,
      sharpeRatio,
      kellyPercentage: Math.max(0, Math.min(kellyPercentage, 25)) // Cap at 25% for safety
    };
  };

  const getPerformanceInsights = () => {
    const insights = [];
    
    // Pattern 1: Symbol-specific win rates
    const symbolStats = {};
    filteredTrades.forEach(t => {
      if (!symbolStats[t.symbol]) {
        symbolStats[t.symbol] = { wins: 0, losses: 0, pnl: 0, trades: 0 };
      }
      symbolStats[t.symbol].trades++;
      symbolStats[t.symbol].pnl += t.pnl;
      if (t.pnl > 0) symbolStats[t.symbol].wins++;
      else symbolStats[t.symbol].losses++;
    });

    const sortedSymbols = Object.entries(symbolStats).sort((a, b) => b[1].pnl - a[1].pnl);
    if (sortedSymbols.length > 0) {
      const best = sortedSymbols[0];
      const worst = sortedSymbols[sortedSymbols.length - 1];
      
      if (best[1].pnl > 0 && best[1].trades >= 3) {
        const winRate = ((best[1].wins / best[1].trades) * 100).toFixed(0);
        insights.push({
          type: 'success',
          title: `${best[0]} has ${winRate}% win rate`,
          detail: `${best[1].trades} trades, $${best[1].pnl.toFixed(2)} profit`
        });
      }
      
      if (worst[1].pnl < -100 && worst[1].trades >= 3) {
        const lossRate = ((worst[1].losses / worst[1].trades) * 100).toFixed(0);
        insights.push({
          type: 'warning',
          title: `You lose ${lossRate}% of ${worst[0]} trades`,
          detail: `${worst[1].trades} trades, $${worst[1].pnl.toFixed(2)} loss - consider avoiding`
        });
      }
    }

    // Pattern 2: Day of week performance
    const dayStats = {};
    const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    filteredTrades.forEach(t => {
      const date = new Date(t.date);
      const dayName = dayMap[date.getDay()];
      if (!dayStats[dayName]) {
        dayStats[dayName] = { wins: 0, losses: 0, total: 0, pnl: 0 };
      }
      dayStats[dayName].total++;
      dayStats[dayName].pnl += t.pnl;
      if (t.pnl > 0) dayStats[dayName].wins++;
      else dayStats[dayName].losses++;
    });

    const sortedDays = Object.entries(dayStats)
      .filter(([_, s]) => s.total >= 3)
      .sort((a, b) => b[1].pnl - a[1].pnl);
    
    if (sortedDays.length > 0) {
      const bestDay = sortedDays[0];
      const winRate = ((bestDay[1].wins / bestDay[1].total) * 100).toFixed(0);
      insights.push({
        type: 'info',
        title: `${bestDay[0]}s are your best trading day`,
        detail: `${winRate}% win rate, $${bestDay[1].pnl.toFixed(2)} average P&L`
      });

      const worstDay = sortedDays[sortedDays.length - 1];
      if (worstDay[1].pnl < 0) {
        const lossRate = ((worstDay[1].losses / worstDay[1].total) * 100).toFixed(0);
        insights.push({
          type: 'warning',
          title: `You lose ${lossRate}% of trades on ${worstDay[0]}s`,
          detail: `Consider taking ${worstDay[0]}s off or trading smaller size`
        });
      }
    }

    // Pattern 3: Time of day patterns
    const timeStats = {
      'premarket': { wins: 0, losses: 0, total: 0, pnl: 0 }, // before 9:30
      'morning': { wins: 0, losses: 0, total: 0, pnl: 0 },   // 9:30-12:00
      'afternoon': { wins: 0, losses: 0, total: 0, pnl: 0 }, // 12:00-15:00
      'close': { wins: 0, losses: 0, total: 0, pnl: 0 }      // 15:00-16:00+
    };

    filteredTrades.forEach(t => {
      if (t.time) {
        const hour = parseInt(t.time.split(':')[0]);
        const minute = parseInt(t.time.split(':')[1] || 0);
        const totalMinutes = hour * 60 + minute;
        
        let period;
        if (totalMinutes < 9 * 60 + 30) period = 'premarket';
        else if (totalMinutes < 12 * 60) period = 'morning';
        else if (totalMinutes < 15 * 60) period = 'afternoon';
        else period = 'close';
        
        timeStats[period].total++;
        timeStats[period].pnl += t.pnl;
        if (t.pnl > 0) timeStats[period].wins++;
        else timeStats[period].losses++;
      }
    });

    const sortedTimes = Object.entries(timeStats)
      .filter(([_, s]) => s.total >= 3)
      .sort((a, b) => (b[1].wins / b[1].total) - (a[1].wins / a[1].total));
    
    if (sortedTimes.length > 0) {
      const bestTime = sortedTimes[0];
      const winRate = ((bestTime[1].wins / bestTime[1].total) * 100).toFixed(0);
      insights.push({
        type: 'info',
        title: `${winRate}% win rate during ${bestTime[0]} session`,
        detail: `${bestTime[1].total} trades, $${bestTime[1].pnl.toFixed(2)} profit`
      });

      const worstTime = sortedTimes[sortedTimes.length - 1];
      if (worstTime[1].total >= 5) {
        const lossRate = ((worstTime[1].losses / worstTime[1].total) * 100).toFixed(0);
        if (lossRate >= 60) {
          insights.push({
            type: 'warning',
            title: `You lose ${lossRate}% of ${worstTime[0]} trades`,
            detail: `Avoid trading during ${worstTime[0]} or reduce position size`
          });
        }
      }
    }

    // Pattern 4: Strategy/Tag performance
    const strategyStats = {};
    filteredTrades.forEach(t => {
      (t.tags || []).forEach(tag => {
        if (!strategyStats[tag]) {
          strategyStats[tag] = { wins: 0, total: 0, pnl: 0 };
        }
        strategyStats[tag].total++;
        strategyStats[tag].pnl += t.pnl;
        if (t.pnl > 0) strategyStats[tag].wins++;
      });
    });

    const sortedStrategies = Object.entries(strategyStats)
      .filter(([_, s]) => s.total >= 5)
      .sort((a, b) => (b[1].wins / b[1].total) - (a[1].wins / a[1].total));
    
    if (sortedStrategies.length > 0) {
      const bestStrategy = sortedStrategies[0];
      const winRate = ((bestStrategy[1].wins / bestStrategy[1].total) * 100).toFixed(0);
      insights.push({
        type: 'success',
        title: `'${bestStrategy[0]}' strategy has ${winRate}% win rate`,
        detail: `${bestStrategy[1].total} trades, $${bestStrategy[1].pnl.toFixed(2)} profit - use more often`
      });

      const worstStrategy = sortedStrategies[sortedStrategies.length - 1];
      if (worstStrategy[1].pnl < 0) {
        const lossRate = ((worstStrategy[1].total - worstStrategy[1].wins) / worstStrategy[1].total) * 100;
        if (lossRate >= 60) {
          insights.push({
            type: 'warning',
            title: `'${worstStrategy[0]}' loses ${lossRate.toFixed(0)}% of the time`,
            detail: `$${worstStrategy[1].pnl.toFixed(2)} total loss - reconsider this setup`
          });
        }
      }
    }

    // Pattern 5: Side bias (Long vs Short)
    const sideStats = { long: { wins: 0, total: 0, pnl: 0 }, short: { wins: 0, total: 0, pnl: 0 } };
    filteredTrades.forEach(t => {
      const side = (t.side === 'long' || t.side === 'buy') ? 'long' : 'short';
      sideStats[side].total++;
      sideStats[side].pnl += t.pnl;
      if (t.pnl > 0) sideStats[side].wins++;
    });

    if (sideStats.long.total >= 5 && sideStats.short.total >= 5) {
      const longWinRate = (sideStats.long.wins / sideStats.long.total) * 100;
      const shortWinRate = (sideStats.short.wins / sideStats.short.total) * 100;
      const diff = Math.abs(longWinRate - shortWinRate);
      
      if (diff >= 20) {
        const better = longWinRate > shortWinRate ? 'long' : 'short';
        const betterRate = better === 'long' ? longWinRate : shortWinRate;
        insights.push({
          type: 'info',
          title: `You're better at ${better} trades (${betterRate.toFixed(0)}% win rate)`,
          detail: `Consider focusing more on ${better} setups`
        });
      }
    }

    // Pattern 6: Specific day + time combinations
    filteredTrades.forEach(t => {
      const date = new Date(t.date);
      const day = dayMap[date.getDay()];
      if (day === 'Friday' && t.time) {
        const hour = parseInt(t.time.split(':')[0]);
        if (hour >= 14) { // After 2pm on Fridays
          if (!dayStats['Friday_PM']) {
            dayStats['Friday_PM'] = { wins: 0, losses: 0, total: 0, pnl: 0 };
          }
          dayStats['Friday_PM'].total++;
          dayStats['Friday_PM'].pnl += t.pnl;
          if (t.pnl > 0) dayStats['Friday_PM'].wins++;
          else dayStats['Friday_PM'].losses++;
        }
      }
    });

    if (dayStats['Friday_PM'] && dayStats['Friday_PM'].total >= 5) {
      const lossRate = ((dayStats['Friday_PM'].losses / dayStats['Friday_PM'].total) * 100).toFixed(0);
      if (lossRate >= 70) {
        insights.push({
          type: 'warning',
          title: `You lose ${lossRate}% of trades on Friday afternoons`,
          detail: `${dayStats['Friday_PM'].total} trades after 2pm - avoid or reduce size`
        });
      }
    }

    // Pattern 7: Consecutive loss warning
    let maxConsecutiveLosses = 0;
    let currentStreak = 0;
    const sortedTrades = [...filteredTrades].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    sortedTrades.forEach(t => {
      if (t.pnl < 0) {
        currentStreak++;
        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentStreak);
      } else {
        currentStreak = 0;
      }
    });

    if (maxConsecutiveLosses >= 5) {
      insights.push({
        type: 'warning',
        title: `Watch out for tilt: ${maxConsecutiveLosses} consecutive losses recorded`,
        detail: 'Consider taking a break after 3 losses in a row'
      });
    }

    return insights.slice(0, 6); // Return top 6 most actionable insights
  };

  const getPnLDistribution = () => {
    const buckets = {
      '-500+': 0,
      '-500 to -200': 0,
      '-200 to -100': 0,
      '-100 to -50': 0,
      '-50 to 0': 0,
      '0 to 50': 0,
      '50 to 100': 0,
      '100 to 200': 0,
      '200 to 500': 0,
      '500+': 0
    };

    filteredTrades.forEach(t => {
      const pnl = t.pnl;
      if (pnl < -500) buckets['-500+']++;
      else if (pnl < -200) buckets['-500 to -200']++;
      else if (pnl < -100) buckets['-200 to -100']++;
      else if (pnl < -50) buckets['-100 to -50']++;
      else if (pnl < 0) buckets['-50 to 0']++;
      else if (pnl < 50) buckets['0 to 50']++;
      else if (pnl < 100) buckets['50 to 100']++;
      else if (pnl < 200) buckets['100 to 200']++;
      else if (pnl < 500) buckets['200 to 500']++;
      else buckets['500+']++;
    });

    return Object.entries(buckets).map(([range, count]) => ({
      range,
      count
    }));
  };

  const getTimeOfDayPerformance = () => {
    const hourStats = {};
    
    filteredTrades.forEach(t => {
      if (t.time) {
        const hour = parseInt(t.time.split(':')[0]);
        if (!hourStats[hour]) {
          hourStats[hour] = { hour, pnl: 0, trades: 0 };
        }
        hourStats[hour].pnl += t.pnl;
        hourStats[hour].trades++;
      }
    });

    return Object.values(hourStats).sort((a, b) => a.hour - b.hour);
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
        week: Math.floor((89 - i) / 7) // Fixed: calculate week from start of 90-day period
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

  // Advanced Charts Data Functions
  const getWinRateOverTime = () => {
    const sorted = [...filteredTrades].sort((a, b) => new Date(a.date) - new Date(b.date));
    const windowSize = Math.max(10, Math.floor(sorted.length / 20)); // Rolling window
    const data = [];
    
    for (let i = windowSize - 1; i < sorted.length; i++) {
      const window = sorted.slice(Math.max(0, i - windowSize + 1), i + 1);
      const wins = window.filter(t => t.pnl > 0).length;
      const winRate = (wins / window.length) * 100;
      
      data.push({
        date: sorted[i].date,
        winRate: winRate,
        trades: window.length
      });
    }
    
    return data;
  };

  const getProfitFactorByStrategy = () => {
    const strategyMap = {};
    
    filteredTrades.forEach(trade => {
      (trade.tags || []).forEach(tag => {
        if (!strategyMap[tag]) {
          strategyMap[tag] = { 
            strategy: tag, 
            totalWins: 0, 
            totalLosses: 0,
            wins: 0,
            losses: 0,
            profitFactor: 0 
          };
        }
        
        if (trade.pnl > 0) {
          strategyMap[tag].totalWins += trade.pnl;
          strategyMap[tag].wins++;
        } else {
          strategyMap[tag].totalLosses += Math.abs(trade.pnl);
          strategyMap[tag].losses++;
        }
      });
    });
    
    return Object.values(strategyMap)
      .map(s => ({
        ...s,
        profitFactor: s.totalLosses > 0 ? s.totalWins / s.totalLosses : s.totalWins,
        totalTrades: s.wins + s.losses
      }))
      .filter(s => s.totalTrades >= 3)
      .sort((a, b) => b.profitFactor - a.profitFactor);
  };

  const getReturnDistribution = () => {
    // Create histogram bins for returns
    const returns = filteredTrades.map(t => t.pnl);
    const min = Math.min(...returns);
    const max = Math.max(...returns);
    const binCount = 20;
    const binSize = (max - min) / binCount;
    
    const bins = [];
    for (let i = 0; i < binCount; i++) {
      const binMin = min + (i * binSize);
      const binMax = binMin + binSize;
      const count = returns.filter(r => r >= binMin && r < binMax).length;
      
      bins.push({
        range: `$${binMin.toFixed(0)}`,
        rangeEnd: binMax,
        count: count,
        percentage: (count / returns.length) * 100
      });
    }
    
    return bins;
  };

  const getCumulativePnLEnhanced = () => {
    const sorted = [...filteredTrades].sort((a, b) => new Date(a.date) - new Date(b.date));
    let cumulative = 0;
    let peak = 0;
    let wins = 0;
    let losses = 0;
    
    return sorted.map((trade, idx) => {
      cumulative += trade.pnl;
      if (cumulative > peak) peak = cumulative;
      if (trade.pnl > 0) wins++;
      else losses++;
      
      const drawdown = peak - cumulative;
      const winRate = ((wins / (wins + losses)) * 100);
      
      return {
        date: trade.date,
        pnl: cumulative,
        drawdown: -drawdown,
        winRate: winRate,
        tradeNumber: idx + 1,
        dailyPnl: trade.pnl
      };
    });
  };

  const getMonthlyPerformance = () => {
    const monthlyMap = {};
    
    filteredTrades.forEach(trade => {
      const date = new Date(trade.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          month: monthKey,
          pnl: 0,
          trades: 0,
          wins: 0,
          losses: 0
        };
      }
      
      monthlyMap[monthKey].pnl += trade.pnl;
      monthlyMap[monthKey].trades++;
      if (trade.pnl > 0) monthlyMap[monthKey].wins++;
      else monthlyMap[monthKey].losses++;
    });
    
    return Object.values(monthlyMap)
      .map(m => ({
        ...m,
        winRate: m.trades > 0 ? (m.wins / m.trades) * 100 : 0,
        avgPnl: m.trades > 0 ? m.pnl / m.trades : 0
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  };

  const applyAllFilters = (tradeList = trades) => {
    let filtered = [...tradeList];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.symbol.toLowerCase().includes(query) ||
        (t.tradeNotes && t.tradeNotes.toLowerCase().includes(query)) ||
        (t.notes && t.notes.toLowerCase().includes(query)) ||
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }
    
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
  }, [filter, dateRange, customDateStart, customDateEnd, selectedTags, searchQuery]);

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
  const quickStats = getQuickStats();
  const insights = getPerformanceInsights();
  const pnlDistribution = getPnLDistribution();
  const timeOfDayPerf = getTimeOfDayPerformance();
  const riskMetrics = getRiskManagementMetrics();
  const winRateOverTime = getWinRateOverTime();
  const profitFactorByStrategy = getProfitFactorByStrategy();
  const returnDistribution = getReturnDistribution();
  const cumulativePnLEnhanced = getCumulativePnLEnhanced();
  const monthlyPerformance = getMonthlyPerformance();

  // Replay mode
  const sortedForReplay = useMemo(() => {
    return [...trades].sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [trades]);

  const replayTrade = sortedForReplay[replayIndex];

  const nextReplayTrade = () => {
    if (replayIndex < sortedForReplay.length - 1) {
      setReplayIndex(replayIndex + 1);
    }
  };

  const prevReplayTrade = () => {
    if (replayIndex > 0) {
      setReplayIndex(replayIndex - 1);
    }
  };

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
                  ? 'bg-gray-900 border-cyan-500/50' 
                  : 'bg-gray-900 border-yellow-500/50'
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
        {showImageModal && (
          <ImageModal 
            trade={showImageModal} 
            onClose={() => setShowImageModal(null)}
            onUpdate={(updatedTrade) => {
              setTrades(prev => prev.map(t => t.id === updatedTrade.id ? updatedTrade : t));
              setShowImageModal(null);
            }}
          />
        )}

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

            {/* Pattern Recognition Insights */}
            {insights.length > 0 && (
              <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-800">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-lg font-semibold">Pattern Recognition - Trading Insights</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {insights.map((insight, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        insight.type === 'success'
                          ? 'bg-cyan-500/5 border-cyan-500/30'
                          : insight.type === 'warning'
                          ? 'bg-red-500/5 border-red-500/30'
                          : 'bg-blue-500/5 border-blue-500/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          insight.type === 'success'
                            ? 'bg-cyan-500/20'
                            : insight.type === 'warning'
                            ? 'bg-red-500/20'
                            : 'bg-blue-500/20'
                        }`}>
                          {insight.type === 'success' ? (
                            <TrendingUp className="w-4 h-4 text-cyan-400" />
                          ) : insight.type === 'warning' ? (
                            <AlertCircle className="w-4 h-4 text-red-400" />
                          ) : (
                            <Lightbulb className="w-4 h-4 text-blue-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className={`font-semibold mb-1 ${
                            insight.type === 'success'
                              ? 'text-cyan-400'
                              : insight.type === 'warning'
                              ? 'text-red-400'
                              : 'text-blue-400'
                          }`}>
                            {insight.title}
                          </h4>
                          <p className="text-sm text-gray-400">{insight.detail}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Calendar Heatmap */}
            <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-800">
              <h3 className="text-lg font-semibold mb-4">90-Day Performance Calendar</h3>
              <CalendarHeatmap data={calendarData} />
            </div>

            {/* Risk Management Metrics */}
            <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-800">
              <div className="flex items-center gap-2 mb-6">
                <Target className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold">Risk Management Analysis</h3>
              </div>

              {/* Key Risk Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <div className="text-xs text-gray-400 mb-1">Avg R-Multiple</div>
                  <div className={`text-2xl font-bold ${riskMetrics.avgRMultiple >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                    {riskMetrics.avgRMultiple.toFixed(2)}R
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {riskMetrics.positiveRMultiples}/{riskMetrics.positiveRMultiples + riskMetrics.negativeRMultiples} positive
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <div className="text-xs text-gray-400 mb-1">Risk/Reward Ratio</div>
                  <div className={`text-2xl font-bold ${riskMetrics.avgRiskRewardRatio >= 1.5 ? 'text-cyan-400' : 'text-yellow-400'}`}>
                    {riskMetrics.avgRiskRewardRatio.toFixed(2)}:1
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Avg win: ${riskMetrics.avgRewardPerTrade.toFixed(0)}
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <div className="text-xs text-gray-400 mb-1">Max Drawdown</div>
                  <div className="text-2xl font-bold text-red-400">
                    ${riskMetrics.maxDrawdown.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {riskMetrics.maxDrawdownPercent.toFixed(1)}% of peak
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <div className="text-xs text-gray-400 mb-1">Sharpe Ratio</div>
                  <div className={`text-2xl font-bold ${
                    riskMetrics.sharpeRatio >= 1 ? 'text-cyan-400' : 
                    riskMetrics.sharpeRatio >= 0 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {riskMetrics.sharpeRatio.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Risk-adjusted return
                  </div>
                </div>
              </div>

              {/* Current Drawdown Alert */}
              {riskMetrics.currentDrawdown > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-3">
                    <TrendingDown className="w-5 h-5 text-red-400" />
                    <div>
                      <h4 className="font-semibold text-red-400">Currently in Drawdown</h4>
                      <p className="text-sm text-red-300 mt-1">
                        Down ${riskMetrics.currentDrawdown.toFixed(2)} ({riskMetrics.currentDrawdownPercent.toFixed(1)}%) from peak
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Position Sizing Analysis */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-400 mb-3">Position Sizing</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                      <span className="text-sm text-gray-400">Average Position</span>
                      <span className="font-semibold text-cyan-400">${riskMetrics.avgPositionSize.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                      <span className="text-sm text-gray-400">Largest Position</span>
                      <span className="font-semibold text-yellow-400">${riskMetrics.largestPosition.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                      <span className="text-sm text-gray-400">Smallest Position</span>
                      <span className="font-semibold text-gray-300">${riskMetrics.smallestPosition.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                      <span className="text-sm text-gray-400">Kelly Criterion</span>
                      <span className={`font-semibold ${
                        riskMetrics.kellyPercentage > 10 ? 'text-yellow-400' : 'text-cyan-400'
                      }`}>
                        {riskMetrics.kellyPercentage.toFixed(1)}%
                      </span>
                    </div>
                    {riskMetrics.kellyPercentage > 10 && (
                      <div className="text-xs text-yellow-400 bg-yellow-500/10 p-2 rounded">
                        ⚠️ Kelly suggests aggressive sizing - use with caution
                      </div>
                    )}
                  </div>
                </div>

                {/* Top Drawdown Periods */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-400 mb-3">Top Drawdown Periods</h4>
                  <div className="space-y-2">
                    {riskMetrics.drawdownPeriods.slice(0, 5).map((dd, idx) => (
                      <div 
                        key={idx}
                        className={`p-3 rounded-lg ${
                          dd.current ? 'bg-red-500/10 border border-red-500/30' : 'bg-gray-800/30'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-400">
                            {dd.start} → {dd.end}
                            {dd.current && <span className="text-red-400 ml-2">(Current)</span>}
                          </span>
                          <span className={`text-sm font-semibold ${dd.current ? 'text-red-400' : 'text-gray-300'}`}>
                            -${dd.depth.toFixed(2)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 h-1 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${dd.current ? 'bg-red-500' : 'bg-red-400'}`}
                            style={{ width: `${Math.min(dd.depthPercent, 100)}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {dd.depthPercent.toFixed(1)}% drawdown from peak
                        </div>
                      </div>
                    ))}
                    {riskMetrics.drawdownPeriods.length === 0 && (
                      <div className="text-sm text-gray-500 text-center py-4">
                        No drawdown periods recorded yet
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* R-Multiple Distribution */}
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-gray-400 mb-3">R-Multiple Distribution</h4>
                <div className="flex items-end gap-1 h-32">
                  {[-3, -2, -1, 0, 1, 2, 3, 4, 5].map(r => {
                    const count = riskMetrics.rMultiples.filter(rm => {
                      const rounded = Math.floor(rm.rMultiple);
                      return rounded === r;
                    }).length;
                    const maxCount = Math.max(...[-3, -2, -1, 0, 1, 2, 3, 4, 5].map(rVal => 
                      riskMetrics.rMultiples.filter(rm => Math.floor(rm.rMultiple) === rVal).length
                    ));
                    const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                    
                    return (
                      <div key={r} className="flex-1 flex flex-col items-center">
                        <div className="w-full flex items-end justify-center" style={{ height: '100px' }}>
                          <div 
                            className={`w-full rounded-t ${r >= 0 ? 'bg-cyan-500' : 'bg-red-500'}`}
                            style={{ height: `${height}%` }}
                            title={`${count} trades at ${r}R`}
                          />
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{r}R</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Advanced Charts */}
            <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-800">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-semibold">Advanced Performance Charts</h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Win Rate Over Time */}
                {winRateOverTime.length > 0 && (
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-400 mb-4">Win Rate Over Time (Rolling)</h4>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={winRateOverTime}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                        <XAxis 
                          dataKey="date" 
                          stroke="#6b7280" 
                          fontSize={11}
                          tickFormatter={(value) => value.slice(5)}
                        />
                        <YAxis 
                          stroke="#6b7280" 
                          fontSize={11}
                          domain={[0, 100]}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px' }}
                          labelStyle={{ color: '#9ca3af' }}
                          formatter={(value) => [`${value.toFixed(1)}%`, 'Win Rate']}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="winRate" 
                          stroke="#8b5cf6" 
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line 
                          type="monotone" 
                          dataKey={() => 50} 
                          stroke="#6b7280" 
                          strokeDasharray="5 5" 
                          strokeWidth={1}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Shows your win rate trend over time
                    </p>
                  </div>
                )}

                {/* Cumulative P&L with Trade Numbers */}
                {cumulativePnLEnhanced.length > 0 && (
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-400 mb-4">Enhanced Equity Curve</h4>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={cumulativePnLEnhanced}>
                        <defs>
                          <linearGradient id="colorPnlEnhanced" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                        <XAxis 
                          dataKey="tradeNumber" 
                          stroke="#6b7280" 
                          fontSize={11}
                          label={{ value: 'Trade #', position: 'insideBottom', offset: -5, fill: '#6b7280', fontSize: 11 }}
                        />
                        <YAxis 
                          stroke="#6b7280" 
                          fontSize={11}
                          tickFormatter={(value) => `$${value}`}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px' }}
                          labelStyle={{ color: '#9ca3af' }}
                          formatter={(value, name) => {
                            if (name === 'pnl') return [`$${value.toFixed(2)}`, 'Total P&L'];
                            if (name === 'winRate') return [`${value.toFixed(1)}%`, 'Win Rate'];
                            return value;
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="pnl" 
                          stroke="#06b6d4" 
                          fillOpacity={1} 
                          fill="url(#colorPnlEnhanced)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      P&L progression by trade number
                    </p>
                  </div>
                )}

                {/* Profit Factor by Strategy */}
                {profitFactorByStrategy.length > 0 && (
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-400 mb-4">Profit Factor by Strategy</h4>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={profitFactorByStrategy} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                        <XAxis 
                          type="number" 
                          stroke="#6b7280" 
                          fontSize={11}
                        />
                        <YAxis 
                          type="category" 
                          dataKey="strategy" 
                          stroke="#6b7280" 
                          fontSize={11}
                          width={80}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px' }}
                          labelStyle={{ color: '#9ca3af' }}
                          formatter={(value, name, props) => {
                            if (name === 'profitFactor') {
                              return [
                                `${value.toFixed(2)} (${props.payload.wins}W/${props.payload.losses}L)`,
                                'Profit Factor'
                              ];
                            }
                            return value;
                          }}
                        />
                        <Bar 
                          dataKey="profitFactor" 
                          radius={[0, 4, 4, 0]}
                        >
                          {profitFactorByStrategy.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.profitFactor >= 2 ? '#10b981' : entry.profitFactor >= 1 ? '#06b6d4' : '#ef4444'} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Gross wins ÷ Gross losses (≥2.0 is excellent)
                    </p>
                  </div>
                )}

                {/* Return Distribution */}
                {returnDistribution.length > 0 && (
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-400 mb-4">Distribution of Returns</h4>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={returnDistribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                        <XAxis 
                          dataKey="range" 
                          stroke="#6b7280" 
                          fontSize={9}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis 
                          stroke="#6b7280" 
                          fontSize={11}
                          label={{ value: 'Count', angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 11 }}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px' }}
                          labelStyle={{ color: '#9ca3af' }}
                          formatter={(value, name, props) => [
                            `${value} trades (${props.payload.percentage.toFixed(1)}%)`,
                            'Frequency'
                          ]}
                        />
                        <Bar 
                          dataKey="count" 
                          radius={[4, 4, 0, 0]}
                        >
                          {returnDistribution.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={parseFloat(entry.range.replace('$', '')) >= 0 ? '#06b6d4' : '#ef4444'} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Histogram showing frequency of profit/loss amounts
                    </p>
                  </div>
                )}

                {/* Monthly Performance */}
                {monthlyPerformance.length > 0 && (
                  <div className="bg-gray-800/30 rounded-lg p-4 lg:col-span-2">
                    <h4 className="text-sm font-semibold text-gray-400 mb-4">Monthly Performance Overview</h4>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={monthlyPerformance}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                        <XAxis 
                          dataKey="month" 
                          stroke="#6b7280" 
                          fontSize={11}
                          tickFormatter={(value) => value.slice(0, 7)}
                        />
                        <YAxis 
                          yAxisId="left"
                          stroke="#6b7280" 
                          fontSize={11}
                          tickFormatter={(value) => `$${value}`}
                        />
                        <YAxis 
                          yAxisId="right"
                          orientation="right"
                          stroke="#6b7280" 
                          fontSize={11}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px' }}
                          labelStyle={{ color: '#9ca3af' }}
                          formatter={(value, name) => {
                            if (name === 'pnl') return [`$${value.toFixed(2)}`, 'P&L'];
                            if (name === 'winRate') return [`${value.toFixed(1)}%`, 'Win Rate'];
                            return value;
                          }}
                        />
                        <Bar 
                          yAxisId="left"
                          dataKey="pnl" 
                          radius={[4, 4, 0, 0]}
                        >
                          {monthlyPerformance.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} />
                          ))}
                        </Bar>
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="winRate" 
                          stroke="#fbbf24" 
                          strokeWidth={2}
                          dot={{ fill: '#fbbf24', r: 3 }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Monthly P&L (bars) and Win Rate (line) over time
                    </p>
                  </div>
                )}
              </div>
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
                          <div className="flex gap-2 items-center">
                            <button
                              onClick={() => setShowImageModal(trade)}
                              className={`transition ${
                                trade.screenshots?.length > 0
                                  ? 'text-cyan-400 hover:text-cyan-300'
                                  : 'text-gray-500 hover:text-gray-400'
                              }`}
                              title={trade.screenshots?.length > 0 ? `${trade.screenshots.length} screenshot(s)` : 'Add screenshots'}
                            >
                              <ImageIcon className="w-4 h-4" />
                              {trade.screenshots?.length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-cyan-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                                  {trade.screenshots.length}
                                </span>
                              )}
                            </button>
                            <button
                              onClick={() => setEditingTrade(trade)}
                              className="text-gray-400 hover:text-cyan-400 transition"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
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

// Image Modal Component with upload functionality
const ImageModal = ({ trade, onClose, onUpdate }) => {
  const [images, setImages] = useState(trade.screenshots || []);
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    setUploading(true);
    
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const newImage = {
            id: `img_${Date.now()}_${Math.random()}`,
            data: e.target.result,
            name: file.name,
            timestamp: new Date().toISOString(),
            caption: ''
          };
          setImages(prev => [...prev, newImage]);
        };
        reader.readAsDataURL(file);
      }
    });
    
    setUploading(false);
    event.target.value = '';
  };

  const handleSave = () => {
    onUpdate({ ...trade, screenshots: images });
    onClose();
  };

  const handleDelete = (imageId) => {
    setImages(prev => prev.filter(img => img.id !== imageId));
    if (selectedImage?.id === imageId) {
      setSelectedImage(null);
    }
  };

  const handleCaptionChange = (imageId, caption) => {
    setImages(prev => prev.map(img => 
      img.id === imageId ? { ...img, caption } : img
    ));
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Trade Screenshots - {trade.symbol}</h3>
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload Images
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex-1 overflow-y-auto">
          {images.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ImageIcon className="w-16 h-16 mx-auto mb-4" />
              <p>No screenshots attached yet</p>
              <p className="text-sm mt-2">Upload chart images to document your trade setup and execution</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition"
              >
                Upload First Screenshot
              </button>
            </div>
          ) : selectedImage ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedImage(null)}
                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to Grid
                </button>
                <button
                  onClick={() => handleDelete(selectedImage.id)}
                  className="text-red-400 hover:text-red-300 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4">
                <img 
                  src={selectedImage.data} 
                  alt={selectedImage.name}
                  className="w-full h-auto rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Image Caption</label>
                <textarea
                  value={selectedImage.caption}
                  onChange={(e) => handleCaptionChange(selectedImage.id, e.target.value)}
                  placeholder="Add notes about this screenshot (e.g., 'Entry setup - breakout above resistance')"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white resize-none"
                  rows={3}
                />
              </div>

              <div className="text-sm text-gray-500">
                <p>Uploaded: {new Date(selectedImage.timestamp).toLocaleString()}</p>
                <p>File: {selectedImage.name}</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map(image => (
                <div 
                  key={image.id}
                  className="group relative bg-gray-800 rounded-lg overflow-hidden cursor-pointer border border-gray-700 hover:border-cyan-500 transition"
                  onClick={() => setSelectedImage(image)}
                >
                  <img 
                    src={image.data} 
                    alt={image.name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition">
                      <ImageIcon className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  {image.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <p className="text-xs text-white line-clamp-2">{image.caption}</p>
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(image.id);
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition"
          >
            Save Changes
          </button>
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

  // Organize days by week
  const weeks = [];
  for (let i = 0; i < 13; i++) {
    const weekDays = data.filter(d => d.week === i);
    if (weekDays.length > 0) {
      weeks.push(weekDays);
    }
  }

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1">
        {/* Day of week labels */}
        <div className="flex flex-col gap-1 mr-2">
          <div className="h-3"></div> {/* Spacer for alignment */}
          {dayLabels.map((label, idx) => (
            <div key={idx} className="h-3 flex items-center text-xs text-gray-500 w-8">
              {label}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {weeks.map((week, weekIdx) => {
          // Create array of 7 days, filling empty slots
          const weekGrid = Array(7).fill(null);
          week.forEach(day => {
            weekGrid[day.day] = day;
          });

          return (
            <div key={weekIdx} className="flex flex-col gap-1">
              {/* Week label */}
              <div className="h-3 text-xs text-gray-600 text-center">
                {weekIdx === 0 || weekIdx === 6 || weekIdx === 12 ? 
                  new Date(week[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) 
                  : ''}
              </div>
              {/* Days */}
              {weekGrid.map((day, dayIdx) => (
                <div
                  key={dayIdx}
                  className="w-3 h-3 rounded-sm transition-transform hover:scale-150 cursor-pointer"
                  style={{ 
                    backgroundColor: day ? getColor(day.pnl) : '#0a0a0a',
                    opacity: day ? 1 : 0.3
                  }}
                  title={day ? `${day.date}: $${day.pnl.toFixed(2)}` : ''}
                />
              ))}
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="flex items-center gap-4 mt-6 text-xs text-gray-500">
        <span>Less</span>
        <div className="flex gap-1">
          {['#1f2937', '#fecaca', '#fca5a5', '#f87171', '#ef4444'].map(color => (
            <div key={color} className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
          ))}
        </div>
        <span>Loss</span>
        <div className="flex gap-1 ml-4">
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