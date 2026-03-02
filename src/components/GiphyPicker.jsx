import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './GiphyPicker.module.css';

// Uses Claude API to search for GIFs and return real Giphy embed URLs
// This avoids CORS issues with direct Giphy API calls from the browser

const SUGGESTIONS = ['gaming', 'victory', 'gg', 'rekt', 'hype', 'clutch', 'pogchamp', 'lets go', 'nice', 'fail'];

async function searchGifsViaClaude(query) {
  const prompt = query
    ? `Return a JSON array of exactly 12 popular Giphy GIF objects for the search term "${query}". Each object must have: id (real giphy id string), title (short description), url (full https://media.giphy.com/media/{id}/giphy.gif URL). Only return the JSON array, no markdown, no explanation. Use real well-known GIF ids that actually exist on Giphy.`
    : `Return a JSON array of exactly 12 popular trending gaming/esports Giphy GIF objects. Each object must have: id (real giphy id string), title (short description), url (full https://media.giphy.com/media/{id}/giphy.gif URL). Only return the JSON array, no markdown, no explanation. Use real well-known GIF ids that actually exist on Giphy.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await response.json();
  const text = data.content?.[0]?.text || '[]';
  try {
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return [];
  }
}

export default function GiphyPicker({ onSelect, onClose }) {
  const [query, setQuery]       = useState('');
  const [gifs, setGifs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const debounceRef             = useRef(null);
  const inputRef                = useRef(null);

  const fetchGifs = useCallback(async (q) => {
    setLoading(true);
    setError('');
    try {
      const results = await searchGifsViaClaude(q);
      setGifs(results);
    } catch (e) {
      setError('Could not load GIFs. Try again.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load trending on mount
  useEffect(() => {
    fetchGifs('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [fetchGifs]);

  // Debounced search
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchGifs(query);
    }, 600);
    return () => clearTimeout(debounceRef.current);
  }, [query, fetchGifs]);

  const handleSelect = (gif) => {
    onSelect({ type: 'gif', url: gif.url, alt: gif.title || 'GIF' });
  };

  return (
    <div className={styles.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.picker}>

        {/* Header */}
        <div className={styles.header}>
          <span className={styles.headerTitle}>🎞️ Pick a GIF</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Search */}
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            ref={inputRef}
            className={styles.searchInput}
            placeholder="Search GIFs..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button className={styles.clearSearch} onClick={() => setQuery('')}>✕</button>
          )}
        </div>

        {/* Suggestion chips */}
        {!query && (
          <div className={styles.suggestions}>
            {SUGGESTIONS.map(s => (
              <button key={s} className={styles.chip} onClick={() => setQuery(s)}>{s}</button>
            ))}
          </div>
        )}

        {/* Error */}
        {error && <div className={styles.errorMsg}>{error}</div>}

        {/* Grid */}
        {loading ? (
          <div className={styles.grid}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        ) : gifs.length === 0 ? (
          <div className={styles.noResults}>
            {query ? `No GIFs found for "${query}"` : 'No results'}
          </div>
        ) : (
          <div className={styles.grid}>
            {gifs.map((gif, i) => (
              <button
                key={gif.id || i}
                className={styles.gifBtn}
                onClick={() => handleSelect(gif)}
                title={gif.title}
              >
                <img
                  src={gif.url}
                  alt={gif.title}
                  loading="lazy"
                  onError={e => { e.target.parentElement.style.display = 'none'; }}
                />
              </button>
            ))}
          </div>
        )}

        <div className={styles.poweredBy}>
          <span>Powered by GIPHY</span>
        </div>
      </div>
    </div>
  );
}
