import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import './Deck.css';

function DeckListView({
  decks,
  allDecks,
  searchQuery,
  setSearchQuery,
  sortState,
  sortReversed,
  sortMenuOpen,
  setSortMenuOpen,
  onSortSelect,
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
        {hasAnyDecks && (
          <div id="sort-menu">
            <div id="sort-icon" onClick={() => setSortMenuOpen(!sortMenuOpen)}>
              <p className="sort-p">↓↑</p>
            </div>

            <AnimatePresence mode="wait">
              {sortMenuOpen ? (
                <motion.div
                  id="sort-menu-text-div"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  <p className="sort-menu-p-state" onClick={() => onSortSelect('recent')}>recent</p>
                  <p className="sort-menu-p-state" onClick={() => onSortSelect('level')}>level</p>
                  <p className="sort-menu-p-state" onClick={() => onSortSelect('duration')}>duration</p>
                </motion.div>
              ) : (
                <motion.p
                  className="sort-p-state"
                  onClick={() => onSortSelect(sortState)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  {sortState} {sortReversed ? '↑' : '↓'}
                </motion.p>
              )}
            </AnimatePresence>
            <div id="create-deck-button" onClick={() => onCreateDeck(searchQuery)}>
              +
            </div>

          </div>
        )}

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
    </motion.div>
  );
}

export default DeckListView;
