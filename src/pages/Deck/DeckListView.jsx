import { motion } from 'framer-motion';
import { useState } from 'react';
import './Deck.css';

let hasAnimatedDecks = false;

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
      initial={hasAnimatedDecks ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onAnimationComplete={() => { hasAnimatedDecks = true; }}
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

      {hasAnyDecks && <div id="deck-list-divider" />}
      {hasAnyDecks && (
        <div id="deck-table-container">
          {decks.length > 0 && (
            <table id="deck-table">
              <tbody>
                {decks.map((deck, index) => (
                  <motion.tr
                    key={deck.deckId}
                    className={`deck-tr ${deck.isVirtual ? 'deck-tr-virtual' : ''}`}
                    initial={!hasAnimatedDecks && index < 10 ? { opacity: 0 } : false}
                    animate={{ opacity: 1 }}
                    transition={!hasAnimatedDecks && index < 10 ? {
                      duration: 0.4,
                      ease: 'easeOut',
                      delay: index * 0.05,
                    } : { duration: 0 }}
                  >
                    <td className="deck-td" onClick={() => onSelectDeck(deck)}>
                      <div className={`deck-title ${deck.isVirtual ? 'deck-title-virtual' : ''}`}>{deck.title}</div>
                    </td>
                    <td className={`deck-td-lv ${deck.isVirtual ? 'deck-td-lv-virtual' : ''}`}>
                      {deck.level != null ? `Lv ${deck.level}` : '???'}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {decks.length === 0 && (
        <div
          id={allDecks.length === 0 ? "create-a-new-deck" : "just-make-it"}
          onClick={() => onCreateDeck(searchQuery)}
          style={{
            cursor: 'pointer',
            ...(allDecks.length === 0 && {
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            })
          }}
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
