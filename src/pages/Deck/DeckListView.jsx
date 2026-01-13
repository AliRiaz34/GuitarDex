import { motion } from 'framer-motion';
import { useState } from 'react';
import './Deck.css';

function DeckListView({
  decks,
  allDecks,
  searchQuery,
  setSearchQuery,
  onSelectDeck,
  onCreateDeck,
}) {
  const hasAnyDecks = allDecks.length > 0;
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  return (
    <motion.div
      id="deck-list-view"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {hasAnyDecks && (
        <>
          <div id="deck-searchbar-container">
            <input
              id="searchbar"
              className="input"
              type="text"
              max={45}
              placeholder="lookin for a deck?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />
            {!searchQuery && !isSearchFocused && (
              <div className="custom-placeholder">
               lookin for a deck<span className="blinking-question">?</span>
              </div>
            )}
          </div>
        </>
      )}

      <div id="deck-table-container">
        {decks.length > 0 && (
          <table id="deck-table">
            <tbody>
              {decks.map(deck => (
                <tr key={deck.deckId} className={`deck-tr ${deck.isVirtual ? 'deck-tr-virtual' : ''}`}>
                  <td className="deck-td" onClick={() => onSelectDeck(deck)}>
                    <div className={`deck-title ${deck.isVirtual ? 'deck-title-virtual' : ''}`}>{deck.title}</div>
                  </td>
                  <td className={`deck-td-lv ${deck.isVirtual ? 'deck-td-lv-virtual' : ''}`}>
                    {deck.level != null ? `Lv ${deck.level}` : '???'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {decks.length === 0 && (
        <div
          id={allDecks.length === 0 ? "create-a-new-deck" : "just-make-it"}
          onClick={() => onCreateDeck(searchQuery)}
          style={{ cursor: 'pointer' }}
        >
          {allDecks.length === 0 ? "make a deck dummy" : "just make it"}
        </div>
      )}

      {hasAnyDecks && decks.length > 0 && (
        <button id="deck-new-button" onClick={() => onCreateDeck(searchQuery)}>
          new deck
        </button>
      )}
    </motion.div>
  );
}

export default DeckListView;
