import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { addDeck, updateDeck, getNextDeckId } from '../../utils/supabaseDb';
import './Deck.css';

function DeckCreateView({ onBack, onDeckCreated, initialTitle = "", editDeck = null }) {
  const [title, setTitle] = useState(editDeck ? editDeck.title : initialTitle);
  const [description, setDescription] = useState(editDeck ? (editDeck.description || "") : "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState({ field: '', msg: '' });
  const isEditMode = editDeck != null;

  // Swipe gesture detection
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const touchEndY = useRef(0);
  const isSwiping = useRef(false);

  // Swipe gesture handlers
  useEffect(() => {
    const handleTouchStart = (e) => {
      // Ignore touches on interactive elements (inputs, buttons, etc.)
      const target = e.target;
      if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' ||
          target.closest('button') || target.closest('input')) {
        isSwiping.current = false;
        return;
      }

      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      isSwiping.current = true;
    };

    const handleTouchMove = (e) => {
      if (!isSwiping.current) return;

      touchEndX.current = e.touches[0].clientX;
      touchEndY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = () => {
      if (!isSwiping.current) return;

      const deltaX = touchStartX.current - touchEndX.current;
      const deltaY = touchStartY.current - touchEndY.current;
      const minSwipeDistance = 50;

      // Check if horizontal swipe is dominant
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
        // Swipe right - navigate back
        if (deltaX < 0) {
          onBack();
        }
      }

      isSwiping.current = false;
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onBack]);

  useEffect(() => {
    if (error.field) {
      const timer = setTimeout(() => setError({ field: '', msg: '' }), 1200);
      return () => clearTimeout(timer);
    }
  }, [error]);

  async function handleSubmit(e) {
    e.preventDefault();

    // Prevent double submission
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (title.trim().length < 1) {
      setError({ field: 'title', msg: 'enter a deck name' });
      setIsSubmitting(false);
      return;
    }
    if (description.trim().length < 1) {
      setError({ field: 'description', msg: 'enter a description' });
      setIsSubmitting(false);
      return;
    }

    try {
      if (isEditMode) {
        // Update existing deck
        const updatedDeck = await updateDeck(editDeck.deckId, {
          title,
          description
        });
        onDeckCreated(updatedDeck);
      } else {
        // Create new deck
        const deckId = await getNextDeckId();
        const creationDate = new Date().toISOString();

        let level = null;

        const newDeck = {
          deckId: deckId,
          title,
          level,
          totalDuration: 0,
          description,
          creationDate
        };

        await addDeck(newDeck);

        // Call the callback with the new deck
        onDeckCreated(newDeck);
      }
    } catch (error) {
      console.error("Error:", error);
      alert(isEditMode ? "Error updating deck" : "Error adding deck");
      setIsSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <form id="deck-form" onSubmit={handleSubmit}>
        <div className="deck-form-content">
          <p id="deck-create-back-icon" onClick={onBack}>{'<'}</p>
          <div id="deck-form-fields">
            <div id="title-input-div">
              <label htmlFor="title-input" className="form-label">deck name</label>
              <input
                type="text"
                className="deck-input"
                id="title-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={45}
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />
              <AnimatePresence>
                {error.field === 'title' && (
                  <motion.div
                    className="error-bubble"
                    initial={{ opacity: 0, y: -3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -3 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="error-bubble-arrow" />
                    {error.msg}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div id="description-input-div">
              <label htmlFor="description-input" className="form-label">description</label>
              <textarea
                className="deck-description-textarea"
                id="description-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
                rows={4}
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                placeholder="describe the deck..."
              />
              <AnimatePresence>
                {error.field === 'description' && (
                  <motion.div
                    className="error-bubble"
                    initial={{ opacity: 0, y: -3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -3 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="error-bubble-arrow" />
                    {error.msg}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
        <button id="deck-create-save" type="submit" className="form__button" disabled={isSubmitting}>
          {isSubmitting ? (isEditMode ? 'Saving...' : 'Create...') : (isEditMode ? 'Save' : 'Create')}
        </button>
      </form>
    </motion.div>
  )
}

export default DeckCreateView;