import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Simple logging utilities
const log = (...args) => console.log('[RulesTab]', ...args);
const warn = (...args) => console.warn('[RulesTab]', ...args);
const error = (...args) => console.error('[RulesTab]', ...args);

function RulesTab({ authedPlayer, sessionId }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [selectedRule, setSelectedRule] = useState(null);

  // Common rule categories for Deathwatch
  const ruleCategories = [
    { id: 'all', name: 'All Rules' },
    { id: 'combat', name: 'Combat' },
    { id: 'weapons', name: 'Weapons' },
    { id: 'armor', name: 'Armor' },
    { id: 'skills', name: 'Skills' },
    { id: 'talents', name: 'Talents' },
    { id: 'psychic', name: 'Psychic Powers' },
    { id: 'equipment', name: 'Equipment' },
    { id: 'vehicles', name: 'Vehicles' },
    { id: 'enemies', name: 'Enemies' },
    { id: 'gm', name: 'GM Rules' }
  ];

  // Popular/Quick access rules
  const quickRules = [
    'Attack Roll',
    'Damage',
    'Dodge',
    'Parry',
    'Full Auto',
    'Semi Auto',
    'Single Shot',
    'Power Armor',
    'Requisition',
    'Renown',
    'Squad Mode',
    'Cohesion',
    'Hordes'
  ];

  useEffect(() => {
    loadRecentSearches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRecentSearches = () => {
    const saved = localStorage.getItem('dw:rules:recent');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        warn('Failed to load recent searches:', e);
      }
    }
  };

  const saveRecentSearch = (query) => {
    const updated = [query, ...recentSearches.filter(q => q !== query)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('dw:rules:recent', JSON.stringify(updated));
  };

  const searchRules = async (query, category = selectedCategory) => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      log('Searching rules:', query, 'category:', category);
      
      const params = new URLSearchParams({
        q: query.trim(),
        category: category !== 'all' ? category : '',
        limit: '20'
      });

      const response = await axios.get(`/api/rules/search?${params}`, {
        headers: buildHeaders()
      });

      if (response.data && Array.isArray(response.data)) {
        setSearchResults(response.data);
        saveRecentSearch(query.trim());
      } else {
        setSearchResults([]);
        warn('No search results returned');
      }
    } catch (err) {
      error('Search failed:', err);
      setSearchResults([]);
      
      // Fallback - show some example results
      setSearchResults([
        {
          id: 'example_1',
          title: 'Rules Search Not Available',
          content: 'The rules database is not yet populated. This feature requires processing the PDF rulebooks.',
          category: 'system',
          page: null,
          source: 'System'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    searchRules(searchQuery);
  };

  const handleQuickSearch = (rule) => {
    setSearchQuery(rule);
    searchRules(rule);
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    if (searchQuery.trim()) {
      searchRules(searchQuery, category);
    }
  };

  const buildHeaders = () => {
    const headers = { 'x-session-id': sessionId || '' };
    if (authedPlayer === 'gm') {
      headers['x-gm-secret'] = 'bongo';
    }
    return headers;
  };

  const highlightText = (text, query) => {
    if (!query || !text) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 text-black">$1</mark>');
  };

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Deathwatch Rules</h1>
          <p className="text-slate-300">Search and reference rules from the Core Rulebook and GM's Kit</p>
        </div>

        {/* Search Section */}
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for rules, weapons, talents, skills..."
                  className="w-full px-4 py-2 rounded-lg border border-white/20 bg-white/10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="px-4 py-2 rounded-lg border border-white/20 bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ruleCategories.map(cat => (
                  <option key={cat.id} value={cat.id} className="bg-slate-800">
                    {cat.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={loading || !searchQuery.trim()}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>

          {/* Quick Rules */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Quick Reference</h3>
            <div className="flex flex-wrap gap-2">
              {quickRules.map(rule => (
                <button
                  key={rule}
                  onClick={() => handleQuickSearch(rule)}
                  className="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 rounded-md border border-white/20 transition-colors"
                >
                  {rule}
                </button>
              ))}
            </div>
          </div>

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="mt-4">
              <h4 className="text-md font-medium mb-2">Recent Searches</h4>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((query, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickSearch(query)}
                    className="px-2 py-1 text-xs bg-white/5 hover:bg-white/10 rounded border border-white/10 transition-colors"
                  >
                    {query}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h2 className="text-xl font-semibold mb-4">
              Search Results ({searchResults.length})
            </h2>
            
            <div className="space-y-4">
              {searchResults.map((rule, index) => (
                <div
                  key={rule.id || index}
                  className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                  onClick={() => setSelectedRule(rule)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-medium text-blue-300">{rule.title}</h3>
                    <div className="flex gap-2 text-xs">
                      {rule.category && (
                        <span className="px-2 py-1 bg-blue-600/30 rounded">{rule.category}</span>
                      )}
                      {rule.page && (
                        <span className="px-2 py-1 bg-green-600/30 rounded">p.{rule.page}</span>
                      )}
                      {rule.source && (
                        <span className="px-2 py-1 bg-purple-600/30 rounded">{rule.source}</span>
                      )}
                    </div>
                  </div>
                  
                  <div 
                    className="text-slate-300 text-sm"
                    dangerouslySetInnerHTML={{
                      __html: highlightText(rule.content?.substring(0, 200) + (rule.content?.length > 200 ? '...' : ''), searchQuery)
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rule Detail Modal */}
        {selectedRule && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-xl p-6 max-w-4xl max-h-[80vh] overflow-y-auto border border-white/20">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-blue-300">{selectedRule.title}</h2>
                <button
                  onClick={() => setSelectedRule(null)}
                  className="text-slate-400 hover:text-white text-xl"
                >
                  ×
                </button>
              </div>
              
              <div className="flex gap-2 mb-4 text-xs">
                {selectedRule.category && (
                  <span className="px-2 py-1 bg-blue-600/30 rounded">{selectedRule.category}</span>
                )}
                {selectedRule.page && (
                  <span className="px-2 py-1 bg-green-600/30 rounded">Page {selectedRule.page}</span>
                )}
                {selectedRule.source && (
                  <span className="px-2 py-1 bg-purple-600/30 rounded">{selectedRule.source}</span>
                )}
              </div>
              
              <div 
                className="text-slate-200 whitespace-pre-wrap"
                dangerouslySetInnerHTML={{
                  __html: highlightText(selectedRule.content || 'No content available.', searchQuery)
                }}
              />
              
              {selectedRule.examples && (
                <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
                  <h4 className="font-semibold mb-2 text-green-300">Examples:</h4>
                  <div className="text-slate-300">{selectedRule.examples}</div>
                </div>
              )}
              
              {selectedRule.relatedRules && selectedRule.relatedRules.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2 text-yellow-300">Related Rules:</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedRule.relatedRules.map((related, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuickSearch(related)}
                        className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded border border-white/20 transition-colors"
                      >
                        {related}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* No Results */}
        {searchQuery && !loading && searchResults.length === 0 && (
          <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
            <p className="text-slate-400">No rules found for "{searchQuery}"</p>
            <p className="text-xs text-slate-500 mt-2">Try different keywords or check a different category</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default RulesTab;
